import { isDefined } from 'twenty-shared/utils';

import { type NotificationWatchTargetKind } from 'src/engine/core-modules/notification/constants/notification-watch-target-kind.constant';

// One payload shape for every watch kind, carrying the ids the inbox
// deep-links from: records/documents follow the `{ objectNameSingular,
// recordId }` convention (native record pages), channels carry `channelId`
// (discussions page). `kind` is always `record.change` so the front can render
// a single category, while the target kind decides the deep-link route.
export const buildWatchNotificationPayload = ({
  targetKind,
  objectNameSingular,
  targetId,
  changedFieldNames,
}: {
  targetKind: NotificationWatchTargetKind;
  objectNameSingular?: string | null;
  targetId: string;
  changedFieldNames?: string[];
}): Record<string, unknown> => {
  const basePayload = {
    kind: 'record.change',
    targetKind,
    changedFieldNames: changedFieldNames ?? [],
  };

  if (targetKind === 'CHANNEL') {
    return {
      ...basePayload,
      channelId: targetId,
    };
  }

  return {
    ...basePayload,
    ...(isDefined(objectNameSingular) ? { objectNameSingular } : {}),
    recordId: targetId,
  };
};
