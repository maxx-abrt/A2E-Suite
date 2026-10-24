import { useQuickCreateCommands } from '@/quick-create/hooks/useQuickCreateCommands';
import { renderHook } from '@testing-library/react';
import { i18n } from '@lingui/core';

let mockSearch = '';
let mockReadOnly = false;
let mockMetadataReady = true;
const mockObjectMetadataItems = [
  'task',
  'project',
  'document',
  'calendarEvent',
].map((nameSingular) => ({
  id: nameSingular,
  nameSingular,
  isUICreatable: true,
  isUIEditable: true,
  writability: 'OPEN',
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItems', () => ({
  useObjectMetadataItems: () => ({
    objectMetadataItems: mockMetadataReady ? mockObjectMetadataItems : [],
  }),
}));
jest.mock('@/object-record/hooks/useObjectPermissions', () => ({
  useObjectPermissions: () => ({
    objectPermissionsByObjectMetadataId: Object.fromEntries(
      mockObjectMetadataItems.map((item) => [
        item.id,
        { canReadObjectRecords: true, canUpdateObjectRecords: !mockReadOnly },
      ]),
    ),
  }),
}));
jest.mock('@/quick-capture/hooks/useIsDocumentApplicationInstalled', () => ({
  useIsDocumentApplicationInstalled: () => true,
}));
jest.mock('@/quick-create/hooks/useIsA2eProjectsApplicationInstalled', () => ({
  useIsA2eProjectsApplicationInstalled: () => true,
}));
jest.mock(
  '@/quick-create/hooks/useIsA2eAccountingApplicationInstalled',
  () => ({ useIsA2eAccountingApplicationInstalled: () => false }),
);
jest.mock('@/drive/hooks/useIsDriveApplicationInstalled', () => ({
  useIsDriveApplicationInstalled: () => false,
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => mockSearch,
}));

beforeEach(() => {
  mockSearch = '';
  mockReadOnly = false;
  mockMetadataReady = true;
  i18n.load('en', {});
  i18n.activate('en');
});

it('offers installed, writable record kinds', () => {
  const { result } = renderHook(() => useQuickCreateCommands());
  expect(
    result.current.quickCreateCommands.map(
      (command) => command.objectNameSingular,
    ),
  ).toEqual(['document', 'task', 'project', 'calendarEvent']);
});

it('removes unavailable creation actions from the selectable command list', () => {
  mockReadOnly = true;
  const { result } = renderHook(() => useQuickCreateCommands());
  expect(result.current.quickCreateCommands).toEqual([]);
});

it('waits for object metadata instead of offering a broken creation action', () => {
  mockMetadataReady = false;
  const { result } = renderHook(() => useQuickCreateCommands());
  expect(result.current.quickCreateCommands).toEqual([]);
});

it('keeps command search filtering after the permission gate', () => {
  mockSearch = 'PROJECT';
  const { result } = renderHook(() => useQuickCreateCommands());
  expect(
    result.current.quickCreateCommands.map(
      (command) => command.objectNameSingular,
    ),
  ).toEqual(['project']);
});
