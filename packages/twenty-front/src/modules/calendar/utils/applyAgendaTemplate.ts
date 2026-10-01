import { type Temporal } from 'temporal-polyfill';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import {
  resolveTemplateApplyRequestError,
  type TemplateApplyCreatedRecord,
  type TemplateApplyResult,
  type TemplateDescriptor,
} from 'twenty-shared/application';
import {
  CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK,
  isDefined,
} from 'twenty-shared/utils';

import { type AgendaTemplateEventSpec } from '@/calendar/constants/AgendaTemplateDefinitions';
import { AGENDA_TEMPLATE_DESCRIPTORS } from '@/calendar/constants/AgendaTemplateDescriptors';
import {
  type CalendarEventDraft,
  type CalendarEventInput,
} from '@/calendar/types/CalendarEventDraft';
import { type CalendarRecurrenceDraft } from '@/calendar/types/CalendarRecurrenceDraft';
import { buildCalendarEventInputFromDraft } from '@/calendar/utils/buildCalendarEventInputFromDraft';
import { buildCalendarSeriesAnchorInputFromDraft } from '@/calendar/utils/buildCalendarSeriesAnchorInputFromDraft';
import { buildDefaultCalendarRecurrenceDraft } from '@/calendar/utils/buildDefaultCalendarRecurrenceDraft';
import { findAgendaTemplateDefinition } from '@/calendar/utils/findAgendaTemplateDefinition';

// M9c — the Agenda half of the gallery's "Use template" write path.
//
// Unlike the content apps, Agenda has no app-owned object to write: every
// template resolves to fresh `calendarEvent` rows through the same host
// primitives the calendar page uses (`buildCalendarEventInputFromDraft` +
// `buildCalendarSeriesAnchorInputFromDraft`). The client is injected so the
// apply path is exercisable without a live workspace; the hook supplies real
// creates and an iCalUid lookup.
//
// Idempotency uses the operation id: with one, each event gets a deterministic
// id (uuid v5) and a deterministic `iCalUid`, so re-applying the same operation
// finds the rows it already wrote and creates nothing; without one, every apply
// mints fresh ids (AC: fresh IDs).

export type AgendaCalendarEventInput = CalendarEventInput & {
  id: string;
  iCalUid: string | null;
  recurrenceSkippedOccurrenceDays?: string | null;
};

export type AgendaTemplateApplyClient = {
  findCalendarEventIdsByICalUid: (
    iCalUids: string[],
  ) => Promise<Map<string, string>>;
  createCalendarEvent: (input: AgendaCalendarEventInput) => Promise<string>;
};

export type AgendaTemplateApplyRequest = {
  key: string;
  operationId?: string | null;
  inputs?: Record<string, unknown> | null;
};

export type AgendaTemplateApplyContext = {
  anchorDay: Temporal.PlainDate;
  timeZone: string;
};

const CALENDAR_EVENT_OBJECT_NAME = 'calendarEvent';
const ICAL_UID_PREFIX = 'a2e-agenda-template';
// A fixed namespace so (operationId, descriptor key, event index) always mints
// the same event id; that determinism is the pre-write idempotency guard.
const AGENDA_TEMPLATE_ID_NAMESPACE = 'f2d6b1c4-6a3e-4c7b-9d0f-8e5a1b2c3d40';

const normalizeOperationId = (operationId: unknown): string | null => {
  if (typeof operationId !== 'string' || operationId.trim() === '') {
    return null;
  }

  return operationId.trim();
};

// A weekly ritual pins itself to the coming weekday; a one-off schedule is a
// plain offset from the anchor day.
const resolveEventStartDay = ({
  anchorDay,
  spec,
}: {
  anchorDay: Temporal.PlainDate;
  spec: AgendaTemplateEventSpec;
}): Temporal.PlainDate => {
  if (isDefined(spec.dayOfWeek)) {
    const targetDayOfWeek =
      CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK[spec.dayOfWeek];
    const daysUntilTarget = (targetDayOfWeek - anchorDay.dayOfWeek + 7) % 7;

    return anchorDay.add({ days: daysUntilTarget });
  }

  return anchorDay.add({ days: spec.dayOffset ?? 0 });
};

const buildEventRecurrence = ({
  spec,
  startDay,
}: {
  spec: AgendaTemplateEventSpec;
  startDay: Temporal.PlainDate;
}): CalendarRecurrenceDraft | null => {
  if (!isDefined(spec.recurrence)) {
    return null;
  }

  const draft = buildDefaultCalendarRecurrenceDraft({
    frequency: spec.recurrence.frequency,
    startDay,
  });

  return isDefined(spec.recurrence.weekdays)
    ? { ...draft, byWeekdays: spec.recurrence.weekdays }
    : draft;
};

