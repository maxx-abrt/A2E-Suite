import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { randomBytes } from 'crypto';

import { isDefined } from 'twenty-shared/utils';
import { In, Repository, type FindOperator } from 'typeorm';

import { DocumentShareDTO } from 'src/engine/core-modules/document-share/dtos/document-share.dto';
import { DocumentShareEntity } from 'src/engine/core-modules/document-share/document-share.entity';
import {
  DocumentShareException,
  DocumentShareExceptionCode,
} from 'src/engine/core-modules/document-share/document-share.exception';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { resolveRolePermissionConfig } from 'src/engine/twenty-orm/utils/resolve-role-permission-config.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

const SHARE_TOKEN_LENGTH_BYTES = 24;
// Input bounds: a share is a duplication of content, not a storage vector.
const MAX_TITLE_SNAPSHOT_LENGTH = 500;
const MAX_BODY_SNAPSHOT_LENGTH = 1_000_000;
const MAX_CIPHERTEXT_FIELD_LENGTH = 4_000_000;

type DocumentAuthorizationRecord = {
  id: string;
  archivedAt: Date | null;
};

// Workspace-object repositories are untyped for app-defined objects; the
// projection below is what the query selects.
type DocumentWorkspaceRepository = {
  findOne(options: {
    where: { id: string };
    select: { id: true; archivedAt: true };
  }): Promise<DocumentAuthorizationRecord | null>;
  find(options: {
    where: { id: FindOperator<string> };
    select: { id: true };
  }): Promise<DocumentAuthorizationRecord[]>;
};

@Injectable()
export class DocumentShareService {
  constructor(
    // Hostname-free token lookup at guest-request time, before any workspace
    // context exists — the token IS the scoping key.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(DocumentShareEntity)
    private readonly documentShareRepository: Repository<DocumentShareEntity>,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
  ) {}

  private generateShareToken(): string {
    return randomBytes(SHARE_TOKEN_LENGTH_BYTES).toString('base64url');
  }

  // One representation per share: either the plaintext snapshot or the full
  // ciphertext triple, never both and never a partial triple.
  private validateRepresentation({
    bodySnapshot,
    encryptedBody,
    bodyIv,
    bodySalt,
    titleSnapshot,
  }: {
    bodySnapshot: string;
    encryptedBody: string | null;
    bodyIv: string | null;
    bodySalt: string | null;
    titleSnapshot: string;
  }): { bodySnapshot: string | null } {
    const ciphertextFields = [encryptedBody, bodyIv, bodySalt];
    const definedCiphertextCount = ciphertextFields.filter(isDefined).length;

    if (definedCiphertextCount !== 0 && definedCiphertextCount !== 3) {
      throw new DocumentShareException(
        'Passphrase-protected shares require encryptedBody, bodyIv and bodySalt together',
        DocumentShareExceptionCode.DOCUMENT_SHARE_INVALID_INPUT,
      );
    }

    // twenty-shared exposes no string guard in this build; isDefined + length
    // covers the non-empty constraint.
    if (
      definedCiphertextCount === 3 &&
      !ciphertextFields.every((field) => isDefined(field) && field.length > 0)
    ) {
      throw new DocumentShareException(
        'Passphrase-protected shares require non-empty ciphertext fields',
        DocumentShareExceptionCode.DOCUMENT_SHARE_INVALID_INPUT,
      );
    }

    if (titleSnapshot.length > MAX_TITLE_SNAPSHOT_LENGTH) {
      throw new DocumentShareException(
        'titleSnapshot exceeds the maximum length',
        DocumentShareExceptionCode.DOCUMENT_SHARE_INVALID_INPUT,
      );
    }

    if (bodySnapshot.length > MAX_BODY_SNAPSHOT_LENGTH) {
      throw new DocumentShareException(
        'bodySnapshot exceeds the maximum length',
        DocumentShareExceptionCode.DOCUMENT_SHARE_INVALID_INPUT,
      );
    }

    if (
      definedCiphertextCount === 3 &&
      isDefined(encryptedBody) &&
      encryptedBody.length > MAX_CIPHERTEXT_FIELD_LENGTH
    ) {
      throw new DocumentShareException(
        'encryptedBody exceeds the maximum length',
        DocumentShareExceptionCode.DOCUMENT_SHARE_INVALID_INPUT,
      );
    }

    // Ciphertext present ⇒ the plaintext column stays null so plaintext never
    // sits next to its key material, including for caller-supplied values.
    return {
      bodySnapshot: definedCiphertextCount === 3 ? null : bodySnapshot,
    };
  }

