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

const SHARE_TOKEN_LENGTH_BYTES = 24;

@Injectable()
export class DocumentShareService {
  constructor(
    // Hostname-free token lookup at guest-request time, before any workspace
    // context exists — the token IS the scoping key.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(DocumentShareEntity)
    private readonly documentShareRepository: Repository<DocumentShareEntity>,
  ) {}

  private generateShareToken(): string {
    return randomBytes(SHARE_TOKEN_LENGTH_BYTES).toString('base64url');
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
      bodySnapshot,
      // Ciphertext triple present ⇔ passphrase-protected; when set the body
      // snapshot column stays null so plaintext never sits next to its key.
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

    return {
      documentRecordId: share.documentRecordId,
      titleSnapshot: share.titleSnapshot ?? '',
      bodySnapshot: share.bodySnapshot,
      encryptedBody: share.encryptedBody,
      bodyIv: share.bodyIv,
      bodySalt: share.bodySalt,
      isPassphraseProtected: isDefined(share.encryptedBody),
    };
  }
}
