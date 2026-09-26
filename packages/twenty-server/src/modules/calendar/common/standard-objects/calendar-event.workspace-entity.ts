import { type ActorMetadata, type LinksMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CalendarChannelEventAssociationWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-channel-event-association.workspace-entity';
import { type CalendarEventParticipantWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event-participant.workspace-entity';
import { type CalendarEventTargetWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event-target.workspace-entity';

export class CalendarEventWorkspaceEntity extends BaseWorkspaceEntity {
  title: string | null;
  isCanceled: boolean;
  isFullDay: boolean;
  startsAt: string | null;
  endsAt: string | null;
  externalCreatedAt: string | null;
  externalUpdatedAt: string | null;
  description: string | null;
  location: string | null;
  iCalUid: string | null;
  conferenceSolution: string | null;
  conferenceLink: LinksMetadata;
  // Local recurrence (never provider-synced): the anchor carries the rule, zone
  // and skipped days; a detached occurrence carries the same series id plus the
  // wall-clock day it replaces.
  recurrenceRule: string | null;
  recurrenceTimezone: string | null;
  recurrenceSeriesId: string | null;
  recurrenceOccurrenceDay: string | null;
  recurrenceSkippedOccurrenceDays: string | null;
  // P4C.4 reminder fields — nullable so existing and provider-synced events are
  // unaffected. reminderMinutes: minutes before startsAt to send the reminder.
  // reminderDeliveredAt: set after dispatch; non-null → already delivered
  // (idempotency key). See calendar-reminder.service.ts for the delivery loop
  // and D05 for the open attendee / timezone policy decision.
  reminderMinutes: number | null;
  reminderDeliveredAt: string | null;
  // Creator actor: local (channel-less) events are owned by the workspace member
  // that created them, which the calendar visibility filter resolves by id.
  createdBy: ActorMetadata;
  calendarChannelEventAssociations: EntityRelation<
    CalendarChannelEventAssociationWorkspaceEntity[]
  >;
  calendarEventParticipants: EntityRelation<
    CalendarEventParticipantWorkspaceEntity[]
  >;
  calendarEventTargets: EntityRelation<CalendarEventTargetWorkspaceEntity[]>;
  // callRecordings reverse relation intentionally omitted from the TypeScript workspace
  // entity. It exists in standard metadata, but declaring a to-many relation here expands
  // recursive nested insert types and tips Person past TS's instantiation-depth limit.
}
