import {
  type A2eEmptyStateRequiredApplication,
  type A2eEmptyStateSurfaceKey,
} from '@/a2e-empty-state/constants/A2eEmptyStateSurfaces';
import { getA2eEmptyStateSurfaceForObject } from '@/a2e-empty-state/utils/getA2eEmptyStateSurfaceForObject';
import { useIsDriveApplicationInstalled } from '@/drive/hooks/useIsDriveApplicationInstalled';
import { useIsA2eAccountingApplicationInstalled } from '@/quick-create/hooks/useIsA2eAccountingApplicationInstalled';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';

// Resolves an A2E contextual empty state for a record index, or `null` when the
// object is not one of ours or its owning app is absent. Returning `null` keeps
// the host record-index empty state untouched, so an uninstalled app never
// leaves a broken panel (M13c install-gated degradation).
export const useA2eRecordIndexSurfaceKey = (
  objectNameSingular: string,
): A2eEmptyStateSurfaceKey | null => {
  // Called unconditionally so the hook order is stable across surfaces; each
  // gate is only read when its surface declares it below.
  const isDocumentApplicationInstalled = useIsDocumentApplicationInstalled();
  const isAccountingApplicationInstalled =
    useIsA2eAccountingApplicationInstalled();
  const isDriveApplicationInstalled = useIsDriveApplicationInstalled();

  const surface = getA2eEmptyStateSurfaceForObject(objectNameSingular);

  if (surface === null) {
    return null;
  }

  const isApplicationInstalled: Record<
    A2eEmptyStateRequiredApplication,
    boolean
  > = {
    document: isDocumentApplicationInstalled,
    accounting: isAccountingApplicationInstalled,
    drive: isDriveApplicationInstalled,
  };

  if (
    surface.requiredApplication !== null &&
    !isApplicationInstalled[surface.requiredApplication]
  ) {
    return null;
  }

  return surface.surfaceKey;
};
