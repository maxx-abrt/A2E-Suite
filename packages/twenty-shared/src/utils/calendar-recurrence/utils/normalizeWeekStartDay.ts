// Calendar start day uses the 0=Sunday..6=Saturday index stored on the
// workspace member format preferences. Values outside that range fall back to
// Monday so the grid stays deterministic instead of throwing.
export const normalizeWeekStartDay = (
  weekStartsOnDayIndex: number | null | undefined,
): number => {
  if (
    !Number.isInteger(weekStartsOnDayIndex) ||
    (weekStartsOnDayIndex as number) < 0 ||
    (weekStartsOnDayIndex as number) > 6
  ) {
    return 1;
  }

  return weekStartsOnDayIndex as number;
};
