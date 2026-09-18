import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';

import { type InboxNotification } from '@/inbox/types/InboxNotification';

const getPayloadString = (
  payload: Record<string, unknown>,
  key: string,
): string | null => {
  const value = payload[key];

  return typeof value === 'string' && value.length > 0 ? value : null;
};

// Maps a notification to the native route of its target. Only producers that
// exist resolve: chat mentions/messages land on the discussions page (P5.2),
// and record/document notifications follow the `{ objectNameSingular, recordId }`
// payload convention (records/documents are native). Anything else — an unknown
// type or a payload missing its ids — returns null so the inbox renders a
// non-navigable, graceful state instead of a broken link.
export const resolveNotificationDeepLink = (
  notification: InboxNotification,
): string | null => {
  const payload = notification.payload;

  if (payload === null) {
    return null;
  }

  const kind = getPayloadString(payload, 'kind');
  const channelId = getPayloadString(payload, 'channelId');

  if (kind === 'chat.mention' || kind === 'chat.message') {
    return isDefined(channelId)
      ? getAppPath(AppPath.Discussions, undefined, { channelId })
      : null;
  }

  // Defensive fallback: a chat payload without a `kind` still deep-links as
  // long as it carries a channel and a message.
  if (
    isDefined(channelId) &&
    isDefined(getPayloadString(payload, 'messageId'))
  ) {
    return getAppPath(AppPath.Discussions, undefined, { channelId });
  }

  const objectNameSingular = getPayloadString(payload, 'objectNameSingular');
  const recordId = getPayloadString(payload, 'recordId');

  if (isDefined(objectNameSingular) && isDefined(recordId)) {
    return getAppPath(AppPath.RecordShowPage, {
      objectNameSingular,
      objectRecordId: recordId,
    });
  }

  return null;
};
