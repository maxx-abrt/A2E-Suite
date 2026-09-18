import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { DriveFilePreviewFallback } from '@/drive/components/DriveFilePreviewFallback';
import { type DriveFile } from '@/drive/types/DriveRecord';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const buildFile = (
  overrides: Partial<DriveFile> & Pick<DriveFile, 'id'>,
): DriveFile => ({
  name: 'archive.zip',
  folderId: null,
  starred: false,
  sourceApp: null,
  description: null,
  archivedAt: null,
  file: null,
  targetTaskId: null,
  targetNoteId: null,
  targetPersonId: null,
  targetCompanyId: null,
  targetOpportunityId: null,
  targetDashboardId: null,
  targetWorkflowId: null,
  ...overrides,
});

describe('DriveFilePreviewFallback', () => {
  it('renders an icon card for a file type with no preview', () => {
    render(<DriveFilePreviewFallback file={buildFile({ id: 'f1' })} />, {
      wrapper: Wrapper,
    });

    const fallback = screen.getByTestId('drive-file-preview-fallback-f1');

    expect(fallback).toBeInTheDocument();
    expect(fallback.querySelector('svg')).not.toBeNull();
  });

  it('names the file it stands in for', () => {
    render(
      <DriveFilePreviewFallback
        file={buildFile({ id: 'f1', name: 'contract.docx' })}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByTestId('drive-file-preview-fallback-f1'),
    ).toHaveAccessibleName(/contract\.docx/);
  });
});
