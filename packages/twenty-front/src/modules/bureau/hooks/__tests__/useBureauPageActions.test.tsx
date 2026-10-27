import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { useBureauPageActions } from '@/bureau/hooks/useBureauPageActions';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import { act, renderHook } from '@testing-library/react';

const deleteManyRecords = jest.fn();
const restoreManyRecords = jest.fn();
const updateOneRecord = jest.fn();
const enqueueSuccessSnackBar = jest.fn();
const enqueueErrorSnackBar = jest.fn();
const navigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: jest.fn() }),
}));
jest.mock('@/object-record/hooks/useDeleteManyRecords', () => ({
  useDeleteManyRecords: () => ({ deleteManyRecords }),
}));
jest.mock('@/object-record/hooks/useRestoreManyRecords', () => ({
  useRestoreManyRecords: () => ({ restoreManyRecords }),
}));
jest.mock('@/object-record/hooks/useDestroyOneRecord', () => ({
  useDestroyOneRecord: () => ({ destroyOneRecord: jest.fn() }),
}));
jest.mock('@/object-record/hooks/useUpdateOneRecord', () => ({
  useUpdateOneRecord: () => ({ updateOneRecord }),
}));
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({ enqueueSuccessSnackBar, enqueueErrorSnackBar }),
}));
const page = (
  id: string,
  parentId: string | null,
  position: number,
): BureauDocument => ({
  __typename: 'Document',
  id,
  parentId,
  position,
  title: id,
  icon: null,
  coverColor: null,
  coverImage: null,
  createdAt: null,
  updatedAt: null,
  deletedAt: null,
});
const tree = buildBureauTree([
  page('a', null, 0),
  page('child', 'a', 0),
  page('b', null, 1),
  page('destination', null, 2),
]);
const resyncDocuments = jest.fn();
const renderActions = (isTreeLoading = false) =>
  renderHook(
    () =>
      useBureauPageActions({
        tree,
        activeDocumentId: 'child',
        resyncDocuments,
        expandPageIds: jest.fn(),
        isTreeLoading,
      }),
    {
      wrapper: ({ children }) => (
        <I18nProvider i18n={i18n}>{children}</I18nProvider>
      ),
    },
  );
beforeEach(() => {
  jest.clearAllMocks();
  updateOneRecord.mockResolvedValue({});
  deleteManyRecords.mockImplementation(
    async ({ recordIdsToDelete }: { recordIdsToDelete: string[] }) =>
      recordIdsToDelete.map((id) => ({ id })),
  );
});
it('trashes a deduplicated subtree and restores all of it through Undo', async () => {
  const { result } = renderActions();
  await act(async () => {
    expect(await result.current.trashPages(['a', 'child', 'b'])).toBe(true);
  });
  const deletedIds = deleteManyRecords.mock.calls[0][0].recordIdsToDelete;
  expect([...deletedIds].sort()).toEqual(['a', 'b', 'child']);
  expect(new Set(deletedIds).size).toBe(3);
  expect(navigate).toHaveBeenCalledWith('/bureau');
  await act(async () => {
    await enqueueSuccessSnackBar.mock.calls[0][0].options.buttonOnClick();
  });
  expect([...restoreManyRecords.mock.calls[0][0].idsToRestore].sort()).toEqual(
    [...deletedIds].sort(),
  );
});
it('retains the failure result and does not announce success', async () => {
  deleteManyRecords.mockRejectedValueOnce(new Error('network'));
  const { result } = renderActions();
  await act(async () => {
    expect(await result.current.trashPages(['a'])).toBe(false);
  });
  expect(enqueueSuccessSnackBar).not.toHaveBeenCalled();
  expect(resyncDocuments).toHaveBeenCalled();
});
it('assigns distinct ordered positions when moving a selection including children', async () => {
  const { result } = renderActions();
  await act(async () => {
    expect(
      await result.current.movePages(
        ['b', 'child', 'a'],
        'destination',
        'inside',
      ),
    ).toEqual(['a', 'b']);
  });
  expect(
    updateOneRecord.mock.calls.map(([input]) => [
      input.idToUpdate,
      input.updateOneRecordInput,
    ]),
  ).toEqual([
    ['a', { parentId: 'destination', position: 0 }],
    ['b', { parentId: 'destination', position: 1 }],
  ]);
});
it('rejects the entire cyclic move and waits for the complete tree before deletion', async () => {
  const { result } = renderActions();
  await act(async () => {
    expect(
      await result.current.movePages(['a', 'b'], 'child', 'inside'),
    ).toEqual([]);
  });
  expect(updateOneRecord).not.toHaveBeenCalled();
  const loadingActions = renderActions(true);
  await act(async () => {
    expect(await loadingActions.result.current.trashPages(['a'])).toBe(false);
  });
  expect(deleteManyRecords).not.toHaveBeenCalled();
});
it('stops a partial bulk move and reports only successfully moved roots', async () => {
  updateOneRecord
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('denied'));
  const { result } = renderActions();
  await act(async () => {
    expect(
      await result.current.movePages(['a', 'b'], 'destination', 'inside'),
    ).toEqual(['a']);
  });
  expect(enqueueErrorSnackBar).toHaveBeenCalled();
  expect(resyncDocuments).toHaveBeenCalled();
});
it('ignores a second drop while the first operation is saving', async () => {
  let finishDelete: () => void = () => {};
  deleteManyRecords.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishDelete = resolve;
      }),
  );
  const { result } = renderActions();
  await act(async () => {
    const first = result.current.trashPages(['a']);
    expect(await result.current.trashPages(['a'])).toBe(false);
    finishDelete();
    await first;
  });
  expect(deleteManyRecords).toHaveBeenCalledTimes(1);
});

it('reports a partial server response without announcing a complete deletion', async () => {
  deleteManyRecords.mockResolvedValueOnce([{ id: 'child' }]);
  const { result } = renderActions();
  await act(async () => {
    expect(await result.current.trashPages(['a'])).toBe(false);
  });
  expect(enqueueSuccessSnackBar).not.toHaveBeenCalled();
  expect(enqueueErrorSnackBar.mock.calls[0][0].options.buttonLabel).toBe(
    'Undo',
  );
});
