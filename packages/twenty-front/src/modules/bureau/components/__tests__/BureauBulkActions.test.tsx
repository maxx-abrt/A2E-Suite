import { BureauBulkActions } from '@/bureau/components/BureauBulkActions';
import { BureauTrashDropTarget } from '@/bureau/components/BureauTrashDropTarget';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/bureau/hooks/useBureauWorkspace');
jest.mock('@/bureau/components/BureauSidebarAction', () => ({
  BureauSidebarAction: ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => <button onClick={onClick}>{label}</button>,
}));
jest.mock('@/ui/input/components/Select', () => ({
  Select: ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
  }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const page = (id: string, parentId: string | null): BureauDocument => ({
  __typename: 'Document',
  id,
  title: id,
  parentId,
  position: 0,
  icon: null,
  coverColor: null,
  coverImage: null,
  createdAt: null,
  updatedAt: null,
  deletedAt: null,
});
const tree = buildBureauTree([
  page('a', null),
  page('child', 'a'),
  page('destination', null),
]);
const makeWorkspace = () => ({
  tree,
  selectedPageIds: ['a', 'child'],
  trashingPageIds: [],
  draggedPageIds: ['a', 'child'],
  isSelectingPages: true,
  isBulkActionPending: false,
  isLoading: false,
  error: undefined,
  clearPageSelection: jest.fn(),
  selectAllPages: jest.fn(),
  setDraggedPageId: jest.fn(),
  setIsBulkActionPending: jest.fn(),
  setTrashingPageIds: jest.fn(),
  openTrash: jest.fn(),
  actions: {
    trashPages: jest.fn().mockResolvedValue(true),
    movePages: jest.fn().mockResolvedValue(['a']),
    updatePage: jest.fn().mockResolvedValue(true),
  },
  permissions: {
    canSoftDeleteObjectRecords: true,
    canUpdateObjectRecords: true,
  },
});
let workspace: ReturnType<typeof makeWorkspace>;
beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
  workspace = makeWorkspace();
  jest
    .mocked(useBureauWorkspace)
    .mockImplementation(
      () => workspace as unknown as ReturnType<typeof useBureauWorkspace>,
    );
});
const renderBulk = () =>
  render(
    <I18nProvider i18n={i18n}>
      <BureauBulkActions />
      <BureauTrashDropTarget />
    </I18nProvider>,
  );

it('moves the selection while excluding its subtree from the destination picker', async () => {
  renderBulk();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Move to…' }));
  const picker = screen.getByRole('combobox', { name: 'Move into' });
  expect(
    screen.queryByRole('option', { name: 'child' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'a' })).not.toBeInTheDocument();
  await user.selectOptions(picker, 'destination');
  await user.click(screen.getByRole('button', { name: 'Move pages' }));
  expect(workspace.actions.movePages).toHaveBeenCalledWith(
    ['a', 'child'],
    'destination',
    'inside',
  );
  expect(workspace.clearPageSelection).toHaveBeenCalled();
});
it('keeps failed selections available and applies appearance only to the selected pages', async () => {
  workspace.actions.trashPages.mockResolvedValueOnce(false);
  renderBulk();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Move to trash' }));
  expect(workspace.clearPageSelection).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Small text' }));
  expect(workspace.actions.updatePage.mock.calls).toEqual([
    ['a', { isSmallText: true }],
    ['child', { isSmallText: true }],
  ]);
});
it('accepts an internal drag once, with feedback and recoverable failure', async () => {
  let finish: (value: boolean) => void = () => {};
  workspace.actions.trashPages.mockImplementationOnce(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  renderBulk();
  const target = screen.getByTestId('bureau-trash-drop-target');
  const dataTransfer = { dropEffect: 'none' };
  fireEvent.dragOver(target, { dataTransfer });
  expect(
    screen.getByRole('button', { name: 'Drop to move to trash' }),
  ).toBeVisible();
  fireEvent.drop(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  expect(workspace.actions.trashPages).toHaveBeenCalledTimes(1);
  expect(workspace.setTrashingPageIds).toHaveBeenCalledWith(['a', 'child']);
  await act(async () => {
    finish(false);
  });
  expect(workspace.clearPageSelection).not.toHaveBeenCalled();
  expect(workspace.setTrashingPageIds).toHaveBeenLastCalledWith([]);
});
it.each(['no-permission', 'external-file', 'loading', 'pending'] as const)(
  'ignores a %s drop',
  (reason) => {
    if (reason === 'no-permission')
      workspace.permissions.canSoftDeleteObjectRecords = false;
    if (reason === 'external-file') workspace.draggedPageIds = [];
    if (reason === 'loading') workspace.isLoading = true;
    if (reason === 'pending') workspace.isBulkActionPending = true;
    renderBulk();
    fireEvent.drop(screen.getByTestId('bureau-trash-drop-target'), {
      dataTransfer: {},
    });
    expect(workspace.actions.trashPages).not.toHaveBeenCalled();
  },
);
it('hides mutations the member cannot perform', () => {
  workspace.permissions = {
    canSoftDeleteObjectRecords: false,
    canUpdateObjectRecords: false,
  };
  renderBulk();
  expect(
    screen.queryByRole('button', { name: 'Move to trash' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Move to…' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Full width' }),
  ).not.toBeInTheDocument();
});