const buildEventInput = ({
  spec,
  startDay,
  timeZone,
  eventId,
  iCalUid,
}: {
  spec: AgendaTemplateEventSpec;
  startDay: Temporal.PlainDate;
  timeZone: string;
  eventId: string;
  iCalUid: string | null;
}): AgendaCalendarEventInput => {
  const endMinutesOfDay =
    spec.startHour * 60 + spec.startMinute + spec.durationMinutes;
  const endDay = startDay.add({ days: Math.floor(endMinutesOfDay / 1440) });
  const endMinuteOfDay = endMinutesOfDay % 1440;

  const draft: CalendarEventDraft = {
    title: spec.title,
    description: '',
    location: '',
    isFullDay: spec.isFullDay ?? false,
    isCanceled: false,
    startDay,
    startHour: spec.startHour,
    startMinute: spec.startMinute,
    endDay,
    endHour: Math.floor(endMinuteOfDay / 60),
    endMinute: endMinuteOfDay % 60,
    recurrence: buildEventRecurrence({ spec, startDay }),
    reminderMinutes: spec.reminderMinutes ?? null,
  };

  const input = buildCalendarEventInputFromDraft({ draft, timeZone });
  const seriesAnchorInput = buildCalendarSeriesAnchorInputFromDraft({
    draft,
    timeZone,
    seriesAnchorEventId: eventId,
  });

  return {
    ...input,
    id: eventId,
    iCalUid,
    ...(isDefined(seriesAnchorInput)
      ? { ...seriesAnchorInput, recurrenceSkippedOccurrenceDays: null }
      : {}),
  };
};

export const applyResolvedAgendaTemplate = async (
  client: AgendaTemplateApplyClient,
  descriptor: TemplateDescriptor,
  request: AgendaTemplateApplyRequest,
  context: AgendaTemplateApplyContext,
): Promise<TemplateApplyResult> => {
  const rejection = resolveTemplateApplyRequestError({
    descriptor,
    installedApplications: { names: [], universalIdentifiers: [] },
    inputs: request.inputs,
  });

  if (rejection !== null) {
    return {
      status: 'rejected',
      key: descriptor.key,
      errorCode: rejection.errorCode,
      message: rejection.message,
    };
  }

  const definition = findAgendaTemplateDefinition(descriptor.key);

  if (!isDefined(definition)) {
    return {
      status: 'rejected',
      key: descriptor.key,
      errorCode: 'APPLY_FAILED',
      message: `Le contenu du modèle « ${descriptor.key} » est introuvable.`,
    };
  }

  const operationId = normalizeOperationId(request.operationId);

  const plans = definition.events.map((spec, index) => {
    const startDay = resolveEventStartDay({
      anchorDay: context.anchorDay,
      spec,
    });
    const eventId = isDefined(operationId)
      ? uuidv5(
          `${descriptor.key}:${operationId}:${index}`,
          AGENDA_TEMPLATE_ID_NAMESPACE,
        )
      : uuidv4();
    const iCalUid = isDefined(operationId)
      ? `${ICAL_UID_PREFIX}:${descriptor.key}:${operationId}:${index}`
      : null;

    return {
      eventId,
      iCalUid,
      input: buildEventInput({
        spec,
        startDay,
        timeZone: context.timeZone,
        eventId,
        iCalUid,
      }),
    };
  });

  const existingIdByICalUid = new Map<string, string>();

  if (isDefined(operationId)) {
    const iCalUids = plans.map((plan) => plan.iCalUid).filter(isDefined);
    const existing = await client.findCalendarEventIdsByICalUid(iCalUids);

    existing.forEach((id, iCalUid) => existingIdByICalUid.set(iCalUid, id));
  }

  const created: TemplateApplyCreatedRecord[] = [];

  for (const plan of plans) {
    const existingId = isDefined(plan.iCalUid)
      ? existingIdByICalUid.get(plan.iCalUid)
      : undefined;

    if (isDefined(existingId)) {
      created.push({ object: CALENDAR_EVENT_OBJECT_NAME, id: existingId });
      continue;
    }

    const createdId = await client.createCalendarEvent(plan.input);

    created.push({
      object: CALENDAR_EVENT_OBJECT_NAME,
      id: createdId.length > 0 ? createdId : plan.eventId,
    });
  }

  return {
    status: 'applied',
    key: descriptor.key,
    version: descriptor.version,
    operationId,
    created,
  };
};

export const applyAgendaTemplateByKey = async (
  client: AgendaTemplateApplyClient,
  request: AgendaTemplateApplyRequest,
  context: AgendaTemplateApplyContext,
): Promise<TemplateApplyResult> => {
  const descriptor = AGENDA_TEMPLATE_DESCRIPTORS.find(
    (candidate) => candidate.key === request.key,
  );

  if (!isDefined(descriptor)) {
    return {
      status: 'rejected',
      key: request.key,
      errorCode: 'UNKNOWN_TEMPLATE_KEY',
      message: `Aucun modèle d’agenda ne correspond à la clé « ${request.key} ».`,
    };
  }

  return applyResolvedAgendaTemplate(client, descriptor, request, context);
};
