import { useA2eRecordIndexSurfaceKey } from '@/a2e-empty-state/hooks/useA2eRecordIndexSurfaceKey';
import { RecordIndexEmptyState } from '@/object-record/record-index/components/RecordIndexEmptyState';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useObjectLabel } from '@/object-metadata/hooks/useObjectLabel';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const mockCreateNewIndexRecord = jest.fn();

jest.mock('@/a2e-empty-state/hooks/useA2eRecordIndexSurfaceKey', () => ({
  useA2eRecordIndexSurfaceKey: jest.fn(),
}));

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: jest.fn(),
}));

jest.mock('@/object-record/record-table/hooks/useCreateNewIndexRecord', () => ({
  useCreateNewIndexRecord: () => ({
    createNewIndexRecord: mockCreateNewIndexRecord,
  }),
}));

jest.mock(
  '@/object-record/utils/canCreateRecordsForObjectMetadataItem',
  () => ({
    canCreateRecordsForObjectMetadataItem: jest.fn(),
  }),
);

jest.mock('@/object-metadata/hooks/useObjectLabel', () => ({
  useObjectLabel: jest.fn(),
}));

jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue',
  () => ({
    useAtomComponentSelectorValue: jest.fn(),
  }),
);

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: jest.fn(),
}));

jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({ openTemplateGallery: jest.fn() }),
}));

const mockedUseA2eRecordIndexSurfaceKey = jest.mocked(
  useA2eRecordIndexSurfaceKey,
);
const mockedUseFindManyRecords = jest.mocked(useFindManyRecords);
const mockedCanCreate = jest.mocked(canCreateRecordsForObjectMetadataItem);
const mockedUseObjectLabel = jest.mocked(useObjectLabel);
const mockedUseAtomComponentSelectorValue = jest.mocked(
  useAtomComponentSelectorValue,
);
const mockedUseAtomStateValue = jest.mocked(useAtomStateValue);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <JotaiProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </JotaiProvider>
  </I18nProvider>
);

const objectMetadataItem = {
  nameSingular: 'document',
  isRemote: false,
} as unknown as EnrichedObjectMetadataItem;

const objectPermissions = {
  canUpdateObjectRecords: true,
} as unknown as Parameters<
  typeof RecordIndexEmptyState
>[0]['objectPermissions'];

describe('RecordIndexEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseObjectLabel.mockReturnValue('Page');
    mockedCanCreate.mockReturnValue(true);
    mockedUseAtomComponentSelectorValue.mockReturnValue(false);
    mockedUseAtomStateValue.mockReturnValue(false);
    mockedUseFindManyRecords.mockReturnValue({
      totalCount: 0,
    } as unknown as ReturnType<typeof useFindManyRecords>);
  });

  it('renders the A2E contextual empty state for a mapped object', () => {
    mockedUseA2eRecordIndexSurfaceKey.mockReturnValue('documents');

    render(
      <RecordIndexEmptyState
        objectMetadataItem={objectMetadataItem}
        objectPermissions={objectPermissions}
        isSoftDeleteFilterActive={false}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByTestId('a2e-empty-state-primary-documents'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-template-documents'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-empty-state-learn-more-documents'),
    ).toBeInTheDocument();
  });

  it('keeps the host empty state for an unmapped object', () => {
    mockedUseA2eRecordIndexSurfaceKey.mockReturnValue(null);

    render(
      <RecordIndexEmptyState
        objectMetadataItem={objectMetadataItem}
        objectPermissions={objectPermissions}
        isSoftDeleteFilterActive={false}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.queryByTestId('a2e-empty-state-primary-documents'),
    ).not.toBeInTheDocument();
  });
});
