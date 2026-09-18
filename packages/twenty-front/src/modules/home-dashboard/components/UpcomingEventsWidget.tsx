import { useLingui } from '@lingui/react/macro';
import { CoreObjectNameSingular } from 'twenty-shared/types';

import { UpcomingEventsWidgetContent } from '@/home-dashboard/components/UpcomingEventsWidgetContent';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';
import { formatHomeWidgetDayLabel } from '@/home-dashboard/utils/formatHomeWidgetDayLabel';
import {
  type HomeCalendarEventSummary,
  selectUpcomingEvents,
} from '@/home-dashboard/utils/selectUpcomingEvents';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

const UPCOMING_EVENTS_WIDGET_LIMIT = 8;

const formatEventTimeLabel = (date: Date): string =>
  date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

export const UpcomingEventsWidget = () => {
  const { t } = useLingui();
  const now = new Date();

  const { records } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.CalendarEvent,
    filter: {
      and: [
        { startsAt: { gte: now.toISOString() } },
        { isCanceled: { eq: false } },
      ],
    },
    orderBy: [{ startsAt: 'AscNullsLast' }],
    limit: UPCOMING_EVENTS_WIDGET_LIMIT,
    recordGqlFields: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      isFullDay: true,
    },
  });

  const events = selectUpcomingEvents(
    records as unknown as HomeCalendarEventSummary[],
    { now, limit: UPCOMING_EVENTS_WIDGET_LIMIT },
  );

  const entries: HomeWidgetListEntry[] = events.map((event) => {
    const startsAt = new Date(event.startsAt);
    const endsAt = event.endsAt !== null ? new Date(event.endsAt) : null;
    const timeLabel =
      event.isFullDay === true
        ? t`All day`
        : endsAt !== null
          ? `${formatEventTimeLabel(startsAt)} – ${formatEventTimeLabel(endsAt)}`
          : formatEventTimeLabel(startsAt);

    return {
      id: event.id,
      title: event.title,
      subtitle: timeLabel,
      trailingLabel: formatHomeWidgetDayLabel(event.startsAt),
    };
  });

  return <UpcomingEventsWidgetContent entries={entries} />;
};
