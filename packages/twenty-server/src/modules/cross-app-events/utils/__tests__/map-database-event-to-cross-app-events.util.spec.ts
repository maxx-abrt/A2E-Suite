import {
  type ObjectRecordEvent,
  ObjectRecordCreateEvent,
  ObjectRecordDeleteEvent,
  ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import { isCrossAppEventPayload } from 'twenty-shared/cross-app-events';

import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { mapDatabaseEventToCrossAppEvents } from 'src/modules/cross-app-events/utils/map-database-event-to-cross-app-events.util';

const A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';
const A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER =
  'b11a0000-0000-4000-8000-000000000001';

const OCCURRED_AT = '2026-01-01T12:00:00.000Z';

const buildCreateEvent = (record: Record<string, unknown>): ObjectRecordEvent =>
  Object.assign(new ObjectRecordCreateEvent(), {
    recordId: String(record.id),
    workspaceMemberId: 'workspace-member-id',
    userWorkspaceId: 'user-workspace-id',
    properties: { after: record },
  });

const buildUpdateEvent = ({
  recordId,
  before,
  after,
}: {
  recordId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}): ObjectRecordEvent =>
  Object.assign(new ObjectRecordUpdateEvent(), {
    recordId,
    workspaceMemberId: 'workspace-member-id',
    properties: { before, after, updatedFields: ['status'], diff: {} },
  });

const buildDeleteEvent = (record: Record<string, unknown>): ObjectRecordEvent =>
  Object.assign(new ObjectRecordDeleteEvent(), {
    recordId: String(record.id),
    properties: { before: record, after: record, updatedFields: [], diff: {} },
  });

const mapEvents = ({
  objectMetadataNameSingular,
  databaseAction,
  events,
  installedApplications = [A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER],
}: {
  objectMetadataNameSingular: string;
  databaseAction: DatabaseEventAction;
  events: ObjectRecordEvent[];
  installedApplications?: string[];
}) =>
  mapDatabaseEventToCrossAppEvents({
    objectMetadataNameSingular,
    databaseAction,
    workspaceId: 'workspace-id',
    events,
    isApplicationInstalled: (universalIdentifier) =>
      installedApplications.includes(universalIdentifier),
    occurredAt: OCCURRED_AT,
  });

describe('mapDatabaseEventToCrossAppEvents', () => {
  it('maps a document creation onto the contract', () => {
    const [payload] = mapEvents({
      objectMetadataNameSingular: 'document',
      databaseAction: DatabaseEventAction.CREATED,
      events: [
        buildCreateEvent({
          id: 'document-id',
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        }),
      ],
    });

    expect(payload).toEqual(
      expect.objectContaining({
        contractVersion: 1,
        name: 'document.created',
        workspaceId: 'workspace-id',
        objectFamily: 'document',
        action: 'created',
        recordId: 'document-id',
      }),
    );
    expect(payload.actor).toEqual({
      type: 'workspaceMember',
      workspaceMemberId: 'workspace-member-id',
      userWorkspaceId: 'user-workspace-id',
    });
    expect(payload.timestamps).toEqual({
      occurredAt: OCCURRED_AT,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    });
    expect(isCrossAppEventPayload(payload)).toBe(true);
  });

  it('maps an attachment to the file family (ungated)', () => {
    const [payload] = mapEvents({
      objectMetadataNameSingular: 'attachment',
      databaseAction: DatabaseEventAction.CREATED,
      events: [buildCreateEvent({ id: 'attachment-id' })],
      installedApplications: [],
    });

    expect(payload.objectFamily).toBe('file');
    expect(payload.name).toBe('file.created');
  });

  it('promotes a task update reaching done to completed', () => {
    const [payload] = mapEvents({
      objectMetadataNameSingular: 'task',
      databaseAction: DatabaseEventAction.UPDATED,
      events: [
        buildUpdateEvent({
          recordId: 'task-id',
          before: { id: 'task-id', status: 'IN_PROGRESS' },
          after: { id: 'task-id', status: 'DONE' },
        }),
      ],
      installedApplications: [],
    });

    expect(payload.action).toBe('completed');
    expect(payload.name).toBe('task.completed');
  });

  it('keeps a non-completing task update as updated', () => {
    const [payload] = mapEvents({
      objectMetadataNameSingular: 'task',
      databaseAction: DatabaseEventAction.UPDATED,
      events: [
        buildUpdateEvent({
          recordId: 'task-id',
          before: { id: 'task-id', status: 'TODO' },
          after: { id: 'task-id', status: 'IN_PROGRESS' },
        }),
      ],
      installedApplications: [],
    });

    expect(payload.action).toBe('updated');
    expect(payload.name).toBe('task.updated');
  });

  it('maps calendarEvent deletion to deleted', () => {
    const [payload] = mapEvents({
      objectMetadataNameSingular: 'calendarEvent',
      databaseAction: DatabaseEventAction.DELETED,
      events: [buildDeleteEvent({ id: 'event-id' })],
      installedApplications: [],
    });

    expect(payload.name).toBe('calendarEvent.deleted');
    expect(payload.record).toEqual({ id: 'event-id' });
  });

  it('emits nothing for objects outside the contract', () => {
    const payloads = mapEvents({
      objectMetadataNameSingular: 'company',
      databaseAction: DatabaseEventAction.CREATED,
      events: [buildCreateEvent({ id: 'company-id' })],
    });

    expect(payloads).toHaveLength(0);
  });

  it('emits nothing for document when a2e-documents is not installed', () => {
    const payloads = mapEvents({
      objectMetadataNameSingular: 'document',
      databaseAction: DatabaseEventAction.CREATED,
      events: [buildCreateEvent({ id: 'document-id' })],
      installedApplications: [],
    });

    expect(payloads).toHaveLength(0);
  });

  it('keeps invoice dormant until a2e-accounting is installed', () => {
    const dormantPayloads = mapEvents({
      objectMetadataNameSingular: 'invoice',
      databaseAction: DatabaseEventAction.CREATED,
      events: [buildCreateEvent({ id: 'invoice-id' })],
      installedApplications: [],
    });

    expect(dormantPayloads).toHaveLength(0);

    const [wiredPayload] = mapEvents({
      objectMetadataNameSingular: 'invoice',
      databaseAction: DatabaseEventAction.CREATED,
      events: [buildCreateEvent({ id: 'invoice-id' })],
      installedApplications: [A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER],
    });

    expect(wiredPayload.name).toBe('invoice.created');
  });

  it('skips events without a record id', () => {
    const payloads = mapEvents({
      objectMetadataNameSingular: 'task',
      databaseAction: DatabaseEventAction.CREATED,
      events: [buildCreateEvent({ id: '' })],
      installedApplications: [],
    });

    expect(payloads).toHaveLength(0);
  });

  it('marks a system actor when no workspace member is present', () => {
    const event = Object.assign(new ObjectRecordCreateEvent(), {
      recordId: 'task-id',
      properties: { after: { id: 'task-id' } },
    });

    const [payload] = mapEvents({
      objectMetadataNameSingular: 'task',
      databaseAction: DatabaseEventAction.CREATED,
      events: [event],
      installedApplications: [],
    });

    expect(payload.actor).toEqual({ type: 'system' });
  });
});
