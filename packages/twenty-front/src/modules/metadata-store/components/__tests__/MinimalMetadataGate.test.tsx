import { MinimalMetadataGate } from '@/metadata-store/components/MinimalMetadataGate';
import { usePreloadWorkspaceRoute } from '@/app/routing/hooks/usePreloadWorkspaceRoute';
import { preloadNavigationDrawerSections } from '@/navigation/components/MainNavigationDrawerScrollableItems';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('@/app/routing/hooks/usePreloadWorkspaceRoute');
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
jest.mock(
  '@/navigation/components/MainNavigationDrawerScrollableItems',
  () => ({
    preloadNavigationDrawerSections: jest.fn(),
  }),
);
jest.mock(
  '@/object-metadata/components/PreComputedChipGeneratorsProvider',
  () => ({
    PreComputedChipGeneratorsProvider: ({
      children,
    }: {
      children: ReactNode;
    }) => children,
  }),
);
jest.mock('~/loading/components/UserOrMetadataLoader', () => ({
  UserOrMetadataLoader: () => <div>Loading workspace</div>,
}));

const preloadPage = jest.fn();

describe('MinimalMetadataGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAtomStateValue).mockReturnValue(false);
    jest.mocked(usePreloadWorkspaceRoute).mockReturnValue(preloadPage);
  });

  it('starts page and navigation downloads while keeping content behind the metadata gate', () => {
    const renderContent = () => (
      <MemoryRouter initialEntries={['/bureau/page-id']}>
        <Routes>
          <Route element={<MinimalMetadataGate />}>
            <Route
              path="/bureau/:documentId"
              element={<div>Workspace page</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(renderContent());

    expect(screen.getByText('Loading workspace')).toBeInTheDocument();
    expect(screen.queryByText('Workspace page')).not.toBeInTheDocument();
    expect(preloadPage).toHaveBeenCalledWith('/bureau/page-id');
    expect(preloadNavigationDrawerSections).toHaveBeenCalledTimes(1);

    jest.mocked(useAtomStateValue).mockReturnValue(true);
    rerender(renderContent());

    expect(screen.getByText('Workspace page')).toBeInTheDocument();
    expect(screen.queryByText('Loading workspace')).not.toBeInTheDocument();
  });
});
