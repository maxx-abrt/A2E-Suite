import { MINUTES_PER_DAY } from 'src/engine/core-modules/notification/constants/notification-policy.constant';
import { type NotificationQuietHours } from 'src/engine/core-modules/notification/types/notification-preferences.type';

// Quiet hours are a local-time window that may wrap midnight (22:00 → 07:00).
// A start equal to end is treated as "no window" rather than all-day so a user
// who clears both fields never accidentally mutes every email.
export const isWithinQuietHours = ({
  date,
  quietHours,
}: {
  date: Date;
  quietHours: NotificationQuietHours;
}): boolean => {
  if (!quietHours.enabled) {
    return false;
  }

  const { startMinuteOfDay, endMinuteOfDay, utcOffsetMinutes } = quietHours;

  if (startMinuteOfDay === endMinuteOfDay) {
    return false;
  }

  const localMinuteOfDay =
    (((date.getUTCHours() * 60 + date.getUTCMinutes() + utcOffsetMinutes) %
      MINUTES_PER_DAY) +
      MINUTES_PER_DAY) %
    MINUTES_PER_DAY;

  if (startMinuteOfDay < endMinuteOfDay) {
    return (
      localMinuteOfDay >= startMinuteOfDay && localMinuteOfDay < endMinuteOfDay
    );
  }

  return (
    localMinuteOfDay >= startMinuteOfDay || localMinuteOfDay < endMinuteOfDay
  );
};
