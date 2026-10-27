import { BureauNavigation } from '@/bureau/components/BureauNavigation';
import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/bureau/hooks/useBureauWorkspace');
jest.mock('@/navigation/hooks/useIsNavigationDrawerContentExpanded', () => ({
  useIsNavigationDrawerContentExpanded: () => true,
}));
jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({ openTemplateGallery: jest.fn() }),
}));
jest.mock('@/ui/layout/modal/hooks/useModal', () => ({
  useModal: () => ({ openModal: jest.fn() }),
}));
jest.mock('@/bureau/components/BureauTreeItem', () => ({
  BureauTreeItem: ({ page }: { page: { title: string } }) => (
    <li role="treeitem">{page.title}</li>
  ),
}));
jest.mock('@/bureau/components/BureauSidebarAction', () => ({
  BureauSidebarAction: ({ label }: { label: string }) => (
    <button>{label}</button>
  ),
}));
it('keeps starter templates out of Pages while making them available in a collapsed section', async () => {
  i18n.load('en', {});
  i18n.activate('en');
  const workspace = {
    tree: {
      childrenByParentId: new Map([
        [
          null,
          [
            { id: 'page', title: 'My notes', kind: 'DOCUMENT' },
            { id: 'template', title: 'Reusable blueprint', kind: 'TEMPLATE' },
          ],
        ],
      ]),
    },
    permissions: { canUpdateObjectRecords: true },
    favoriteDocuments: [],
    draggedPageIds: [],
    trashingPageIds: [],
    actions: {},
    activeDocumentId: null,
  } as unknown as ReturnType<typeof useBureauWorkspace>;
  jest.mocked(useBureauWorkspace).mockReturnValue(workspace);
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <BureauWorkspaceContext.Provider value={workspace}>
          <BureauNavigation />
        </BureauWorkspaceContext.Provider>
      </MemoryRouter>
    </I18nProvider>,
  );
  expect(
    within(screen.getByRole('tree', { name: 'Pages' })).getByRole('treeitem'),
  ).toHaveTextContent('My notes');
  expect(screen.getByText('Reusable blueprint')).not.toBeVisible();
  await userEvent.setup().click(screen.getByText('Saved templates'));
  expect(
    within(screen.getByRole('tree', { name: 'Saved templates' })).getByRole(
      'treeitem',
    ),
  ).toHaveTextContent('Reusable blueprint');
});
