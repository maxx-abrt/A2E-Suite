import { randomUUID } from 'crypto';

import { createOneOperationFactory } from 'test/integration/graphql/utils/create-one-operation-factory.util';
import { destroyOneOperationFactory } from 'test/integration/graphql/utils/destroy-one-operation-factory.util';
import { findManyOperationFactory } from 'test/integration/graphql/utils/find-many-operation-factory.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';

const CALENDAR_EVENT_GQL_FIELDS = `
  id
  title
  description
  isFullDay
  startsAt
  endsAt
`;

const LOCAL_EVENT_TITLE = 'Local-only planning session';
const LOCAL_EVENT_DESCRIPTION = 'Created without a connected calendar account';
const LOCAL_EVENT_STARTS_AT = '2030-01-02T09:00:00.000Z';
const LOCAL_EVENT_ENDS_AT = '2030-01-02T10:00:00.000Z';

// A local event has no calendar-channel association. Before the core read-filter
// fix the visibility hook spliced every channel-less row out, so the creator
// could not read back the event they had just created.
describe('local calendar event visibility (e2e)', () => {
  const localCalendarEventId = randomUUID();

  beforeAll(async () => {
    const createResponse = await makeGraphqlAPIRequest(
      createOneOperationFactory({
        objectMetadataSingularName: 'calendarEvent',
        gqlFields: CALENDAR_EVENT_GQL_FIELDS,
        data: {
          id: localCalendarEventId,
          title: LOCAL_EVENT_TITLE,
          description: LOCAL_EVENT_DESCRIPTION,
          isFullDay: false,
          startsAt: LOCAL_EVENT_STARTS_AT,
          endsAt: LOCAL_EVENT_ENDS_AT,
        },
      }),
    );

    expect(createResponse.body.errors).toBeUndefined();
  });

  afterAll(async () => {
    await makeGraphqlAPIRequest(
      destroyOneOperationFactory({
        objectMetadataSingularName: 'calendarEvent',
        gqlFields: 'id',
        recordId: localCalendarEventId,
      }),
    );
  });

  it('returns a channel-less event to its creator without redaction', async () => {
    const findResponse = await makeGraphqlAPIRequest(
      findManyOperationFactory({
        objectMetadataSingularName: 'calendarEvent',
        objectMetadataPluralName: 'calendarEvents',
        gqlFields: CALENDAR_EVENT_GQL_FIELDS,
        filter: { id: { eq: localCalendarEventId } },
      }),
    );

    expect(findResponse.body.errors).toBeUndefined();

    const edges = findResponse.body.data.calendarEvents.edges;

    expect(edges).toHaveLength(1);

    const calendarEvent = edges[0].node;

    expect(calendarEvent.id).toBe(localCalendarEventId);
    expect(calendarEvent.title).toBe(LOCAL_EVENT_TITLE);
    expect(calendarEvent.description).toBe(LOCAL_EVENT_DESCRIPTION);
  });
});
