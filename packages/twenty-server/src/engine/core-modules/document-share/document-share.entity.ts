import { ObjectType } from '@nestjs/graphql';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

@Entity({ name: 'documentShare', schema: 'core' })
@ObjectType('DocumentShare')
@Index('IDX_DOCUMENT_SHARE_TOKEN', ['shareToken'])
export class DocumentShareEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'varchar', nullable: false, unique: true })
  shareToken: string;

  @Column({ type: 'uuid', nullable: false })
  documentRecordId: string;

  // Snapshot of the shared body, never a live relation: guests hold no
  // workspace/auth context, so the share carries its own copy.
  @Column({ type: 'text', nullable: true })
  titleSnapshot: string | null;

  @Column({ type: 'text', nullable: true })
  bodySnapshot: string | null;

  // Passphrase-protected shares store AES-GCM ciphertext only (client-side
  // key derivation per the Bureau pattern): the passphrase never reaches the
  // server, and the GCM auth tag is the verification.
  @Column({ type: 'text', nullable: true })
  encryptedBody: string | null;

  @Column({ type: 'varchar', nullable: true })
  bodyIv: string | null;

  @Column({ type: 'varchar', nullable: true })
  bodySalt: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;
}
