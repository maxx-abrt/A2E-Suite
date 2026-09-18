import { type InboxNotification } from '@/inbox/types/InboxNotification';
import { resolveNotificationDeepLink } from '@/inbox/utils/resolveNotificationDeepLink';

const buildNotification = (
  payload: InboxNotification['payload'],
  type = 'MENTION',
): InboxNotification => ({
  id: 'notification-1',
  type,
  payload,
  createdAt: '2026-09-18T09:00:00.000Z',
  readAt: null,
  archivedAt: null,
});

describe('resolveNotificationDeepLink', () => {
  it('deep-links a chat mention to its channel', () => {
    expect(
      resolveNotificationDeepLink(
        buildNotification({
          kind: 'chat.mention',
          channelId: 'channel-1',
          messageId: 'message-1',
        }),
      ),
    ).toBe('/discussions?channelId=channel-1');
  });

  it('deep-links a chat message payload without a kind', () => {
    expect(
      resolveNotificationDeepLink(
        buildNotification({ channelId: 'channel-2', messageId: 'message-2' }),
      ),
    ).toBe('/discussions?channelId=channel-2');
  });

  it('deep-links a record notification to the record show page', () => {
    expect(
      resolveNotificationDeepLink(
        buildNotification(
          { objectNameSingular: 'task', recordId: 'task-1' },
          'ASSIGNED',
        ),
      ),
    ).toBe('/object/task/task-1');
  });

  it('deep-links a document notification natively', () => {
    expect(
      resolveNotificationDeepLink(
        buildNotification(
          { objectNameSingular: 'document', recordId: 'document-1' },
          'WATCHED_RECORD_CHANGED',
        ),
      ),
    ).toBe('/object/document/document-1');
  });

  it('returns null for an unknown target so the inbox stays graceful', () => {
    expect(
      resolveNotificationDeepLink(buildNotification({ foo: 'bar' }, 'SYSTEM')),
    ).toBeNull();
  });

  it('returns null when the payload is missing', () => {
    expect(resolveNotificationDeepLink(buildNotification(null))).toBeNull();
  });

  it('returns null when the record ids are incomplete', () => {
    expect(
      resolveNotificationDeepLink(
        buildNotification({ objectNameSingular: 'task' }, 'ASSIGNED'),
      ),
    ).toBeNull();
  });

  it('returns null for a chat mention without a channel', () => {
    expect(
      resolveNotificationDeepLink(
        buildNotification({ kind: 'chat.mention', messageId: 'message-1' }),
      ),
    ).toBeNull();
  });
});