  // The workspace repository only enforces caller permissions when the role
  // permission config is resolved from the ambient auth context and passed to
  // getRepository; without it an app-defined object is denied outright (the
  // same pitfall P0.2 fixed in the search provider). Must run inside the
  // workspace context.
  private resolveCallerRolePermissionConfig():
    | RolePermissionConfig
    | undefined {
    const workspaceContext = getWorkspaceContext();

    return (
      resolveRolePermissionConfig({
        authContext: workspaceContext.authContext,
        userWorkspaceRoleMap: workspaceContext.userWorkspaceRoleMap,
        apiKeyRoleMap: workspaceContext.apiKeyRoleMap,
      }) ?? undefined
    );
  }

  // Caller-permissioned read of the shared document. An unknown or unreadable
  // id yields no row (the permission layer filters it out), and any failure
  // (e.g. app not installed) collapses to null so callers fail closed instead
  // of leaking install/authorization state.
  private async findReadableDocument({
    documentRecordId,
  }: {
    documentRecordId: string;
  }): Promise<DocumentAuthorizationRecord | null> {
    try {
      return (await this.workspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const documentRepository =
            this.workspaceOrmManager.getRepository<DocumentWorkspaceRepository>(
              'document',
              this.resolveCallerRolePermissionConfig(),
            );

          return documentRepository.findOne({
            where: { id: documentRecordId },
            select: { id: true, archivedAt: true },
          });
        },
      )) as unknown as DocumentAuthorizationRecord | null;
    } catch {
      return null;
    }
  }

  // Authorization for create: the caller (ambient workspace auth context) must
  // be able to READ the shared document. Under caller permissions an
  // unreadable or unknown id yields no row — both become forbidden, so share
  // creation cannot probe record existence.
  private async assertCallerCanReadDocument({
    documentRecordId,
  }: {
    documentRecordId: string;
  }): Promise<void> {
    const document = await this.findReadableDocument({ documentRecordId });

    if (!isDefined(document)) {
      throw new DocumentShareException(
        'You do not have access to this document',
        DocumentShareExceptionCode.DOCUMENT_SHARE_FORBIDDEN,
      );
    }

    if (isDefined(document.archivedAt)) {
      throw new DocumentShareException(
        'Archived documents cannot be shared',
        DocumentShareExceptionCode.DOCUMENT_SHARE_INVALID_INPUT,
      );
    }
  }

  // Batch equivalent for listings: only ids the caller may read survive, so a
  // share token for a document outside the caller's record rights never leaves
  // the workspace. Empty set on any failure (fail closed).
  private async findReadableDocumentIds({
    documentRecordIds,
  }: {
    documentRecordIds: string[];
  }): Promise<Set<string>> {
    const uniqueIds = [...new Set(documentRecordIds)];

    if (uniqueIds.length === 0) {
      return new Set();
    }

    try {
      const documents =
        (await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
          const documentRepository =
            this.workspaceOrmManager.getRepository<DocumentWorkspaceRepository>(
              'document',
              this.resolveCallerRolePermissionConfig(),
            );

          return documentRepository.find({
            where: { id: In(uniqueIds) },
            select: { id: true },
          });
        })) as unknown as { id: string }[];

      return new Set(documents.map((document) => document.id));
    } catch {
      return new Set();
    }
  }

  // The guest path has no caller, so record-level rights are re-validated
  // against the record's current state: the source must still exist and be
  // unarchived under a system context. A missing object (deleted document or
  // uninstalled app) and an archived document both deny without telling the
  // guest which condition matched.
  private async isSourceDocumentLive({
    documentRecordId,
    workspaceId,
  }: {
    documentRecordId: string;
    workspaceId: string;
  }): Promise<boolean> {
    try {
      const document =
        (await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
          const documentRepository =
            this.workspaceOrmManager.getRepository<DocumentWorkspaceRepository>(
              'document',
              { shouldBypassPermissionChecks: true },
            );

          return documentRepository.findOne({
            where: { id: documentRecordId },
            select: { id: true, archivedAt: true },
          });
        }, buildSystemAuthContext(workspaceId))) as unknown as DocumentAuthorizationRecord | null;

      return isDefined(document) && !isDefined(document.archivedAt);
    } catch {
      return false;
    }
  }

  async createDocumentShare({
    documentRecordId,
    titleSnapshot,
    bodySnapshot,
    encryptedBody,
    bodyIv,
    bodySalt,
    expiresAt,
    workspace,
  }: {
    documentRecordId: string;
    titleSnapshot: string;
    bodySnapshot: string;
    encryptedBody: string | null;
    bodyIv: string | null;
    bodySalt: string | null;
    expiresAt: Date | null;
    workspace: WorkspaceEntity;
  }): Promise<DocumentShareDTO> {
    const { bodySnapshot: validatedBodySnapshot } = this.validateRepresentation(
      {
        titleSnapshot,
        bodySnapshot,
        encryptedBody,
        bodyIv,
        bodySalt,
      },
    );

    await this.assertCallerCanReadDocument({ documentRecordId });

    const existingShare = await this.documentShareRepository.findOne({
      where: {
        workspaceId: workspace.id,
        documentRecordId,
      },
    });

    if (isDefined(existingShare)) {
      throw new DocumentShareException(
        'A share link already exists for this document',
        DocumentShareExceptionCode.DOCUMENT_SHARE_ALREADY_EXISTS,
      );
    }

    const shareToken = this.generateShareToken();

    const createdShare = await this.documentShareRepository.save({
      shareToken,
      documentRecordId,
      titleSnapshot,
      // Ciphertext triple present ⇔ passphrase-protected; when set the body
      // snapshot column stays null so plaintext never sits next to its key.
      bodySnapshot: validatedBodySnapshot,
      encryptedBody,
      bodyIv,
      bodySalt,
      expiresAt,
      workspaceId: workspace.id,
    });

    return this.toDto(createdShare);
  }

  async deleteDocumentShare({
    shareToken,
    workspace,
  }: {
    shareToken: string;
    workspace: WorkspaceEntity;
  }): Promise<void> {
    await this.documentShareRepository.delete({
      shareToken,
      workspaceId: workspace.id,
    });
  }

  async findManyDocumentShares(
    workspaceId: string,
  ): Promise<DocumentShareDTO[]> {
    const shares = await this.documentShareRepository.find({
      where: { workspaceId },
    });

    const readableDocumentIds = await this.findReadableDocumentIds({
      documentRecordIds: shares.map((share) => share.documentRecordId),
    });

    return shares
      .filter((share) => readableDocumentIds.has(share.documentRecordId))
      .map((share) => this.toDto(share));
  }

  private toDto(share: DocumentShareEntity): DocumentShareDTO {
    return {
      id: share.id,
      shareToken: share.shareToken,
      documentRecordId: share.documentRecordId,
      expiresAt: share.expiresAt,
      isPassphraseProtected: isDefined(share.encryptedBody),
      createdAt: share.createdAt,
    };
  }

  // Guest path: resolves the share without any workspace context, enforcing
  // expiry. For passphrase-protected shares only the ciphertext triple is
  // returned — decryption (and therefore verification) happens client-side
  // with the passphrase-derived AES-GCM key.
  async getShareForGuest(shareToken: string): Promise<{
    documentRecordId: string;
    titleSnapshot: string;
    bodySnapshot: string | null;
    encryptedBody: string | null;
    bodyIv: string | null;
    bodySalt: string | null;
    isPassphraseProtected: boolean;
  }> {
    const share = await this.documentShareRepository.findOne({
      where: { shareToken },
    });

    if (!isDefined(share)) {
      throw new DocumentShareException(
        'Share link not found',
        DocumentShareExceptionCode.DOCUMENT_SHARE_NOT_FOUND,
      );
    }

    const isExpired =
      isDefined(share.expiresAt) && share.expiresAt.getTime() < Date.now();

    if (isExpired) {
      throw new DocumentShareException(
        'This share link has expired',
        DocumentShareExceptionCode.DOCUMENT_SHARE_EXPIRED,
      );
    }

    const isSourceLive = await this.isSourceDocumentLive({
      documentRecordId: share.documentRecordId,
      workspaceId: share.workspaceId,
    });

    if (!isSourceLive) {
      throw new DocumentShareException(
        'Share link not found',
        DocumentShareExceptionCode.DOCUMENT_SHARE_NOT_FOUND,
      );
    }

    const isPassphraseProtected = isDefined(share.encryptedBody);

    return {
      documentRecordId: share.documentRecordId,
      titleSnapshot: share.titleSnapshot ?? '',
      // Defense in depth: a protected share never returns plaintext even if a
      // legacy row somehow carries both representations.
      bodySnapshot: isPassphraseProtected ? null : share.bodySnapshot,
      encryptedBody: share.encryptedBody,
      bodyIv: share.bodyIv,
      bodySalt: share.bodySalt,
      isPassphraseProtected,
    };
  }
}
