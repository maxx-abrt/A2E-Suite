import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'jotai';
import { OpenRecordIn } from 'twenty-shared/types';

const mockCreate = jest.fn();
const mockOpenRecord = jest.fn();
const mockUpsert = jest.fn();
const mockNavigate = jest.fn();
let mockOpenRecordIn = OpenRecordIn.SIDE_PANEL;
let mockSurfaceType = 'main';

jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreate }),
}));
jest.mock('@/object-record/record-store/hooks/useUpsertRecordsInStore', () => ({
  useUpsertRecordsInStore: () => ({ upsertRecordsInStore: mockUpsert }),
}));
jest.mock('@/side-panel/hooks/useOpenRecordInSidePanel', () => ({
  useOpenRecordInSidePanel: () => ({ openRecordInSidePanel: mockOpenRecord }),
}));
jest.mock('@/side-panel/hooks/useSidePanelMenu', () => ({
  useSidePanelMenu: () => ({ closeSidePanelMenu: jest.fn() }),
}));
jest.mock('@/ui/layout/hooks/useWorkspaceSurface', () => ({
  useWorkspaceSurface: () => ({ type: mockSurfaceType }),
}));
jest.mock('@/object-record/record-index/hooks/useResolveOpenRecordIn', () => ({
  useResolveOpenRecordIn: () => mockOpenRecordIn,
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue',
  () => ({ useAtomComponentSelectorValue: () => [] }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue',
  () => ({ useAtomComponentStateValue: () => undefined }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateCallbackState',
  () => ({ useAtomComponentFamilyStateCallbackState: () => jest.fn() }),
);
jest.mock(
  '@/object-record/record-table/hooks/useBuildRecordInputFromFilters',
  () => ({
    useBuildRecordInputFromFilters: () => ({
      buildRecordInputFromFilters: () => ({
        projectId: 'project',
        title: 'Filtered default',
      }),
    }),
  }),
);
jest.mock('@/object-record/hooks/useBuildRecordInputFromRLSPredicates', () => ({
  useBuildRecordInputFromRLSPredicates: () => ({
    buildRecordInputFromRLSPredicates: () => ({ assigneeId: 'allowed-member' }),
  }),
}));
jest.mock('~/hooks/useNavigateApp', () => ({
  useNavigateApp: () => mockNavigate,
}));

const objectMetadataItem = {
  id: 'task-object',
  nameSingular: 'task',
  labelIdentifierFieldMetadataId: 'title-field',
  fields: [{ id: 'title-field', name: 'title' }],
} as unknown as EnrichedObjectMetadataItem;

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenRecordIn = OpenRecordIn.SIDE_PANEL;
  mockSurfaceType = 'main';
  mockCreate.mockImplementation(async (input) => ({
    ...input,
    status: 'TODO',
  }));
});

it.each(['main', 'side-panel'])(
  'quick entry keeps the %s surface and retains native filter and permission defaults',
  async (surface) => {
    mockSurfaceType = surface;
    const { result } = renderHook(
      () => useCreateNewIndexRecord({ objectMetadataItem }),
      { wrapper: Provider },
    );
    await act(async () => {
      await result.current.createNewIndexRecord(
        { title: 'Named task', position: 'last' },
        { shouldOpenRecord: false },
      );
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Named task',
        projectId: 'project',
        assigneeId: 'allowed-member',
        position: 'last',
      }),
    );
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockOpenRecord).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  },
);

it('seeds the record store before opening an explicitly requested details panel', async () => {
  const { result } = renderHook(
    () => useCreateNewIndexRecord({ objectMetadataItem }),
    { wrapper: Provider },
  );
  await act(async () => {
    await result.current.createNewIndexRecord({ title: 'Task details' });
  });
  expect(mockOpenRecord).toHaveBeenCalledWith(
    expect.objectContaining({ objectNameSingular: 'task', isNewRecord: true }),
  );
  expect(mockUpsert.mock.invocationCallOrder[0]).toBeLessThan(
    mockOpenRecord.mock.invocationCallOrder[0],
  );
});

it('preserves full-page creation when requested by the existing preference', async () => {
  mockOpenRecordIn = OpenRecordIn.RECORD_PAGE;
  const { result } = renderHook(
    () => useCreateNewIndexRecord({ objectMetadataItem }),
    { wrapper: Provider },
  );
  await act(async () => {
    await result.current.createNewIndexRecord();
  });
  expect(mockNavigate).toHaveBeenCalled();
  expect(mockOpenRecord).not.toHaveBeenCalled();
});

it('does not open a panel or seed a failed creation', async () => {
  mockCreate.mockRejectedValue(new Error('Not allowed'));
  const { result } = renderHook(
    () => useCreateNewIndexRecord({ objectMetadataItem }),
    { wrapper: Provider },
  );
  await act(async () => {
    await expect(
      result.current.createNewIndexRecord(
        { title: 'Keep me' },
        { shouldOpenRecord: false },
      ),
    ).rejects.toThrow('Not allowed');
  });
  expect(mockUpsert).not.toHaveBeenCalled();
  expect(mockOpenRecord).not.toHaveBeenCalled();
});
