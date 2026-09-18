import { ObjectType } from '@nestjs/graphql';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// The one durable inbox row every producer funnels into. `type` is stored as a
// free string so a producer can ship a new notification type without a schema
// change; unknown types are simply not preference-configurable.
@Entity({ name: 'notification', schema: 'core' })
@ObjectType('Notification')
@Index('IDX_NOTIFICATION_USER_ID_WORKSPACE_ID_CREATED_AT', [
  'userId',
  'workspaceId',
  'createdAt',
])
@Index('IDX_NOTIFICATION_USER_ID_WORKSPACE_ID_READ_AT', [
  'userId',
  'workspaceId',
  'readAt',
])
export class NotificationEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column({ type: 'varchar', nullable: false })
  type: string;

  @Column('jsonb', { nullable: true })
  payload: Record<string, unknown> | null;

  // Read/archive are per-user lifecycle timestamps, never hard deletes: the
  // inbox can still count and filter them.
  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
}
