import { buildCrossAppEventPayload } from '@/cross-app-events/build-cross-app-event-payload.util';
import { computeCrossAppEventName } from '@/cross-app-events/compute-cross-app-event-name.util';
import { isCrossAppEventAction } from '@/cross-app-events/is-cross-app-event-action.util';
import { isCrossAppEventObjectFamily } from '@/cross-app-events/is-cross-app-event-object-family.util';
import { isCrossAppEventPayload } from '@/cross-app-events/is-cross-app-event-payload.util';
import { resolveCrossAppEventObjectFamily } from '@/cross-app-events/resolve-cross-app-event-object-family.util';
import {
  CROSS_APP_EVENT_ACTIVATION_APP_BY_FAMILY,
  CROSS_APP_EVENT_CONTRACT_VERSION,
  CROSS_APP_EVENT_OBJECT_FAMILIES,
  CROSS_APP_EVENT_OBJECT_NAME_BY_FAMILY,
} from '@/cross-app-events/cross-app-event-vocabulary.constant';

const buildValidPayload = () =>
  buildCrossAppEventPayload({
    objectFamily: 'document',
    action: 'created',
    workspaceId: 'workspace-id',
    recordId: 'record-id',
    actor: { type: 'workspaceMember', workspaceMemberId: 'member-id' },
    timestamps: {
      occurredAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    record: { id: 'record-id' },
  });

describe('cross-app event contract', () => {
  it('builds a stable family.action name', () => {
    expect(computeCrossAppEventName('calendarEvent', 'completed')).toBe(
      'calendarEvent.completed',
    );
  });

  it('resolves object families, including file -> attachment', () => {
    expect(resolveCrossAppEventObjectFamily('document')).toBe('document');
    expect(resolveCrossAppEventObjectFamily('attachment')).toBe('file');
    expect(resolveCrossAppEventObjectFamily('invoice')).toBe('invoice');
    expect(resolveCrossAppEventObjectFamily('company')).toBeUndefined();
  });

  it('narrows families and actions', () => {
    expect(isCrossAppEventObjectFamily('file')).toBe(true);
    expect(isCrossAppEventObjectFamily('opportunity')).toBe(false);
    expect(isCrossAppEventAction('completed')).toBe(true);
    expect(isCrossAppEventAction('destroyed')).toBe(false);
  });

  it('builds a payload carrying the required contract fields', () => {
    const payload = buildValidPayload();

    expect(payload.contractVersion).toBe(CROSS_APP_EVENT_CONTRACT_VERSION);
    expect(payload.name).toBe('document.created');
    expect(payload.workspaceId).toBe('workspace-id');
    expect(payload.objectFamily).toBe('document');
    expect(payload.action).toBe('created');
    expect(payload.recordId).toBe('record-id');
    expect(payload.actor).toEqual({
      type: 'workspaceMember',
      workspaceMemberId: 'member-id',
    });
    expect(payload.timestamps.occurredAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('accepts a valid payload', () => {
    expect(isCrossAppEventPayload(buildValidPayload())).toBe(true);
  });

  it('rejects payloads whose name does not match family.action', () => {
    expect(
      isCrossAppEventPayload({ ...buildValidPayload(), name: 'task.created' }),
    ).toBe(false);
  });

  it('rejects payloads from an unknown contract version', () => {
    expect(
      isCrossAppEventPayload({ ...buildValidPayload(), contractVersion: 0 }),
    ).toBe(false);
  });

  it('gates only the optional-app families', () => {
    expect(CROSS_APP_EVENT_ACTIVATION_APP_BY_FAMILY).toHaveProperty('document');
    expect(CROSS_APP_EVENT_ACTIVATION_APP_BY_FAMILY).toHaveProperty('invoice');
    expect(CROSS_APP_EVENT_ACTIVATION_APP_BY_FAMILY).not.toHaveProperty('task');
    expect(CROSS_APP_EVENT_ACTIVATION_APP_BY_FAMILY).not.toHaveProperty('file');
  });

  it('maps every family to an object name', () => {
    for (const family of CROSS_APP_EVENT_OBJECT_FAMILIES) {
      expect(CROSS_APP_EVENT_OBJECT_NAME_BY_FAMILY[family]).toBeDefined();
    }
  });
});
