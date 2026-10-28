import { useWorkspaceRouteObjects } from '@/app/routing/components/WorkspaceRouteObjectsProvider';
import { useCallback } from 'react';
import { matchRoutes } from 'react-router-dom';

export const usePreloadWorkspaceRoute = () => {
  const routeObjects = useWorkspaceRouteObjects();

  return useCallback(
    (path: string) => {
      if (!path.startsWith('/') || path.startsWith('//')) {
        return;
      }

      const matches = matchRoutes(routeObjects, path);

      matches?.forEach(({ route }) => route.preloadComponent?.());
    },
    [routeObjects],
  );
};
