import { CalendarChannelVisibility } from 'twenty-shared/types';

export type CalendarEventChannelAccess = {
  visibility: CalendarChannelVisibility;
  isOwnedByCurrentUser: boolean;
};

export type CalendarEventVisibility = 'FULL' | 'REDACTED' | 'HIDDEN';

export const resolveCalendarEventVisibility = ({
  hasChannelAssociation,
  channelAccesses,
  isCreatedByCurrentUser,
}: {
  hasChannelAssociation: boolean;
  channelAccesses: CalendarEventChannelAccess[];
  isCreatedByCurrentUser: boolean;
}): CalendarEventVisibility => {
  if (
    channelAccesses.some(
      (channelAccess) =>
        channelAccess.visibility === CalendarChannelVisibility.SHARE_EVERYTHING,
    )
  ) {
    return 'FULL';
  }

  if (
    channelAccesses.some((channelAccess) => channelAccess.isOwnedByCurrentUser)
  ) {
    return 'FULL';
  }

  if (
    channelAccesses.some(
      (channelAccess) =>
        channelAccess.visibility === CalendarChannelVisibility.METADATA,
    )
  ) {
    return 'REDACTED';
  }

  // A channel-less event is a local event: it belongs to its creator and, for
  // everyone else, reuses the default METADATA channel semantics (owner-full,
  // others-redacted). An event whose association could not be resolved to a
  // channel is not local and stays hidden, as before.
  if (!hasChannelAssociation) {
    return isCreatedByCurrentUser ? 'FULL' : 'REDACTED';
  }

  return 'HIDDEN';
};
