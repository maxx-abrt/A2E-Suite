import { isNonEmptyString } from '@sniptt/guards';
import {
  type ObjectRecordEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import {
  buildCrossAppEventPayload,
  type CrossAppEventAction,
  type CrossAppEventActor,
  type CrossAppEventPayload,
  CROSS_APP_EVENT_ACTIVATION_APP_BY_FAMILY,
  resolveCrossAppEventObjectFamily,
} from 'twenty-shared/cross-app-events';

import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';

// The task status value that means "done" in the standard task schema. Kept
// here (not imported from workspace metadata) because a lifecycle event must
// stay resolvable without a metadata read.
export const CROSS_APP_EVENT_COMPLETED_TASK_STATUS = 'DONE';

const DATABASE_ACTION_TO_CROSS_APP_ACTION: Record<
  DatabaseEventAction,
  CrossAppEventAction
> = {
  [DatabaseEventAction.CREATED]: 'created',
  [DatabaseEventAction.UPDATED]: 'updated',
  [DatabaseEventAction.DELETED]: 'deleted',
  [DatabaseEventAction.DESTROYED]: 'deleted',
  [DatabaseEventAction.RESTORED]: 'updated',
  [DatabaseEventAction.UPSERTED]: 'updated',
};

export type MapDatabaseEventToCrossAppEventsInput = {
  objectMetadataNameSingular: string;
  databaseAction: DatabaseEventAction;
  workspaceId: string;
  events: ObjectRecordEvent[];
  isApplicationInstalled: (universalIdentifier: string) => boolean;
  occurredAt: string;
};

const readRecordSnapshot = (
  event: ObjectRecordEvent,
): Record<string, unknown> => {
  const properties = event.properties as {
    before?: unknown;
    after?: unknown;
  };
  const snapshot = properties.after ?? properties.before;

  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as Record<string, unknown>)
    : {};
};

const readTimestamp = (
  record: Record<string, unknown>,
  field: 'createdAt' | 'updatedAt',
): string | null =>
  isNonEmptyString(record[field]) ? (record[field] as string) : null;

const resolveActor = (event: ObjectRecordEvent): CrossAppEventActor =>
  isNonEmptyString(event.workspaceMemberId)
    ? {
        type: 'workspaceMember',
        workspaceMemberId: event.workspaceMemberId,
        ...(isNonEmptyString(event.userWorkspaceId)
          ? { userWorkspaceId: event.userWorkspaceId }
          : {}),
      }
    : { type: 'system' };

// `completed` is a semantic action, not a database one: a task update reaching
// the done status is promoted so recipes can trigger on `task.completed`
// instead of diffing a status field.
const resolveAction = ({
  event,
  databaseAction,
  objectFamily,
}: {
  event: ObjectRecordEvent;
  databaseAction: DatabaseEventAction;
  objectFamily: string;
}): CrossAppEventAction => {
  const mappedAction = DATABASE_ACTION_TO_CROSS_APP_ACTION[databaseAction];

  if (
    objectFamily === 'task' &&
    databaseAction === DatabaseEventAction.UPDATED
  ) {
    const updateEvent = event as ObjectRecordUpdateEvent;
    const previousStatus = (
      updateEvent.properties.before as Record<string, unknown> | undefined
    )?.status;
    const nextStatus = (
      updateEvent.properties.after as Record<string, unknown> | undefined
    )?.status;

    if (
      nextStatus === CROSS_APP_EVENT_COMPLETED_TASK_STATUS &&
      previousStatus !== CROSS_APP_EVENT_COMPLETED_TASK_STATUS
    ) {
      return 'completed';
    }
  }

  return mappedAction;
};

// Projects raw database events onto the shared cross-app contract. Returns an
// empty list for objects outside the contract and for families whose app is not
// installed, so an uninstalled optional app never leaks an event.
export const mapDatabaseEventToCrossAppEvents = (
  input: MapDatabaseEventToCrossAppEventsInput,
): CrossAppEventPayload[] => {
  const objectFamily = resolveCrossAppEventObjectFamily(
    input.objectMetadataNameSingular,
  );

  if (objectFamily === undefined) {
    return [];
  }

  const activationAppUniversalIdentifier =
    CROSS_APP_EVENT_ACTIVATION_APP_BY_FAMILY[objectFamily];

  if (
    activationAppUniversalIdentifier !== undefined &&
    !input.isApplicationInstalled(activationAppUniversalIdentifier)
  ) {
    return [];
  }

  const crossAppEvents: CrossAppEventPayload[] = [];

  for (const event of input.events) {
    if (!isNonEmptyString(event.recordId)) {
      continue;
    }

    const record = readRecordSnapshot(event);

    crossAppEvents.push(
      buildCrossAppEventPayload({
        objectFamily,
        action: resolveAction({
          event,
          databaseAction: input.databaseAction,
          objectFamily,
        }),
        workspaceId: input.workspaceId,
        recordId: event.recordId,
        actor: resolveActor(event),
        timestamps: {
          occurredAt: input.occurredAt,
          createdAt: readTimestamp(record, 'createdAt'),
          updatedAt: readTimestamp(record, 'updatedAt'),
        },
        record,
      }),
    );
  }

  return crossAppEvents;
};
