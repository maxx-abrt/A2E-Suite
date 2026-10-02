import {
  A2E_EMPTY_STATE_SURFACES,
  type A2eEmptyStateSurface,
} from '@/a2e-empty-state/constants/A2eEmptyStateSurfaces';

// The record index only knows the object it lists, so this maps a `document` or
// `task` index back to the surface whose contextual empty state it should show.
export const getA2eEmptyStateSurfaceForObject = (
  objectNameSingular: string,
): A2eEmptyStateSurface | null =>
  Object.values(A2E_EMPTY_STATE_SURFACES).find(
    (surface) => surface.objectNameSingular === objectNameSingular,
  ) ?? null;
