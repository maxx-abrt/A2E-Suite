import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { randomBytes } from 'crypto';

import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { DocumentShareDTO } from 'src/engine/core-modules/document-share/dtos/document-share.dto';
import { DocumentShareEntity } from 'src/engine/core-modules/document-share/document-share.entity';
import {
  DocumentShareException,
  DocumentShareExceptionCode,
} from 'src/engine/core-modules/document-share/document-share.exception';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

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

  // Authorization for create: the caller (ambient workspace auth context) must
  // be able to READ the shared document. Under caller permissions an
  // unreadable or unknown id yields no row — both become forbidden, so share
  // creation cannot probe record existence.
  private async assertCallerCanReadDocument({
    documentRecordId,
  }: {
    documentRecordId: string;
  }): Promise<void> {
    let document: DocumentAuthorizationRecord | null;

    try {
      document = (await this.workspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const documentRepository =
            this.workspaceOrmManager.getRepository<DocumentWorkspaceRepository>(
              'document',
            );

          return documentRepository.findOne({
            where: { id: documentRecordId },
            select: { id: true, archivedAt: true },
          });
        },
      )) as unknown as DocumentAuthorizationRecord | null;
    } catch {
      // Fail closed: an unreadable document source (e.g. app not installed)
      // must not degrade into a server error that leaks install state.
      document = null;
    }

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
    const { bodySnapshot: validatedBodySnapshot } =
      this.validateRepresentation({
        titleSnapshot,
        bodySnapshot,
        encryptedBody,
        bodyIv,
        bodySalt,
      });

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

    return shares.map((share) => this.toDto(share));
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
