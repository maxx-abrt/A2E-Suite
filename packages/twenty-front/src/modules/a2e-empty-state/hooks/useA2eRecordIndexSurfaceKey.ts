import { type A2eEmptyStateSurfaceKey } from '@/a2e-empty-state/constants/A2eEmptyStateSurfaces';
import { getA2eEmptyStateSurfaceForObject } from '@/a2e-empty-state/utils/getA2eEmptyStateSurfaceForObject';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';

// Resolves an A2E contextual empty state for a record index, or `null` when the
// object is not one of ours or its owning app is absent. Returning `null` keeps
// the host record-index empty state untouched, so an uninstalled app never
// leaves a broken panel (M13c install-gated degradation).
export const useA2eRecordIndexSurfaceKey = (
  objectNameSingular: string,
): A2eEmptyStateSurfaceKey | null => {
  const isDocumentApplicationInstalled = useIsDocumentApplicationInstalled();
  const surface = getA2eEmptyStateSurfaceForObject(objectNameSingular);

  if (surface === null) {
    return null;
  }

  if (surface.requiresDocumentApplication && !isDocumentApplicationInstalled) {
    return null;
  }

  return surface.surfaceKey;
};
