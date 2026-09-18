import { buildWatchNotificationPayload } from 'src/engine/core-modules/notification/utils/build-watch-notification-payload.util';

describe('buildWatchNotificationPayload', () => {
  it('builds a record payload with the object name and record id', () => {
    expect(
      buildWatchNotificationPayload({
        targetKind: 'RECORD',
        objectNameSingular: 'opportunity',
        targetId: 'record-1',
        changedFieldNames: ['amount'],
      }),
    ).toEqual({
      kind: 'record.change',
      targetKind: 'RECORD',
      changedFieldNames: ['amount'],
      objectNameSingular: 'opportunity',
      recordId: 'record-1',
    });
  });

  it('builds a document payload using the record-id convention', () => {
    expect(
      buildWatchNotificationPayload({
        targetKind: 'DOCUMENT',
        objectNameSingular: 'document',
        targetId: 'document-1',
      }),
    ).toEqual({
      kind: 'record.change',
      targetKind: 'DOCUMENT',
      changedFieldNames: [],
      objectNameSingular: 'document',
      recordId: 'document-1',
    });
  });

  it('builds a channel payload carrying channelId', () => {
    expect(
      buildWatchNotificationPayload({
        targetKind: 'CHANNEL',
        targetId: 'channel-1',
      }),
    ).toEqual({
      kind: 'record.change',
      targetKind: 'CHANNEL',
      changedFieldNames: [],
      channelId: 'channel-1',
    });
  });
});
