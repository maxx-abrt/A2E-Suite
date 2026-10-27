import { BureauTreeItem } from '@/bureau/components/BureauTreeItem';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const navigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
jest.mock('@/bureau/hooks/useBureauWorkspace');
jest.mock('@/ui/utilities/responsive/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useSetAtomState', () => ({
  useSetAtomState: () => jest.fn(),
}));
jest.mock('@/bureau/hooks/useBureauTextInputFocus', () => ({
  useBureauTextInputFocus: () => ({
    handleFocus: jest.fn(),
    handleBlur: jest.fn(),
  }),
}));
jest.mock('@/bureau/components/BureauPageActionsDropdown', () => ({
  BureauPageActionsDropdown: () => <button>Page actions</button>,
}));
const page: BureauDocument = {
  __typename: 'Document',
  id: 'a',
  title: 'Notes',
  parentId: null,
  position: 0,
  icon: null,
  coverColor: null,
  coverImage: null,
  createdAt: null,
  updatedAt: null,
  deletedAt: null,
};
const makeWorkspace = () => ({
  tree: buildBureauTree([page]),
  activeDocumentId: null,
  expandedPageIds: [],
  toggleExpandedPageId: jest.fn(),
  selectedPageIds: [] as string[],
  draggedPageIds: [] as string[],
  trashingPageIds: [] as string[],
  draggedPageId: null,
  setDraggedPageId: jest.fn(),
  invalidDropTargetIds: new Set<string>(),
  togglePageSelection: jest.fn(),
  selectAllPages: jest.fn(),
  clearPageSelection: jest.fn(),
  isSelectingPages: false,
  isBulkActionPending: false,
  isLoading: false,
  error: undefined,
  actions: { updatePage: jest.fn(), createPage: jest.fn() },
  moveDraggedPages: jest.fn(),
  permissions: {
    canUpdateObjectRecords: true,
    canSoftDeleteObjectRecords: true,
  },
});
let workspace: ReturnType<typeof makeWorkspace>;
beforeEach(() => {
  jest.clearAllMocks();
  i18n.load('en', {});
  i18n.activate('en');
  workspace = makeWorkspace();
  jest
    .mocked(useBureauWorkspace)
    .mockImplementation(
      () => workspace as unknown as ReturnType<typeof useBureauWorkspace>,
    );
});
const renderItem = () =>
  render(
    <I18nProvider i18n={i18n}>
      <ul role="tree">
        <BureauTreeItem page={page} depth={0} section="pages" />
      </ul>
    </I18nProvider>,
  );
it('keeps ordinary navigation and uses modifier clicks for selection', async () => {
  renderItem();
  const user = userEvent.setup();
  await user.click(screen.getByText('Notes'));
  expect(navigate).toHaveBeenCalledWith('/bureau/a');
  navigate.mockClear();
  await user.keyboard('{Control>}');
  await user.click(screen.getByText('Notes'));
  await user.keyboard('{/Control}');
  expect(workspace.togglePageSelection).toHaveBeenCalledWith('a', false);
  expect(navigate).not.toHaveBeenCalled();
});
it('offers selection checkboxes, keyboard ranges and Escape without navigating', async () => {
  workspace.isSelectingPages = true;
  workspace.selectedPageIds = ['a'];
  renderItem();
  const user = userEvent.setup();
  expect(screen.getByRole('checkbox', { name: 'Select Notes' })).toBeChecked();
  expect(screen.getByRole('treeitem')).toHaveAttribute('aria-selected', 'true');
  screen.getByRole('treeitem').focus();
  await user.keyboard('{Shift>} {/Shift}{Escape}');
  expect(workspace.togglePageSelection).toHaveBeenCalledWith('a', true);
  expect(workspace.clearPageSelection).toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});
it('carries the selected group in a drag and makes saving rows non-draggable', () => {
  workspace.selectedPageIds = ['a', 'b'];
  const { rerender } = renderItem();
  const setData = jest.fn();
  fireEvent.dragStart(screen.getByRole('treeitem'), {
    dataTransfer: { setData },
  });
  expect(setData).toHaveBeenCalledWith('text/plain', 'a\nb');
  expect(workspace.setDraggedPageId).toHaveBeenCalledWith('a');
  workspace.isBulkActionPending = true;
  rerender(
    <I18nProvider i18n={i18n}>
      <BureauTreeItem page={page} depth={0} section="pages" />
    </I18nProvider>,
  );
  expect(screen.getByRole('treeitem')).toHaveAttribute('draggable', 'false');
});

it('uses the native checkbox and supports shift selection without opening the page', async () => {
  workspace.isSelectingPages = true;
  renderItem();
  const user = userEvent.setup();
  await user.keyboard('{Shift>}');
  await user.click(screen.getByRole('checkbox', { name: 'Select Notes' }));
  await user.keyboard('{/Shift}{Control>}a{/Control}{Escape}');
  expect(workspace.selectAllPages).toHaveBeenCalled();
  expect(workspace.clearPageSelection).toHaveBeenCalled();
  expect(workspace.togglePageSelection).toHaveBeenCalledWith('a', true);
  expect(navigate).not.toHaveBeenCalled();
});

const originalPointerEvent = window.PointerEvent;
beforeAll(() =>
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: MouseEvent,
  }),
);
afterAll(() =>
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: originalPointerEvent,
  }),
);

it('preserves select-all text editing while renaming a page', async () => {
  renderItem();
  const user = userEvent.setup();
  screen.getByRole('treeitem').focus();
  await user.keyboard('{F2}');
  const input = screen.getByRole('textbox', { name: 'Page title' });
  await user.click(input);
  await user.keyboard('{Control>}a{/Control}');
  expect(workspace.selectAllPages).not.toHaveBeenCalled();
  expect(input).toHaveFocus();
  expect((input as HTMLInputElement).selectionStart).toBe(0);
  expect((input as HTMLInputElement).selectionEnd).toBe(5);
});
