import { WorkspaceRouteObjectsContext } from '@/app/routing/components/WorkspaceRouteObjectsProvider';
import { usePreloadWorkspaceRoute } from '@/app/routing/hooks/usePreloadWorkspaceRoute';
import { type WorkspaceRouteObject } from '@/app/routing/types/WorkspaceRouteObject';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';

const preloadBureau = jest.fn();
const preloadRecords = jest.fn();
const preloadWorkflow = jest.fn();

const routeObjects: WorkspaceRouteObject[] = [
  { path: '/bureau/:documentId?', preloadComponent: preloadBureau },
  { path: '/objects/:objectNamePlural', preloadComponent: preloadRecords },
  { path: '/objects/workflows', preloadComponent: preloadWorkflow },
  { path: '*' },
];

const wrapper = ({ children }: { children: ReactNode }) => (
  <WorkspaceRouteObjectsContext.Provider value={routeObjects}>
    {children}
  </WorkspaceRouteObjectsContext.Provider>
);

describe('usePreloadWorkspaceRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['/bureau', '/bureau/page-id', '/bureau/page-id?tab=notes#title'])(
    'preloads only the requested page for %s',
    (path) => {
      const { result } = renderHook(usePreloadWorkspaceRoute, { wrapper });

      result.current(path);

      expect(preloadBureau).toHaveBeenCalledTimes(1);
      expect(preloadRecords).not.toHaveBeenCalled();
      expect(preloadWorkflow).not.toHaveBeenCalled();
    },
  );

  it('honors specialized route matching before generic record routes', () => {
    const { result } = renderHook(usePreloadWorkspaceRoute, { wrapper });

    result.current('/objects/workflows');

    expect(preloadWorkflow).toHaveBeenCalledTimes(1);
    expect(preloadRecords).not.toHaveBeenCalled();
  });

  it.each(['https://example.com/bureau', '//example.com/bureau', '/unknown'])(
    'does not load workspace code for %s',
    (path) => {
      const { result } = renderHook(usePreloadWorkspaceRoute, { wrapper });

      result.current(path);

      expect(preloadBureau).not.toHaveBeenCalled();
      expect(preloadRecords).not.toHaveBeenCalled();
      expect(preloadWorkflow).not.toHaveBeenCalled();
    },
  );
});
