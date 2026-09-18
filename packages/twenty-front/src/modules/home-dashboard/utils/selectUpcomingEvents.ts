export type HomeCalendarEventSummary = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  isFullDay: boolean | null;
};

export const selectUpcomingEvents = (
  events: HomeCalendarEventSummary[],
  { now, limit }: { now: Date; limit: number },
): HomeCalendarEventSummary[] =>
  events
    .filter((event) => new Date(event.startsAt).getTime() >= now.getTime())
    .sort(
      (firstEvent, secondEvent) =>
        new Date(firstEvent.startsAt).getTime() -
        new Date(secondEvent.startsAt).getTime(),
    )
    .slice(0, limit);
