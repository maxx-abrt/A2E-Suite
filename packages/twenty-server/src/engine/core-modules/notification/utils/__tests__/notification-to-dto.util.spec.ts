import { type NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { toNotificationDTO } from 'src/engine/core-modules/notification/utils/notification-to-dto.util';

describe('toNotificationDTO', () => {
  it('projects only the per-user lifecycle fields', () => {
    const dto = toNotificationDTO({
      id: 'notification-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      type: 'ASSIGNED',
      payload: { objectNameSingular: 'task', recordId: 'task-1' },
      readAt: null,
      archivedAt: null,
      createdAt: new Date('2026-09-18T09:00:00.000Z'),
      updatedAt: new Date('2026-09-18T09:00:00.000Z'),
    } as unknown as NotificationEntity);

    expect(dto).toEqual({
      id: 'notification-1',
      type: 'ASSIGNED',
      payload: { objectNameSingular: 'task', recordId: 'task-1' },
      createdAt: new Date('2026-09-18T09:00:00.000Z'),
      readAt: null,
      archivedAt: null,
    });
  });

  it('keeps null payloads and archive timestamps', () => {
    const dto = toNotificationDTO({
      id: 'notification-2',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      type: 'SYSTEM',
      payload: null,
      readAt: new Date('2026-09-18T10:00:00.000Z'),
      archivedAt: new Date('2026-09-18T11:00:00.000Z'),
      createdAt: new Date('2026-09-18T09:00:00.000Z'),
      updatedAt: new Date('2026-09-18T11:00:00.000Z'),
    } as unknown as NotificationEntity);

    expect(dto.payload).toBeNull();
    expect(dto.readAt).toEqual(new Date('2026-09-18T10:00:00.000Z'));
    expect(dto.archivedAt).toEqual(new Date('2026-09-18T11:00:00.000Z'));
  });
});
