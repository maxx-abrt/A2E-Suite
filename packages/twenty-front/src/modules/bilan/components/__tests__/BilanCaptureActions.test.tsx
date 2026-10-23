import { BilanCaptureActions } from '@/bilan/components/BilanCaptureActions';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { type FileUploadOptions } from '@/file-upload/contexts/FileUploadContext';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';

const mockOpenPicker = jest.fn();
const mockUpload = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockOpenRecord = jest.fn();
const mockError = jest.fn();
let mockCanEdit = true;
jest.mock('@/file-upload/hooks/useFileUpload', () => ({
  useFileUpload: () => ({ openFileUpload: mockOpenPicker }),
}));
jest.mock(
  '@/object-record/record-field/ui/meta-types/hooks/useUploadFilesFieldFile',
  () => ({ useUploadFilesFieldFile: () => ({ uploadFile: mockUpload }) }),
);
jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreate }),
}));
jest.mock('@/object-record/hooks/useUpdateOneRecord', () => ({
  useUpdateOneRecord: () => ({ updateOneRecord: mockUpdate }),
}));
jest.mock('@/object-record/hooks/useObjectPermissionsForObject', () => ({
  useObjectPermissionsForObject: () => ({
    canUpdateObjectRecords: mockCanEdit,
  }),
}));
jest.mock('@/side-panel/hooks/useOpenRecordInSidePanel', () => ({
  useOpenRecordInSidePanel: () => ({ openRecordInSidePanel: mockOpenRecord }),
}));
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({
    enqueueErrorSnackBar: mockError,
    enqueueSuccessSnackBar: jest.fn(),
  }),
}));

const metadata = {
  id: 'finance-metadata',
  nameSingular: 'financeEntry',
  isUICreatable: true,
  isUIEditable: true,
  isRemote: false,
  writability: 'OPEN',
  updatableFields: [{ id: 'receipts-field-id', name: 'receipts' }],
} as EnrichedObjectMetadataItem;
const member = {
  id: 'member-a',
  name: { firstName: 'A', lastName: 'User' },
  locale: 'en',
  colorScheme: 'Light' as const,
  avatarUrl: null,
  userEmail: 'a@example.com',
  workspaceId: 'workspace-a',
};
const file = new File(['invoice'], 'supplier.pdf', { type: 'application/pdf' });
const renderActions = () => {
  const store = createStore();
  store.set(currentWorkspaceMemberState.atom, member);
  render(
    <Provider store={store}>
      <I18nProvider i18n={i18n}>
        <BilanCaptureActions objectMetadataItem={metadata} />
      </I18nProvider>
    </Provider>,
  );
  return store;
};
const selectInvoice = async () => {
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Upload invoice' }));
  const options = mockOpenPicker.mock.calls[0][0] as FileUploadOptions;
  await act(async () => {
    await options.onUpload([file]);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanEdit = true;
  i18n.load('en', {});
  i18n.activate('en');
  mockCreate.mockResolvedValue({ id: 'created-expense' });
  mockUpload.mockResolvedValue({ fileId: 'file-1', label: file.name });
  mockUpdate.mockResolvedValue({});
});

it('captures the invoice on one native expense and opens it for review without inventing payment details', async () => {
  renderActions();
  await selectInvoice();
  const input = mockCreate.mock.calls[0][0] as { id: string };
  expect(mockCreate).toHaveBeenCalledWith({
    id: input.id,
    label: file.name,
    entryType: 'EXPENSE',
    entryDate: null,
    amount: null,
  });
  expect(mockUpload).toHaveBeenCalledWith(file, 'receipts-field-id');
  expect(mockUpdate).toHaveBeenCalledWith({
    objectNameSingular: 'financeEntry',
    idToUpdate: input.id,
    updateOneRecordInput: {
      receipts: [{ fileId: 'file-1', label: file.name }],
    },
  });
  expect(mockOpenRecord).toHaveBeenCalledWith(
    expect.objectContaining({
      objectNameSingular: 'financeEntry',
      recordId: input.id,
      isNewRecord: true,
    }),
  );
});

it('offers recovery on the same expense when file upload fails', async () => {
  mockUpload.mockRejectedValue(new Error('offline'));
  renderActions();
  await selectInvoice();
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(mockOpenRecord).toHaveBeenCalledWith(
    expect.objectContaining({ recordId: mockCreate.mock.calls[0][0].id }),
  );
  expect(mockError).toHaveBeenCalledWith(
    expect.objectContaining({
      message: expect.stringContaining('Expense created'),
    }),
  );
});

it('does not offer invoice upload to read-only users', () => {
  mockCanEdit = false;
  renderActions();
  expect(
    screen.queryByRole('button', { name: 'Upload invoice' }),
  ).not.toBeInTheDocument();
});

it('does not attach a file or open a record in a different workspace after a switch', async () => {
  let resolveUpload: (value: {
    fileId: string;
    label: string;
  }) => void = () => {};
  mockUpload.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveUpload = resolve;
    }),
  );
  const store = renderActions();
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Upload invoice' }));
  const options = mockOpenPicker.mock.calls[0][0] as FileUploadOptions;
  let pendingUpload: void | Promise<void>;
  await act(async () => {
    pendingUpload = options.onUpload([file]);
  });
  act(() => {
    store.set(currentWorkspaceMemberState.atom, {
      ...member,
      id: 'member-b',
      workspaceId: 'workspace-b',
    });
  });
  await act(async () => {
    resolveUpload({ fileId: 'file-1', label: file.name });
    await pendingUpload;
  });
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(mockOpenRecord).not.toHaveBeenCalled();
});
