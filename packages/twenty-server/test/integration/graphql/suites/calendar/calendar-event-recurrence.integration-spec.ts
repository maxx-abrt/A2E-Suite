import { randomUUID } from 'crypto';

import { createOneOperationFactory } from 'test/integration/graphql/utils/create-one-operation-factory.util';
import { destroyOneOperationFactory } from 'test/integration/graphql/utils/destroy-one-operation-factory.util';
import { findManyOperationFactory } from 'test/integration/graphql/utils/find-many-operation-factory.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { updateOneOperationFactory } from 'test/integration/graphql/utils/update-one-operation-factory.util';
import {
  buildCalendarOccurrenceId,
  buildCalendarSeriesId,
} from 'twenty-shared/utils';

import { expandStoredCalendarEventRecurrence } from 'src/modules/calendar/common/utils/expand-stored-calendar-event-recurrence.util';

const CALENDAR_EVENT_GQL_FIELDS = `
  id
  startsAt
  recurrenceRule
  recurrenceTimezone
  recurrenceSeriesId
  recurrenceOccurrenceDay
  recurrenceSkippedOccurrenceDays
`;

// 09:00 America/New_York the day before the 2026-03-08 spring-forward.
const SERIES_START = '2026-03-07T14:00:00.000Z';
const SERIES_TIMEZONE = 'America/New_York';
const SERIES_RULE = 'FREQ=DAILY;COUNT=3';
const RANGE_START = '2026-03-01T00:00:00.000Z';
const RANGE_END = '2026-03-15T00:00:00.000Z';
const DETACHED_OCCURRENCE_DAY = '2026-03-08';
const DETACHED_STARTS_AT = '2026-03-08T18:00:00.000Z';

// The stored path: recurrence lands on standard calendarEvent rows and is read
// back through the same generic API a calendar surface uses. The anchor carries
// the rule; a detached occurrence is a sibling row sharing the series id and
// naming the wall-clock day it replaces.
describe('calendar event recurrence stored path (e2e)', () => {
  const anchorCalendarEventId = randomUUID();
  const seriesId = buildCalendarSeriesId({
    seriesAnchorEventId: anchorCalendarEventId,
  });
  const detachedCalendarEventIds: string[] = [];

  const findSeriesRecords = async () => {
    const response = await makeGraphqlAPIRequest(
      findManyOperationFactory({
        objectMetadataSingularName: 'calendarEvent',
        objectMetadataPluralName: 'calendarEvents',
        gqlFields: CALENDAR_EVENT_GQL_FIELDS,
        filter: { recurrenceSeriesId: { eq: seriesId } },
      }),
    );

    expect(response.body.errors).toBeUndefined();

    return response.body.data.calendarEvents.edges.map(
      (edge: { node: Record<string, unknown> }) => edge.node,
    );
  };

  const upsertDetachedOccurrence = async ({
    startsAt,
  }: {
    startsAt: string;
  }) => {
    const records = await findSeriesRecords();
    const existing = records.find(
      (record: { recurrenceOccurrenceDay: string | null }) =>
        record.recurrenceOccurrenceDay === DETACHED_OCCURRENCE_DAY,
    );

    if (existing !== undefined) {
      const response = await makeGraphqlAPIRequest(
        updateOneOperationFactory({
          objectMetadataSingularName: 'calendarEvent',
          gqlFields: CALENDAR_EVENT_GQL_FIELDS,
          recordId: existing.id,
          data: { startsAt },
        }),
      );

      expect(response.body.errors).toBeUndefined();

      return;
    }

    const detachedCalendarEventId = randomUUID();

    detachedCalendarEventIds.push(detachedCalendarEventId);

    const response = await makeGraphqlAPIRequest(
      createOneOperationFactory({
        objectMetadataSingularName: 'calendarEvent',
        gqlFields: CALENDAR_EVENT_GQL_FIELDS,
        data: {
          id: detachedCalendarEventId,
          isFullDay: false,
          isCanceled: false,
          startsAt,
          endsAt: startsAt,
          recurrenceSeriesId: seriesId,
          recurrenceOccurrenceDay: DETACHED_OCCURRENCE_DAY,
        },
      }),
    );

    expect(response.body.errors).toBeUndefined();
  };

  beforeAll(async () => {
    const response = await makeGraphqlAPIRequest(
      createOneOperationFactory({
        objectMetadataSingularName: 'calendarEvent',
        gqlFields: CALENDAR_EVENT_GQL_FIELDS,
        data: {
          id: anchorCalendarEventId,
          title: 'Daily standup',
          isFullDay: false,
          isCanceled: false,
          startsAt: SERIES_START,
          endsAt: '2026-03-07T15:00:00.000Z',
          recurrenceRule: SERIES_RULE,
          recurrenceTimezone: SERIES_TIMEZONE,
          recurrenceSeriesId: seriesId,
        },
      }),
    );

    expect(response.body.errors).toBeUndefined();
  });

  afterAll(async () => {
    for (const detachedCalendarEventId of [
      ...detachedCalendarEventIds,
      anchorCalendarEventId,
    ]) {
      await makeGraphqlAPIRequest(
        destroyOneOperationFactory({
          objectMetadataSingularName: 'calendarEvent',
          gqlFields: 'id',
          recordId: detachedCalendarEventId,
        }),
      );
    }
  });

  it('expands the stored rule over the range in the stored timezone across DST', async () => {
    const records = await findSeriesRecords();

    const occurrences = expandStoredCalendarEventRecurrence({
      records,
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
    });

    // Wall-clock 09:00 New York survives the spring-forward: the UTC instant
    // shifts from 14:00Z to 13:00Z on and after 2026-03-08.
    expect(occurrences).toEqual([
      { day: '2026-03-07', startsAt: '2026-03-07T14:00:00Z' },
      { day: '2026-03-08', startsAt: '2026-03-08T13:00:00Z' },
      { day: '2026-03-09', startsAt: '2026-03-09T13:00:00Z' },
    ]);

    // Stable occurrence identity is derivable from the persisted series id + day.
    expect(
      buildCalendarOccurrenceId({
        seriesId,
        occurrenceDay: '2026-03-08',
      }),
    ).toBe(`${seriesId}@2026-03-08`);
  });

  it('keeps a detached occurrence across re-query and does not duplicate it on replay', async () => {
    await upsertDetachedOccurrence({ startsAt: DETACHED_STARTS_AT });
    // Replaying the same detach (retry) must not add a second row.
    await upsertDetachedOccurrence({ startsAt: DETACHED_STARTS_AT });

    const records = await findSeriesRecords();
    const detachedRecords = records.filter(
      (record: { recurrenceOccurrenceDay: string | null }) =>
        record.recurrenceOccurrenceDay === DETACHED_OCCURRENCE_DAY,
    );

    expect(detachedRecords).toHaveLength(1);
    expect(detachedRecords[0].startsAt).toBe(DETACHED_STARTS_AT);

    const occurrences = expandStoredCalendarEventRecurrence({
      records,
      rangeStart: RANGE_START,
      rangeEnd: RANGE_END,
    });

    expect(occurrences).toEqual([
      { day: '2026-03-07', startsAt: '2026-03-07T14:00:00Z' },
      { day: '2026-03-08', startsAt: DETACHED_STARTS_AT },
      { day: '2026-03-09', startsAt: '2026-03-09T13:00:00Z' },
    ]);
  });
});
