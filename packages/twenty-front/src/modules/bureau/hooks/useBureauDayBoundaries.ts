import { UserContext } from '@/users/contexts/UserContext';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Temporal } from 'temporal-polyfill';

export const useBureauDayBoundaries = () => {
  const { timeZone } = useContext(UserContext);
  const [now, setNow] = useState(() => Date.now());
  const today = useMemo(
    () =>
      Temporal.Instant.fromEpochMilliseconds(now)
        .toZonedDateTimeISO(timeZone ?? Temporal.Now.timeZoneId())
        .startOfDay(),
    [now, timeZone],
  );
  const tomorrow = today.add({ days: 1 });
  const tomorrowEpochMilliseconds = tomorrow.epochMilliseconds;

  // Open workspaces must follow the member's local day across DST and midnight.
  useEffect(() => {
    const refreshDay = () => setNow(Date.now());
    const timeout = window.setTimeout(
      refreshDay,
      Math.max(0, tomorrowEpochMilliseconds - Date.now()) + 1,
    );
    window.addEventListener('focus', refreshDay);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('focus', refreshDay);
    };
  }, [tomorrowEpochMilliseconds]);

  return { today, tomorrow };
};
