import { BureauWorkspaceProvider } from '@/bureau/components/BureauWorkspaceProvider';
import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/bureau/hooks/useIsBureauAvailable', () => ({
  useIsBureauAvailable: () => true,
}));
jest.mock('@/bureau/hooks/useBureauWorkspaceValue', () => ({
  useBureauWorkspaceValue: () => ({}),
}));
jest.mock(
  '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemsByFolder',
  () => ({
    useNavigationMenuItemsByFolder: () => ({
      navigationMenuItemsByFolder: [
        {
          navigationMenuItems: [
            { type: 'LINK', link: '/bureau' },
            { type: 'OBJECT', targetObjectMetadataId: 'project-metadata' },
            { type: 'LINK', link: '/calendar' },
          ],
        },
        { navigationMenuItems: [{ type: 'LINK', link: '/objects/invoices' }] },
      ],
    }),
  }),
);
jest.mock(
  '@/navigation-menu-item/common/hooks/useNavigationObjectMetadataItems',
  () => ({
    useNavigationObjectMetadataItems: () => [
      {
        id: 'project-metadata',
        namePlural: 'projects',
        nameSingular: 'project',
      },
    ],
  }),
);
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => [],
}));
const Probe = () => (
  <span>
    {useContext(BureauWorkspaceContext) ? 'Pages available' : 'No page context'}
  </span>
);
it.each(['/bureau', '/bureau/document-id', '/objects/projects', '/calendar'])(
  'keeps page creation and tree available on %s',
  (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <BureauWorkspaceProvider>
          <Probe />
        </BureauWorkspaceProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('Pages available')).toBeInTheDocument();
  },
);
it('does not mount document data in another application', () => {
  render(
    <MemoryRouter initialEntries={['/objects/invoices']}>
      <BureauWorkspaceProvider>
        <Probe />
      </BureauWorkspaceProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText('No page context')).toBeInTheDocument();
});
