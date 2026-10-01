import { CreateChooser } from '@/template-gallery/components/CreateChooser';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { type TemplateDescriptor } from 'twenty-shared/application';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const buildItem = ({
  key,
  en,
  fr,
  category = 'Pages',
}: {
  key: string;
  en: string;
  fr: string;
  category?: TemplateDescriptor['category'];
}): TemplateGalleryItem => ({
  descriptor: {
    key,
    version: 1,
    labels: { fr, en },
    category,
    preview: [],
    requiredApps: [],
    inputs: [],
  } satisfies TemplateDescriptor,
  sourceApplication: {
    universalIdentifier: `${key}-app`,
    name: `${key}-app`,
  },
  available: true,
});

const suggestions = [
  buildItem({ key: 'notes-reunion', en: 'Meeting notes', fr: 'Notes réunion' }),
  buildItem({ key: 'brief-projet', en: 'Project brief', fr: 'Brief projet' }),
  buildItem({ key: 'okr', en: 'OKRs', fr: 'OKR' }),
  buildItem({ key: 'journal', en: 'Journal', fr: 'Journal' }),
];

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('CreateChooser', () => {
  it('renders the three suggestions plus Blank and Browse all', () => {
    render(
      <CreateChooser
        suggestions={suggestions.slice(0, 3)}
        onBlank={jest.fn()}
        onSelectSuggestion={jest.fn()}
        onBrowseAll={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('create-chooser-blank')).toBeInTheDocument();
    expect(
      screen.getByTestId('create-chooser-suggestion-notes-reunion'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('create-chooser-suggestion-brief-projet'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('create-chooser-suggestion-okr'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('create-chooser-suggestion-journal'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('create-chooser-browse-all')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it('defaults the highlight to Blank so Enter triggers the blank create', async () => {
    const user = userEvent.setup();
    const onBlank = jest.fn();

    render(
      <CreateChooser
        suggestions={suggestions.slice(0, 3)}
        onBlank={onBlank}
        onSelectSuggestion={jest.fn()}
        onBrowseAll={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    screen.getByTestId('create-chooser').focus();
    await user.keyboard('{Enter}');

    expect(onBlank).toHaveBeenCalledTimes(1);
  });

  it('moves through the suggestions with the arrow keys', async () => {
    const user = userEvent.setup();
    const onSelectSuggestion = jest.fn();

    render(
      <CreateChooser
        suggestions={suggestions.slice(0, 3)}
        onBlank={jest.fn()}
        onSelectSuggestion={onSelectSuggestion}
        onBrowseAll={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    screen.getByTestId('create-chooser').focus();
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelectSuggestion).toHaveBeenCalledWith(suggestions[0]);
  });

  it('reaches the last suggestion with repeated arrow-down presses', async () => {
    const user = userEvent.setup();
    const onSelectSuggestion = jest.fn();

    render(
      <CreateChooser
        suggestions={suggestions.slice(0, 3)}
        onBlank={jest.fn()}
        onSelectSuggestion={onSelectSuggestion}
        onBrowseAll={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    screen.getByTestId('create-chooser').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelectSuggestion).toHaveBeenCalledWith(suggestions[2]);
  });

  it('selects a suggestion and Browse all with the pointer', async () => {
    const user = userEvent.setup();
    const onSelectSuggestion = jest.fn();
    const onBrowseAll = jest.fn();

    render(
      <CreateChooser
        suggestions={suggestions.slice(0, 3)}
        onBlank={jest.fn()}
        onSelectSuggestion={onSelectSuggestion}
        onBrowseAll={onBrowseAll}
      />,
      { wrapper: Wrapper },
    );

    await user.click(
      screen.getByTestId('create-chooser-suggestion-brief-projet'),
    );
    await user.click(screen.getByTestId('create-chooser-browse-all'));

    expect(onSelectSuggestion).toHaveBeenCalledWith(suggestions[1]);
    expect(onBrowseAll).toHaveBeenCalledTimes(1);
  });

  it('renders the suggestion labels from the descriptors', () => {
    render(
      <CreateChooser
        suggestions={suggestions.slice(0, 3)}
        onBlank={jest.fn()}
        onSelectSuggestion={jest.fn()}
        onBrowseAll={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Meeting notes')).toBeInTheDocument();
    expect(screen.getByText('Project brief')).toBeInTheDocument();
    expect(screen.getByText('OKRs')).toBeInTheDocument();
  });
});
