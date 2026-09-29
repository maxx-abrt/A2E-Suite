import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// One BYOK provider per (workspace, provider key): the key doubles as the
// config key the registry resolves models under, so two rows with the same
// key could never be disambiguated.
@Entity({ name: 'workspaceAiProvider', schema: 'core' })
@Unique('IDX_WORKSPACE_AI_PROVIDER_WORKSPACE_PROVIDER_UNIQUE', [
  'workspaceId',
  'provider',
])
export class WorkspaceAiProviderEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  provider: string;

  @Column({ type: 'varchar', nullable: false })
  npm: string;

  @Column({ type: 'varchar', nullable: true })
  label: string | null;

  @Column({ type: 'text', nullable: true })
  encryptedApiKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  baseUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  defaultModel: string | null;

  @Column({ type: 'varchar', nullable: true })
  fastModel: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
