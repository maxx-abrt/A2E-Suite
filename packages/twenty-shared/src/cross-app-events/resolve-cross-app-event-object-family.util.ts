import { type CrossAppEventObjectFamily } from '@/cross-app-events/cross-app-event-object-family.type';
import { CROSS_APP_EVENT_OBJECT_NAME_BY_FAMILY } from '@/cross-app-events/cross-app-event-vocabulary.constant';

// Maps a workspace object singular name to its cross-app family. Returns
// undefined for objects outside the contract so the caller emits nothing
// instead of inventing a family.
export const resolveCrossAppEventObjectFamily = (
  objectNameSingular: string,
): CrossAppEventObjectFamily | undefined => {
  const entry = (
    Object.entries(CROSS_APP_EVENT_OBJECT_NAME_BY_FAMILY) as Array<
      [CrossAppEventObjectFamily, string]
    >
  ).find(([, objectName]) => objectName === objectNameSingular);

  return entry?.[0];
};
