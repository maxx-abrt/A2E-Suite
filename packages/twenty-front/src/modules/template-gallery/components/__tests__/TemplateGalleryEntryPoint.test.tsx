import { TemplateGalleryEntryPoint } from '@/template-gallery/components/TemplateGalleryEntryPoint';
import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const mockOpenTemplateGallery = jest.fn();

jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({
    openTemplateGallery: mockOpenTemplateGallery,
  }),
}));

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
  </I18nProvider>
);

const setInstalledApplications = (universalIdentifiers: string[]) => {
  jotaiStore.set(metadataStoreState.atomFamily('applications'), {
    current: universalIdentifiers.map((universalIdentifier) => ({
      universalIdentifier,
    })),
    draft: [],
    status: 'up-to-date',
  });
};

describe('TemplateGalleryEntryPoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setInstalledApplications([]);
  });

  it('renders nothing when none of the required apps are installed', () => {
    setInstalledApplications(['a2e-accounting-universal-identifier']);

    render(
      <TemplateGalleryEntryPoint
        requiredApplicationUniversalIdentifiers={[
          'a2e-documents-universal-identifier',
        ]}
        category="Pages"
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.queryByTestId('template-gallery-entry-point'),
    ).not.toBeInTheDocument();
  });

  it('renders the install-gated entry-point when a required app is installed', () => {
    setInstalledApplications(['a2e-documents-universal-identifier']);

    render(
      <TemplateGalleryEntryPoint
        requiredApplicationUniversalIdentifiers={[
          'a2e-documents-universal-identifier',
        ]}
        category="Pages"
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByTestId('template-gallery-entry-point'),
    ).toBeInTheDocument();
  });

  it('opens the gallery with the entry-point category preselect', async () => {
    const user = userEvent.setup();

    setInstalledApplications(['a2e-projects-universal-identifier']);

    render(
      <TemplateGalleryEntryPoint
        requiredApplicationUniversalIdentifiers={[
          'a2e-projects-universal-identifier',
        ]}
        category="Projets"
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByTestId('template-gallery-entry-point'));

    expect(mockOpenTemplateGallery).toHaveBeenCalledWith({
      category: 'Projets',
    });
  });
});
