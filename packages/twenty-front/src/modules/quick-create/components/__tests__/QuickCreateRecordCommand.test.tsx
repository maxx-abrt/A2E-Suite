import { QuickCreateRecordCommand } from '@/quick-create/components/QuickCreateRecordCommand';
import { RecordQuickCreateForm } from '@/object-record/record-create/components/RecordQuickCreateForm';
import { type QuickCreateCommand } from '@/quick-create/hooks/useQuickCreateCommands';
import { QUICK_CREATE_COMMAND_IDS } from '@/quick-create/constants/QuickCreateCommandIds';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconPlus } from 'twenty-ui/icon';

const mockCreate = jest.fn();
const mockLink = jest.fn();
const mockClose = jest.fn();
let mockLinksInstalled = false;
jest.mock('@/quick-create/hooks/useQuickCreateRecordCreate', () => ({
  useQuickCreateRecordCreate: () => ({ createQuickCreateRecord: mockCreate }),
}));
jest.mock('@/a2e-links/hooks/useCreateA2eLink', () => ({
  useCreateA2eLink: () => ({ createA2eLink: mockLink }),
}));
jest.mock('@/a2e-links/hooks/useIsA2eLinksApplicationInstalled', () => ({
  useIsA2eLinksApplicationInstalled: () => mockLinksInstalled,
}));
jest.mock('@/side-panel/hooks/useSidePanelMenu', () => ({
  useSidePanelMenu: () => ({ closeSidePanelMenu: mockClose }),
}));
jest.mock('@/quick-create/components/QuickCreateRecordCommandItem', () => ({
  QuickCreateRecordCommandItem: ({
    command,
    onClick,
  }: {
    command: QuickCreateCommand;
    onClick: () => void;
  }) => <button onClick={onClick}>{command.label}</button>,
}));
jest.mock(
  '@/quick-create/components/QuickCreateRecordCommandWithChooser',
  () => ({
    QuickCreateRecordCommandWithChooser: () => (
      <button>Choose a page template</button>
    ),
  }),
);
jest.mock(
  '@/object-record/record-create/components/RecordQuickCreateModal',
  () => ({
    RecordQuickCreateModal: ({
      onCreate,
      onClose,
    }: {
      onCreate: (title: string) => Promise<unknown>;
      onClose: () => void;
    }) => (
      <RecordQuickCreateForm
        label="Task title"
        onCreate={onCreate}
        onCancel={onClose}
        onCreated={onClose}
      />
    ),
  }),
);

beforeEach(() => {
  jest.clearAllMocks();
  mockLinksInstalled = false;
  mockCreate.mockResolvedValue({ id: 'created-task' });
  mockLink.mockResolvedValue(true);
  i18n.load('en', {});
  i18n.activate('en');
});

const command: QuickCreateCommand = {
  id: QUICK_CREATE_COMMAND_IDS.task,
  commandId: QUICK_CREATE_COMMAND_IDS.task,
  objectNameSingular: 'task',
  label: 'New task',
  Icon: IconPlus,
  isFileUpload: false,
};

const renderCommand = (linked = false) =>
  render(
    <I18nProvider i18n={i18n}>
      <QuickCreateRecordCommand
        command={command}
        sourceRecord={
          linked
            ? { objectNameSingular: 'document', recordId: 'source-page' }
            : null
        }
      />
    </I18nProvider>,
  );

it('collects a title before any creation and closes the command menu on success', async () => {
  const user = userEvent.setup();
  renderCommand();
  await user.click(screen.getByRole('button', { name: 'New task' }));
  expect(mockCreate).not.toHaveBeenCalled();
  await user.type(screen.getByRole('textbox'), '  Prepare the review{Enter}');
  await waitFor(() => expect(mockClose).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledWith('Prepare the review');
  expect(mockLink).not.toHaveBeenCalled();
});

it('cancels without creating an empty record', async () => {
  const user = userEvent.setup();
  renderCommand();
  await user.click(screen.getByRole('button', { name: 'New task' }));
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockClose).not.toHaveBeenCalled();
});

it('keeps failed input available for retry', async () => {
  mockCreate.mockRejectedValueOnce(new Error('Offline'));
  const user = userEvent.setup();
  renderCommand();
  await user.click(screen.getByRole('button', { name: 'New task' }));
  await user.type(screen.getByRole('textbox'), 'Keep my draft{Enter}');
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByRole('textbox')).toHaveValue('Keep my draft');
  expect(mockClose).not.toHaveBeenCalled();
  await user.keyboard('{Enter}');
  await waitFor(() => expect(mockClose).toHaveBeenCalledTimes(1));
});

it('pre-links the created task to its source page when Links is installed', async () => {
  mockLinksInstalled = true;
  const user = userEvent.setup();
  renderCommand(true);
  await user.click(screen.getByRole('button', { name: 'New task' }));
  await user.type(screen.getByRole('textbox'), 'Follow up{Enter}');
  await waitFor(() =>
    expect(mockLink).toHaveBeenCalledWith({
      sourceObjectNameSingular: 'document',
      sourceRecordId: 'source-page',
      targetObjectNameSingular: 'task',
      targetRecordId: 'created-task',
    }),
  );
});

it('does not recreate a saved task when linking fails', async () => {
  mockLinksInstalled = true;
  mockLink.mockResolvedValue(false);
  const user = userEvent.setup();
  renderCommand(true);
  await user.click(screen.getByRole('button', { name: 'New task' }));
  await user.type(screen.getByRole('textbox'), 'Follow up{Enter}');
  await waitFor(() => expect(mockClose).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
