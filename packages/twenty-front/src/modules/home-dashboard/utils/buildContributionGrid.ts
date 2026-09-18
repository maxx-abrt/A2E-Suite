export type ContributionGridCell = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type ContributionGridWeek = {
  days: Array<ContributionGridCell | null>;
};

export type BuildContributionGridInput = {
  activityTimestamps: string[];
  today: Date;
  weekCount: number;
  firstDayOfWeek?: 0 | 1;
};

export const getLocalDayKey = (date: Date): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
};

export const getStartOfWeek = (date: Date, firstDayOfWeek: 0 | 1 = 1): Date => {
  const startOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayOffset = (startOfDay.getDay() - firstDayOfWeek + 7) % 7;
  const startOfWeek = new Date(startOfDay);

  startOfWeek.setDate(startOfWeek.getDate() - dayOffset);

  return startOfWeek;
};

const getContributionLevel = (
  count: number,
  maxCount: number,
): 0 | 1 | 2 | 3 | 4 => {
  if (count === 0) {
    return 0;
  }

  return Math.min(4, Math.ceil((count / maxCount) * 4)) as 1 | 2 | 3 | 4;
};

// A contribution grid has no dedicated storage: it is a day-bucketed projection
// of existing records, so the caller only supplies timestamps.
export const buildContributionGrid = ({
  activityTimestamps,
  today,
  weekCount,
  firstDayOfWeek = 1,
}: BuildContributionGridInput): ContributionGridWeek[] => {
  const normalizedWeekCount = Math.max(1, Math.floor(weekCount));
  const endOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const startOfCurrentWeek = getStartOfWeek(today, firstDayOfWeek);
  const gridStart = new Date(startOfCurrentWeek);

  gridStart.setDate(gridStart.getDate() - (normalizedWeekCount - 1) * 7);

  const countsByDay = new Map<string, number>();
  let maxCount = 0;

  for (const timestamp of activityTimestamps) {
    const activityDate = new Date(timestamp);

    if (Number.isNaN(activityDate.getTime())) {
      continue;
    }

    const dayTime = new Date(
      activityDate.getFullYear(),
      activityDate.getMonth(),
      activityDate.getDate(),
    ).getTime();

    if (dayTime < gridStart.getTime() || dayTime > endOfToday) {
      continue;
    }

    const dayKey = getLocalDayKey(activityDate);
    const nextCount = (countsByDay.get(dayKey) ?? 0) + 1;

    countsByDay.set(dayKey, nextCount);
    maxCount = Math.max(maxCount, nextCount);
  }

  const weeks: ContributionGridWeek[] = [];
  const cursor = new Date(gridStart);

  for (let weekIndex = 0; weekIndex < normalizedWeekCount; weekIndex++) {
    const days: Array<ContributionGridCell | null> = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const cellDate = new Date(cursor);

      if (cellDate.getTime() > endOfToday) {
        days.push(null);
      } else {
        const date = getLocalDayKey(cellDate);
        const count = countsByDay.get(date) ?? 0;

        days.push({
          date,
          count,
          level: getContributionLevel(count, maxCount),
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({ days });
  }

  return weeks;
};

export const countContributionGridActivities = (
  weeks: ContributionGridWeek[],
): number =>
  weeks.reduce(
    (total, week) =>
      total +
      week.days.reduce((weekTotal, cell) => weekTotal + (cell?.count ?? 0), 0),
    0,
  );
