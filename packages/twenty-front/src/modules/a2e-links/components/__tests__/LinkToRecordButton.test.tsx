import { LinkToRecordButton } from '@/a2e-links/components/LinkToRecordButton';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { type RecordPickerPickableMorphItem } from '@/object-record/record-picker/types/RecordPickerPickableMorphItem';

let mockInstalled = true;
let mockCanUpdate = true;
const mockCreateLink = jest.fn();
const mockCloseDropdown = jest.fn();
const mockLinkHook = jest.fn(() => ({ createA2eLink: mockCreateLink }));
const mockObjects = ['document', 'task', 'a2eLink'].map((nameSingular) => ({
  id: nameSingular,
  nameSingular,
  isActive: true,
  isSearchable: true,
  isSystem: false,
  isUICreatable: true,
  isUIEditable: true,
  writability: 'OPEN',
}));
jest.mock('@/a2e-links/hooks/useIsA2eLinksApplicationInstalled', () => ({
  useIsA2eLinksApplicationInstalled: () => mockInstalled,
}));
jest.mock('@/a2e-links/hooks/useCreateA2eLink', () => ({
  useCreateA2eLink: () => mockLinkHook(),
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItems', () => ({
  useObjectMetadataItems: () => ({ objectMetadataItems: mockObjects }),
}));
jest.mock('@/object-record/hooks/useObjectPermissions', () => ({
  useObjectPermissions: () => ({
    objectPermissionsByObjectMetadataId: Object.fromEntries(
      mockObjects.map((item) => [
        item.id,
        { canReadObjectRecords: true, canUpdateObjectRecords: mockCanUpdate },
      ]),
    ),
  }),
}));
jest.mock('@/ui/layout/dropdown/hooks/useCloseDropdown', () => ({
  useCloseDropdown: () => ({ closeDropdown: mockCloseDropdown }),
}));
jest.mock('@/ui/layout/dropdown/components/Dropdown', () => ({
  Dropdown: ({
    dropdownId,
    clickableComponent,
    dropdownComponents,
  }: {
    dropdownId: string;
    clickableComponent: ReactNode;
    dropdownComponents: ReactNode;
  }) => (
    <section data-testid={dropdownId}>
      {clickableComponent}
      {dropdownComponents}
    </section>
  ),
}));
jest.mock(
  '@/object-record/record-picker/single-record-picker/components/SingleRecordPicker',
  () => ({
    SingleRecordPicker: ({
      onMorphItemSelected,
    }: {
      onMorphItemSelected: (item: RecordPickerPickableMorphItem) => void;
    }) => (
      <button
        onClick={() =>
          onMorphItemSelected({
            objectMetadataId: 'task',
            recordId: 'task-1',
          } as RecordPickerPickableMorphItem)
        }
      >
        Pick task
      </button>
    ),
  }),
);

beforeEach(() => {
  jest.clearAllMocks();
  mockInstalled = true;
  mockCanUpdate = true;
  mockCreateLink.mockResolvedValue(true);
  i18n.load('en', {});
  i18n.activate('en');
});

it('does not mount link creation while Links is absent', () => {
  mockInstalled = false;
  render(
    <LinkToRecordButton
      sourceObjectNameSingular="document"
      sourceRecordId="page-1"
    />,
  );
  expect(mockLinkHook).not.toHaveBeenCalled();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('hides linking when the junction is read-only', () => {
  mockCanUpdate = false;
  render(
    <LinkToRecordButton
      sourceObjectNameSingular="document"
      sourceRecordId="page-1"
    />,
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('creates a native link from the page to the selected task', async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider i18n={i18n}>
      <LinkToRecordButton
        sourceObjectNameSingular="document"
        sourceRecordId="page-1"
      />
    </I18nProvider>,
  );
  expect(
    screen.getByRole('button', { name: 'Link to a record' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Pick task' }));
  expect(mockCreateLink).toHaveBeenCalledWith({
    sourceObjectNameSingular: 'document',
    sourceRecordId: 'page-1',
    targetObjectNameSingular: 'task',
    targetRecordId: 'task-1',
  });
  expect(mockCloseDropdown).toHaveBeenCalledWith(
    'link-to-record-document-page-1',
  );
});

it('keeps two record pickers isolated when a page and side panel coexist', () => {
  render(
    <I18nProvider i18n={i18n}>
      <LinkToRecordButton
        sourceObjectNameSingular="document"
        sourceRecordId="page-1"
      />
      <LinkToRecordButton
        sourceObjectNameSingular="task"
        sourceRecordId="task-1"
      />
    </I18nProvider>,
  );
  expect(
    screen.getByTestId('link-to-record-document-page-1'),
  ).toBeInTheDocument();
  expect(screen.getByTestId('link-to-record-task-task-1')).toBeInTheDocument();
});
