import { type CalendarEventOverlapLayout } from '@/calendar/types/CalendarEventOverlapLayout';

export type CalendarEventInterval = {
  eventId: string;
  startMinutes: number;
  endMinutes: number;
};

// Greedy lane assignment: overlapping events are spread across columns so each
// one stays readable; a cluster ends when the next event starts after every
// event seen so far, and every event in the cluster shares its column count so
// widths stay aligned.
export const layoutCalendarEventOverlaps = ({
  intervals,
  dayMinutes,
}: {
  intervals: CalendarEventInterval[];
  dayMinutes: number;
}): CalendarEventOverlapLayout[] => {
  const sortedIntervals = [...intervals].sort(
    (intervalA, intervalB) =>
      intervalA.startMinutes - intervalB.startMinutes ||
      intervalA.endMinutes - intervalB.endMinutes ||
      intervalA.eventId.localeCompare(intervalB.eventId),
  );

  const layouts: CalendarEventOverlapLayout[] = [];
  let cluster: { interval: CalendarEventInterval; columnIndex: number }[] = [];
  let clusterMaxEnd = -1;
  let columnEnds: number[] = [];

  const flushCluster = () => {
    const columnCount = columnEnds.length;

    cluster.forEach(({ interval, columnIndex }) => {
      layouts.push({
        eventId: interval.eventId,
        topRatio: interval.startMinutes / dayMinutes,
        heightRatio:
          Math.max(interval.endMinutes - interval.startMinutes, 1) / dayMinutes,
        columnIndex,
        columnCount,
      });
    });

    cluster = [];
    columnEnds = [];
    clusterMaxEnd = -1;
  };

  sortedIntervals.forEach((interval) => {
    if (cluster.length > 0 && interval.startMinutes >= clusterMaxEnd) {
      flushCluster();
    }

    let columnIndex = columnEnds.findIndex(
      (columnEnd) => columnEnd <= interval.startMinutes,
    );

    if (columnIndex === -1) {
      columnIndex = columnEnds.length;
      columnEnds.push(interval.endMinutes);
    } else {
      columnEnds[columnIndex] = interval.endMinutes;
    }

    cluster.push({ interval, columnIndex });
    clusterMaxEnd = Math.max(clusterMaxEnd, interval.endMinutes);
  });

  if (cluster.length > 0) {
    flushCluster();
  }

  return layouts;
};
