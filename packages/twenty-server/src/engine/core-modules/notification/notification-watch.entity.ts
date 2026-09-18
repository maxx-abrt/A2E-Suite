import { ObjectType } from '@nestjs/graphql';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { type NotificationWatchTargetKind } from 'src/engine/core-modules/notification/constants/notification-watch-target-kind.constant';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// One durable (workspace, user, target) subscription row shared by the three
// watchable surfaces (record / document / channel) so a single primitive and a
// single change-event path covers all of them (C5 — no per-surface systems).
// `targetType` for records is the object name singular; `targetId` is the
// record id, and null for workspace-scoped targets like channels.
@Entity({ name: 'notificationWatch', schema: 'core' })
@ObjectType('NotificationWatch')
@Index(
  'IDX_NOTIFICATION_WATCH_USER_ID_TARGET',
  ['userId', 'workspaceId', 'targetKind', 'targetId'],
  {
    unique: true,
  },
)
export class NotificationWatchEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column({ type: 'varchar', nullable: false })
  targetKind: NotificationWatchTargetKind;

  // Registered target id: a record id for records, a channel id for channels,
  // a document id for documents.
  @Column({ type: 'varchar', nullable: true })
  targetId: string | null;
}
