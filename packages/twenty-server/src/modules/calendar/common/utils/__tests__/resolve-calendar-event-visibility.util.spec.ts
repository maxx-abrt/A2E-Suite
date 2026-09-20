import { CalendarChannelVisibility } from 'twenty-shared/types';

import { resolveCalendarEventVisibility } from 'src/modules/calendar/common/utils/resolve-calendar-event-visibility.util';

const metadataChannel = (isOwnedByCurrentUser: boolean) => ({
  visibility: CalendarChannelVisibility.METADATA,
  isOwnedByCurrentUser,
});

const sharedChannel = (isOwnedByCurrentUser: boolean) => ({
  visibility: CalendarChannelVisibility.SHARE_EVERYTHING,
  isOwnedByCurrentUser,
});

describe('resolveCalendarEventVisibility', () => {
  it('keeps the event full when a channel shares everything', () => {
    expect(
      resolveCalendarEventVisibility({
        hasChannelAssociation: true,
        channelAccesses: [sharedChannel(false)],
        isCreatedByCurrentUser: false,
      }),
    ).toBe('FULL');
  });

  it('keeps the event full when the current user owns a channel', () => {
    expect(
      resolveCalendarEventVisibility({
        hasChannelAssociation: true,
        channelAccesses: [metadataChannel(true)],
        isCreatedByCurrentUser: false,
      }),
    ).toBe('FULL');
  });

  it('redacts a metadata channel the current user does not own', () => {
    expect(
      resolveCalendarEventVisibility({
        hasChannelAssociation: true,
        channelAccesses: [metadataChannel(false)],
        isCreatedByCurrentUser: false,
      }),
    ).toBe('REDACTED');
  });

  it('prefers a share-everything channel over a metadata one', () => {
    expect(
      resolveCalendarEventVisibility({
        hasChannelAssociation: true,
        channelAccesses: [metadataChannel(false), sharedChannel(false)],
        isCreatedByCurrentUser: false,
      }),
    ).toBe('FULL');
  });

  it('keeps a local event full for its creator', () => {
    expect(
      resolveCalendarEventVisibility({
        hasChannelAssociation: false,
        channelAccesses: [],
        isCreatedByCurrentUser: true,
      }),
    ).toBe('FULL');
  });

  it('redacts a local event for everyone else', () => {
    expect(
      resolveCalendarEventVisibility({
        hasChannelAssociation: false,
        channelAccesses: [],
        isCreatedByCurrentUser: false,
      }),
    ).toBe('REDACTED');
  });

  it('hides an event whose association cannot be resolved to a channel', () => {
    expect(
      resolveCalendarEventVisibility({
        hasChannelAssociation: true,
        channelAccesses: [],
        isCreatedByCurrentUser: true,
      }),
    ).toBe('HIDDEN');
  });
});
