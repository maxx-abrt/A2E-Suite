import { TemplateGallery } from '@/template-gallery/components/TemplateGallery';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { type TemplateDescriptor } from 'twenty-shared/application';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const meetingNotesItem: TemplateGalleryItem = {
  descriptor: {
    key: 'notes-reunion',
    version: 1,
    labels: { fr: 'Notes de réunion', en: 'Meeting notes' },
    category: 'Pages',
    preview: [
      {
        object: 'document',
        summary: {
          fr: 'Crée une page à partir du modèle.',
          en: 'Creates a page from the template.',
        },
        count: 1,
      },
    ],
    requiredApps: [],
    inputs: [],
  } satisfies TemplateDescriptor,
  sourceApplication: {
    universalIdentifier: 'a2e-documents-universal-identifier',
    name: 'A2E Documents',
  },
  available: true,
};

const clientOnboardingItem: TemplateGalleryItem = {
  descriptor: {
    key: 'client-onboarding',
    version: 1,
    labels: { fr: 'Onboarding client', en: 'Client onboarding' },
    category: 'Projets',
    preview: [],
    requiredApps: [],
    inputs: [],
  } satisfies TemplateDescriptor,
  sourceApplication: {
    universalIdentifier: 'a2e-projects-universal-identifier',
    name: 'A2E Projects',
  },
  available: true,
};

const unavailableItem: TemplateGalleryItem = {
  ...clientOnboardingItem,
  descriptor: { ...clientOnboardingItem.descriptor, key: 'accounting-kit' },
  available: false,
};

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('TemplateGallery', () => {
  it('lists the templates and their category tabs', () => {
    render(
      <TemplateGallery
        items={[meetingNotesItem, clientOnboardingItem]}
        onUseTemplate={jest.fn()}
        onBlank={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByRole('button', { name: /Meeting notes/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Client onboarding/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pages' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Projects' }),
    ).toBeInTheDocument();
  });

  it('filters the list with the search box', async () => {
    const user = userEvent.setup();

    render(
      <TemplateGallery
        items={[meetingNotesItem, clientOnboardingItem]}
        onUseTemplate={jest.fn()}
        onBlank={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Search templates' }),
      'client',
    );

    expect(
      screen.queryByRole('button', { name: /Meeting notes/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Client onboarding/ }),
    ).toBeInTheDocument();
  });

  it('renders the descriptor preview of the selected template', async () => {
    const user = userEvent.setup();

    render(
      <TemplateGallery
        items={[meetingNotesItem, clientOnboardingItem]}
        onUseTemplate={jest.fn()}
        onBlank={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: /Meeting notes/ }));

    expect(
      screen.getByText('Creates a page from the template.'),
    ).toBeInTheDocument();
  });

  it('applies the selected template through the host callback', async () => {
    const user = userEvent.setup();
    const onUseTemplate = jest.fn();

    render(
      <TemplateGallery
        items={[meetingNotesItem, clientOnboardingItem]}
        onUseTemplate={onUseTemplate}
        onBlank={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: 'Use template' }));

    expect(onUseTemplate).toHaveBeenCalledWith(meetingNotesItem);
  });

  it('keeps the blank creation flow through the host callback', async () => {
    const user = userEvent.setup();
    const onBlank = jest.fn();

    render(
      <TemplateGallery
        items={[meetingNotesItem, clientOnboardingItem]}
        onUseTemplate={jest.fn()}
        onBlank={onBlank}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: 'Blank' }));

    expect(onBlank).toHaveBeenCalledWith(meetingNotesItem);
  });

  it('renders a safe state and disables apply when a required app is missing', () => {
    render(
      <TemplateGallery
        items={[unavailableItem]}
        onUseTemplate={jest.fn()}
        onBlank={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByText('This template needs an app that is not installed.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use template' })).toBeDisabled();
  });

  it('shows an empty state when no template matches', async () => {
    const user = userEvent.setup();

    render(
      <TemplateGallery
        items={[meetingNotesItem]}
        onUseTemplate={jest.fn()}
        onBlank={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Search templates' }),
      'zzz',
    );

    expect(screen.getByText('No templates found')).toBeInTheDocument();
  });
});
