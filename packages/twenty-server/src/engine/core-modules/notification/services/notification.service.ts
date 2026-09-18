import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, IsNull, type Repository } from 'typeorm';

import { KeyValuePairType } from 'src/engine/core-modules/key-value-pair/key-value-pair.entity';
import { KeyValuePairService } from 'src/engine/core-modules/key-value-pair/key-value-pair.service';
import { NOTIFICATION_REQUESTED } from 'src/engine/core-modules/notification/constants/notification-event-name.constant';
import { NOTIFICATION_EMAIL_DIGEST_WINDOW_MS } from 'src/engine/core-modules/notification/constants/notification-policy.constant';
import { NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { type NotificationDispatchResult } from 'src/engine/core-modules/notification/types/notification-dispatch-result.type';
import { type NotificationPreferences } from 'src/engine/core-modules/notification/types/notification-preferences.type';
import { type NotificationRequest } from 'src/engine/core-modules/notification/types/notification-request.type';
import {
  groupNotificationsIntoDigestBatches,
  type NotificationDigestItem,
} from 'src/engine/core-modules/notification/utils/group-notifications-into-digest-batches.util';
import { isWithinQuietHours } from 'src/engine/core-modules/notification/utils/is-within-quiet-hours.util';
import { normalizeNotificationPreferences } from 'src/engine/core-modules/notification/utils/normalize-notification-preferences.util';
import { resolveNotificationChannel } from 'src/engine/core-modules/notification/utils/resolve-notification-channel.util';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';

const NOTIFICATION_PREFERENCES_KEY = 'notification-preferences';

// One user-level row holds the whole per-type channel model and quiet-hours
// policy, so a preference read is a single point lookup and no schema change is
// needed to add a preference field (normalization drops anything unknown).
type NotificationPreferenceKeyValueTypeMap = {
  [key: string]: NotificationPreferences;
};

@Injectable()
export class NotificationService {
  constructor(
    // Core-schema table read/written by (workspaceId, userId) from an event
    // listener with no ambient workspace ORM context, like documentShare.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly keyValuePairService: KeyValuePairService<NotificationPreferenceKeyValueTypeMap>,
    private readonly workspaceEventEmitter: WorkspaceEventEmitter,
  ) {}

  // The single producer seam: apps emit a notification request instead of
  // writing rows, so channel preferences, quiet hours and digest batching stay
  // owned by one service for every producer (C5 — no per-app systems).
  requestNotifications({
    workspaceId,
    requests,
  }: {
    workspaceId: string;
    requests: NotificationRequest[];
  }): void {
    this.workspaceEventEmitter.emitCustomBatchEvent<NotificationRequest>(
      NOTIFICATION_REQUESTED,
      requests,
      workspaceId,
    );
  }

  async dispatchNotifications({
    workspaceId,
    requests,
    now = new Date(),
  }: {
    workspaceId: string;
    requests: NotificationRequest[];
    now?: Date;
  }): Promise<NotificationDispatchResult> {
    const preferencesByUserId = new Map<string, NotificationPreferences>();

    for (const request of requests) {
      if (!preferencesByUserId.has(request.userId)) {
        preferencesByUserId.set(
          request.userId,
          await this.getPreferences(request.userId),
        );
      }
    }

    const inboxRowsToCreate: NotificationEntity[] = [];
    const emailCandidates: NotificationDigestItem[] = [];
    let skippedByPreference = 0;

    for (const request of requests) {
      const preferences = this.resolvePreferences(
        preferencesByUserId,
        request.userId,
      );
      const channel = resolveNotificationChannel({
        preferences,
        type: request.type,
      });
      const createdAt = request.createdAt ?? now;

      if (channel === 'NONE') {
        skippedByPreference += 1;
        continue;
      }

      if (channel === 'EMAIL') {
        emailCandidates.push({
          userId: request.userId,
          type: request.type,
          payload: request.payload,
          createdAt,
        });
        continue;
      }

      inboxRowsToCreate.push(
        this.notificationRepository.create({
          workspaceId,
          userId: request.userId,
          type: request.type,
          payload: request.payload ?? null,
          createdAt,
        }),
      );
    }

    const inboxNotifications =
      inboxRowsToCreate.length > 0
        ? await this.notificationRepository.save(inboxRowsToCreate)
        : [];

    const { emailDigestBatches, suppressedByQuietHours } =
      this.planEmailDigests({
        emailCandidates,
        preferencesByUserId,
      });

    return {
      inboxNotifications,
      emailDigestBatches,
      suppressedByQuietHours,
      skippedByPreference,
    };
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    // get() returns full KeyValuePair rows (payload nested under `value`),
    // though its generic signature types rows as bare payloads.
    const [storedPreferenceRow] = (await this.keyValuePairService.get({
      type: KeyValuePairType.USER_VARIABLE,
      userId,
      workspaceId: null,
      key: NOTIFICATION_PREFERENCES_KEY,
    })) as unknown as Array<
      { value: NotificationPreferences | null } | undefined
    >;

    return normalizeNotificationPreferences(storedPreferenceRow?.value ?? null);
  }

  async updatePreferences({
    userId,
    preferences,
  }: {
    userId: string;
    preferences: Partial<NotificationPreferences>;
  }): Promise<NotificationPreferences> {
    const normalizedPreferences = normalizeNotificationPreferences(preferences);

    await this.keyValuePairService.set({
      type: KeyValuePairType.USER_VARIABLE,
      userId,
      workspaceId: null,
      key: NOTIFICATION_PREFERENCES_KEY,
      value: normalizedPreferences,
    });

    return normalizedPreferences;
  }

  async findForUser({
    workspaceId,
    userId,
    includeArchived = false,
  }: {
    workspaceId: string;
    userId: string;
    includeArchived?: boolean;
  }): Promise<NotificationEntity[]> {
    return this.notificationRepository.find({
      where: {
        workspaceId,
        userId,
        ...(includeArchived ? {} : { archivedAt: IsNull() }),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async countUnread({
    workspaceId,
    userId,
  }: {
    workspaceId: string;
    userId: string;
  }): Promise<number> {
    return this.notificationRepository.count({
      where: { workspaceId, userId, readAt: IsNull(), archivedAt: IsNull() },
    });
  }

  async markAsRead({
    workspaceId,
    userId,
    notificationIds,
  }: {
    workspaceId: string;
    userId: string;
    notificationIds: string[];
  }): Promise<number> {
    if (notificationIds.length === 0) {
      return 0;
    }

    const { affected } = await this.notificationRepository.update(
      {
        id: In(notificationIds),
        workspaceId,
        userId,
        readAt: IsNull(),
      },
      { readAt: new Date() },
    );

    return affected ?? 0;
  }

  async archiveNotification({
    workspaceId,
    userId,
    notificationId,
  }: {
    workspaceId: string;
    userId: string;
    notificationId: string;
  }): Promise<void> {
    await this.archiveNotifications({
      workspaceId,
      userId,
      notificationIds: [notificationId],
    });
  }

  async archiveNotifications({
    workspaceId,
    userId,
    notificationIds,
  }: {
    workspaceId: string;
    userId: string;
    notificationIds: string[];
  }): Promise<number> {
    if (notificationIds.length === 0) {
      return 0;
    }

    const { affected } = await this.notificationRepository.update(
      {
        id: In(notificationIds),
        workspaceId,
        userId,
        archivedAt: IsNull(),
      },
      { archivedAt: new Date() },
    );

    return affected ?? 0;
  }

  private resolvePreferences(
    preferencesByUserId: Map<string, NotificationPreferences>,
    userId: string,
  ): NotificationPreferences {
    return (
      preferencesByUserId.get(userId) ?? normalizeNotificationPreferences(null)
    );
  }

  private planEmailDigests({
    emailCandidates,
    preferencesByUserId,
  }: {
    emailCandidates: NotificationDigestItem[];
    preferencesByUserId: Map<string, NotificationPreferences>;
  }): {
    emailDigestBatches: ReturnType<typeof groupNotificationsIntoDigestBatches>;
    suppressedByQuietHours: number;
  } {
    const deliverableCandidates: NotificationDigestItem[] = [];
    let suppressedByQuietHours = 0;

    for (const candidate of emailCandidates) {
      const preferences = this.resolvePreferences(
        preferencesByUserId,
        candidate.userId,
      );

      if (
        isWithinQuietHours({
          date: candidate.createdAt,
          quietHours: preferences.quietHours,
        })
      ) {
        suppressedByQuietHours += 1;
        continue;
      }

      deliverableCandidates.push(candidate);
    }

    return {
      emailDigestBatches: groupNotificationsIntoDigestBatches({
        items: deliverableCandidates,
        windowMs: NOTIFICATION_EMAIL_DIGEST_WINDOW_MS,
      }),
      suppressedByQuietHours,
    };
  }
}
