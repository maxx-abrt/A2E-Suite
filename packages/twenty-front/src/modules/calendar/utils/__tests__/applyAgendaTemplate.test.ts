import { Temporal } from 'temporal-polyfill';
import { type TemplateDescriptor } from 'twenty-shared/application';

import { AGENDA_TEMPLATE_DESCRIPTORS } from '@/calendar/constants/AgendaTemplateDescriptors';
import { type AgendaTemplateKey } from '@/calendar/constants/AgendaTemplateDefinitions';
import {
  applyAgendaTemplateByKey,
  applyResolvedAgendaTemplate,
  type AgendaCalendarEventInput,
  type AgendaTemplateApplyClient,
  type AgendaTemplateApplyContext,
} from '@/calendar/utils/applyAgendaTemplate';
import { findAgendaTemplateDefinition } from '@/calendar/utils/findAgendaTemplateDefinition';

// 2026-07-15 is a Wednesday, so the workweek placement exercises both a forward
// weekday jump (Monday) and a same-week one (Friday).
const ANCHOR_DAY = Temporal.PlainDate.from('2026-07-15');

const CONTEXT: AgendaTemplateApplyContext = {
  anchorDay: ANCHOR_DAY,
  timeZone: 'UTC',
};

const buildFakeClient = () => {
  const createdInputs: AgendaCalendarEventInput[] = [];
  const idByICalUid = new Map<string, string>();

  const client: AgendaTemplateApplyClient = {
    findCalendarEventIdsByICalUid: async (iCalUids) => {
      const existing = new Map<string, string>();

      for (const iCalUid of iCalUids) {
        const id = idByICalUid.get(iCalUid);

        if (id !== undefined) {
          existing.set(iCalUid, id);
        }
      }

      return existing;
    },
    createCalendarEvent: async (input) => {
      createdInputs.push(input);

      if (input.iCalUid !== null) {
        idByICalUid.set(input.iCalUid, input.id);
      }

      return input.id;
    },
  };

  return { client, createdInputs };
};

const expectApplied = (
  result: Awaited<ReturnType<typeof applyResolvedAgendaTemplate>>,
) => {
  expect(result.status).toBe('applied');

  if (result.status !== 'applied') {
    throw new Error('expected an applied result');
  }

  return result;
};

describe.each(AGENDA_TEMPLATE_DESCRIPTORS)(
  'applyAgendaTemplate $key',
  (descriptor: TemplateDescriptor) => {
    it('creates one fresh calendarEvent per declared event', async () => {
      const { client, createdInputs } = buildFakeClient();
      const definition = findAgendaTemplateDefinition(descriptor.key);

      const result = expectApplied(
        await applyResolvedAgendaTemplate(
          client,
          descriptor,
          { key: descriptor.key, operationId: 'operation-1' },
          CONTEXT,
        ),
      );

      expect(createdInputs).toHaveLength(definition?.events.length ?? 0);
      expect(result.created).toHaveLength(definition?.events.length ?? 0);
      expect(
        result.created.every((record) => record.object === 'calendarEvent'),
      ).toBe(true);
      expect(new Set(result.created.map((record) => record.id)).size).toBe(
        result.created.length,
      );
      expect(
        createdInputs.every(
          (input) => input.id.length > 0 && input.startsAt.length > 0,
        ),
      ).toBe(true);
    });
  },
);

describe('applyAgendaTemplate recurrence', () => {
  it('writes recurring series anchors for the team rituals', async () => {
    const { client, createdInputs } = buildFakeClient();
    const descriptor = AGENDA_TEMPLATE_DESCRIPTORS.find(
      (candidate) => candidate.key === 'agenda-rituels-equipe',
    ) as TemplateDescriptor;

    expectApplied(
      await applyResolvedAgendaTemplate(
        client,
        descriptor,
        { key: descriptor.key, operationId: 'rituals' },
        CONTEXT,
      ),
    );

    expect(createdInputs).toHaveLength(2);
    expect(createdInputs[0].recurrenceRule).toBe('FREQ=DAILY');
    expect(createdInputs[0].recurrenceSeriesId).toBe(
      `calendar-series#${createdInputs[0].id}`,
    );
    expect(createdInputs[1].recurrenceRule).toBe('FREQ=WEEKLY;BYDAY=FR');
    // The retro is pinned to the coming Friday, not the anchor Wednesday.
    expect(createdInputs[1].startsAt).toBe('2026-07-17T16:00:00Z');
  });

  it('writes no series columns for a non-recurring skeleton', async () => {
    const { client, createdInputs } = buildFakeClient();
    const descriptor = AGENDA_TEMPLATE_DESCRIPTORS.find(
      (candidate) => candidate.key === 'agenda-planning-equipes',
    ) as TemplateDescriptor;

    expectApplied(
      await applyResolvedAgendaTemplate(
        client,
        descriptor,
        { key: descriptor.key, operationId: 'shifts' },
        CONTEXT,
      ),
    );

    expect(createdInputs).toHaveLength(10);
    expect(
      createdInputs.every((input) => input.recurrenceRule === undefined),
    ).toBe(true);
  });
});

describe('applyAgendaTemplate idempotency', () => {
  const key: AgendaTemplateKey = 'agenda-deroule-evenement';
  const descriptor = AGENDA_TEMPLATE_DESCRIPTORS.find(
    (candidate) => candidate.key === key,
  ) as TemplateDescriptor;

  it('is a no-op when the same operation id is applied twice', async () => {
    const { client, createdInputs } = buildFakeClient();

    const first = expectApplied(
      await applyResolvedAgendaTemplate(
        client,
        descriptor,
        { key, operationId: 'operation-1' },
        CONTEXT,
      ),
    );
    const second = expectApplied(
      await applyResolvedAgendaTemplate(
        client,
        descriptor,
        { key, operationId: 'operation-1' },
        CONTEXT,
      ),
    );

    expect(createdInputs).toHaveLength(6);
    expect(second.created.map((record) => record.id)).toEqual(
      first.created.map((record) => record.id),
    );
  });

  it('mints fresh ids for a different operation id', async () => {
    const { client } = buildFakeClient();

    const first = expectApplied(
      await applyResolvedAgendaTemplate(
        client,
        descriptor,
        { key, operationId: 'operation-1' },
        CONTEXT,
      ),
    );
    const second = expectApplied(
      await applyResolvedAgendaTemplate(
        client,
        descriptor,
        { key, operationId: 'operation-2' },
        CONTEXT,
      ),
    );

    expect(second.created.map((record) => record.id)).not.toEqual(
      first.created.map((record) => record.id),
    );
  });

  it('mints fresh ids and writes again when no operation id is given', async () => {
    const { client, createdInputs } = buildFakeClient();

    const first = expectApplied(
      await applyResolvedAgendaTemplate(client, descriptor, { key }, CONTEXT),
    );
    const second = expectApplied(
      await applyResolvedAgendaTemplate(client, descriptor, { key }, CONTEXT),
    );

    expect(createdInputs).toHaveLength(12);
    expect(second.created.map((record) => record.id)).not.toEqual(
      first.created.map((record) => record.id),
    );
  });

  it('rejects an unknown template key before any write', async () => {
    const { client, createdInputs } = buildFakeClient();

    const result = await applyAgendaTemplateByKey(
      client,
      { key: 'agenda-inconnu', operationId: 'operation-1' },
      CONTEXT,
    );

    expect(result).toEqual({
      status: 'rejected',
      key: 'agenda-inconnu',
      errorCode: 'UNKNOWN_TEMPLATE_KEY',
      message: expect.any(String),
    });
    expect(createdInputs).toHaveLength(0);
  });
});
