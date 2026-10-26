import { BilanTransactionReview } from '@/bilan/components/BilanTransactionReview';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { RecordTableWidgetRendererContent } from '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

jest.mock('@/object-record/hooks/useObjectPermissionsForObject');
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => ({ id: 'member' }),
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue');
jest.mock(
  '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent',
  () => ({
    RecordTableWidgetRendererContent: jest.fn(() => (
      <div>Native transaction table</div>
    )),
  }),
);
const objectMetadataItem = {
  id: 'finance-object',
  namePlural: 'customTransactions',
  readableFields: [
    'label',
    'amount',
    'entryDate',
    'entryType',
    'receipts',
    'category',
  ].map((name) => ({ id: name, name })),
} as EnrichedObjectMetadataItem;
const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <Provider>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  </I18nProvider>
);
beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.mocked(useObjectPermissionsForObject).mockReturnValue({
    canReadObjectRecords: true,
    canUpdateObjectRecords: true,
  } as ReturnType<typeof useObjectPermissionsForObject>);
  jest
    .mocked(useAtomFamilySelectorValue)
    .mockReturnValue([
      { id: 'finance-view', type: 'TABLE', key: 'INDEX', viewFields: [] },
    ]);
});
describe('Bilan transaction review', () => {
  it('lets users review and edit without creating empty transactions, and remembers their focus', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <BilanTransactionReview objectMetadataItem={objectMetadataItem} />,
      { wrapper: Wrapper },
    );
    expect(
      screen.getByRole('button', { name: 'Missing details' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('link', { name: 'Open transactions' }),
    ).toHaveAttribute('href', '/objects/customTransactions');
    await user.click(screen.getByRole('button', { name: 'Missing receipts' }));
    expect(RecordTableWidgetRendererContent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isCreationEnabled: false,
        isUIEditable: true,
        viewOverride: expect.objectContaining({
          viewFields: [
            expect.objectContaining({ fieldMetadataId: 'receipts' }),
          ],
        }),
      }),
      undefined,
    );
    unmount();
    render(<BilanTransactionReview objectMetadataItem={objectMetadataItem} />, {
      wrapper: Wrapper,
    });
    expect(
      screen.getByRole('button', { name: 'Missing receipts' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
  it('hides unsupported filters under field permissions and keeps read-only records read-only', () => {
    jest.mocked(useObjectPermissionsForObject).mockReturnValue({
      canReadObjectRecords: true,
      canUpdateObjectRecords: false,
    } as ReturnType<typeof useObjectPermissionsForObject>);
    render(
      <BilanTransactionReview
        objectMetadataItem={{ ...objectMetadataItem, readableFields: [] }}
      />,
      { wrapper: Wrapper },
    );
    expect(
      screen.queryByRole('button', { name: 'Missing receipts' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'All transactions' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(RecordTableWidgetRendererContent).toHaveBeenLastCalledWith(
      expect.objectContaining({ isUIEditable: false }),
      undefined,
    );
  });
  it('does not mount unreadable records', () => {
    jest
      .mocked(useObjectPermissionsForObject)
      .mockReturnValue({ canReadObjectRecords: false } as ReturnType<
        typeof useObjectPermissionsForObject
      >);
    render(<BilanTransactionReview objectMetadataItem={objectMetadataItem} />, {
      wrapper: Wrapper,
    });
    expect(RecordTableWidgetRendererContent).not.toHaveBeenCalled();
  });
  it('prefers a compact saved table instead of an index full of technical fields', () => {
    jest.mocked(useAtomFamilySelectorValue).mockReturnValue([
      {
        id: 'wide-index',
        type: 'TABLE',
        key: 'INDEX',
        viewFields: Array.from({ length: 20 }, (_, position) => ({
          fieldMetadataId: `field-${position}`,
          isVisible: true,
        })),
      },
      {
        id: 'compact',
        type: 'TABLE',
        viewFields: [
          { fieldMetadataId: 'label', isVisible: true },
          { fieldMetadataId: 'amount', isVisible: true },
        ],
      },
    ]);
    render(<BilanTransactionReview objectMetadataItem={objectMetadataItem} />, {
      wrapper: Wrapper,
    });
    expect(RecordTableWidgetRendererContent).toHaveBeenLastCalledWith(
      expect.objectContaining({ viewId: 'compact' }),
      undefined,
    );
  });
});
