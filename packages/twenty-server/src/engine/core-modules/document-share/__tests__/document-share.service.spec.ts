import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DocumentShareService } from 'src/engine/core-modules/document-share/document-share.service';
import { DocumentShareEntity } from 'src/engine/core-modules/document-share/document-share.entity';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

describe('DocumentShareService', () => {
  let service: DocumentShareService;

  const repositoryFindOne = jest.fn();
  const repositoryFind = jest.fn();
  const repositorySave = jest.fn();
  const repositoryDelete = jest.fn();

  const workspaceOrmManagerFindOne = jest.fn();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentShareService,
        {
          provide: getRepositoryToken(DocumentShareEntity),
          useValue: {
            findOne: repositoryFindOne,
            find: repositoryFind,
            save: repositorySave,
            delete: repositoryDelete,
          },
        },
        {
          provide: WorkspaceOrmManager,
          useValue: {
            executeInWorkspaceContext: (fn: () => Promise<unknown>) => fn(),
            getRepository: () => ({
              findOne: workspaceOrmManagerFindOne,
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(DocumentShareService);

    repositoryFindOne.mockReset();
    repositoryFind.mockReset();
    repositorySave.mockReset();
    repositoryDelete.mockReset();
    workspaceOrmManagerFindOne.mockReset();
  });

  const workspace = { id: 'workspace-1' } as never;
  const readableDocument = { id: 'doc-1', archivedAt: null };

  beforeEach(() => {
    // Default: the caller can read the shared document.
    workspaceOrmManagerFindOne.mockResolvedValue(readableDocument);
  });

  it('should create a plaintext share and derive the protected flag from ciphertext presence', async () => {
    repositoryFindOne.mockResolvedValue(null);
    repositorySave.mockImplementation(async (entity) => entity);

    const share = await service.createDocumentShare({
      documentRecordId: 'doc-1',
      titleSnapshot: 'Compte rendu',
      bodySnapshot: '{"type":"doc"}',
      encryptedBody: null,
      bodyIv: null,
      bodySalt: null,
      expiresAt: null,
      workspace,
    });

    expect(share.isPassphraseProtected).toBe(false);
    expect(share.shareToken.length).toBeGreaterThan(20);
    expect(repositorySave).toHaveBeenCalledWith(
      expect.objectContaining({
        documentRecordId: 'doc-1',
        workspaceId: 'workspace-1',
        bodySnapshot: '{"type":"doc"}',
      }),
    );
  });

  it('should create a passphrase-protected share storing only the ciphertext triple', async () => {
    repositoryFindOne.mockResolvedValue(null);
    repositorySave.mockImplementation(async (entity) => entity);

    const share = await service.createDocumentShare({
      documentRecordId: 'doc-1',
      titleSnapshot: 'Compte rendu',
      bodySnapshot: '',
      encryptedBody: 'ciphertext-base64',
      bodyIv: 'iv-base64',
      bodySalt: 'salt-base64',
      expiresAt: null,
      workspace,
    });

    expect(share.isPassphraseProtected).toBe(true);

    const savedEntity = repositorySave.mock.calls[0][0];

    // No cleartext next to the key material, even if the caller posted some.
    expect(savedEntity.bodySnapshot).toBeNull();
    expect(savedEntity.encryptedBody).toBe('ciphertext-base64');
  });

  it('should null a caller-supplied plaintext body when the ciphertext triple is complete', async () => {
    repositoryFindOne.mockResolvedValue(null);
    repositorySave.mockImplementation(async (entity) => entity);

    await service.createDocumentShare({
      documentRecordId: 'doc-1',
      titleSnapshot: 'Compte rendu',
      bodySnapshot: 'plaintext-that-must-not-be-stored',
      encryptedBody: 'ciphertext-base64',
      bodyIv: 'iv-base64',
      bodySalt: 'salt-base64',
      expiresAt: null,
      workspace,
    });

    expect(repositorySave.mock.calls[0][0].bodySnapshot).toBeNull();
  });

  it('should reject a partial ciphertext triple', async () => {
    repositoryFindOne.mockResolvedValue(null);

    await expect(
      service.createDocumentShare({
        documentRecordId: 'doc-1',
        titleSnapshot: 'Compte rendu',
        bodySnapshot: '',
        encryptedBody: 'ciphertext-base64',
        bodyIv: null,
        bodySalt: 'salt-base64',
        expiresAt: null,
        workspace,
      }),
    ).rejects.toThrow(
      'Passphrase-protected shares require encryptedBody, bodyIv and bodySalt together',
    );

    expect(repositorySave).not.toHaveBeenCalled();
  });

  it('should reject a share whose body snapshot exceeds the length bound', async () => {
    repositoryFindOne.mockResolvedValue(null);

    await expect(
      service.createDocumentShare({
        documentRecordId: 'doc-1',
        titleSnapshot: 'Compte rendu',
        bodySnapshot: 'x'.repeat(1_000_001),
        encryptedBody: null,
        bodyIv: null,
        bodySalt: null,
        expiresAt: null,
        workspace,
      }),
    ).rejects.toThrow('bodySnapshot exceeds the maximum length');

    expect(repositorySave).not.toHaveBeenCalled();
  });

  it('should forbid share creation when the caller cannot read the document', async () => {
    // Caller permissions filter the row out entirely (unknown or unreadable).
    workspaceOrmManagerFindOne.mockResolvedValue(null);
    repositoryFindOne.mockResolvedValue(null);

    await expect(
      service.createDocumentShare({
        documentRecordId: 'hidden-doc',
        titleSnapshot: 'Compte rendu',
        bodySnapshot: '',
        encryptedBody: null,
        bodyIv: null,
        bodySalt: null,
        expiresAt: null,
        workspace,
      }),
    ).rejects.toThrow('You do not have access to this document');

    expect(repositorySave).not.toHaveBeenCalled();
  });

  it('should forbid share creation when the document lookup fails (fail closed)', async () => {
    workspaceOrmManagerFindOne.mockRejectedValue(
      new Error('Object "document" does not exist in this workspace'),
    );
    repositoryFindOne.mockResolvedValue(null);

    await expect(
      service.createDocumentShare({
        documentRecordId: 'doc-1',
        titleSnapshot: 'Compte rendu',
        bodySnapshot: '',
        encryptedBody: null,
        bodyIv: null,
        bodySalt: null,
        expiresAt: null,
        workspace,
      }),
    ).rejects.toThrow('You do not have access to this document');

    expect(repositorySave).not.toHaveBeenCalled();
  });

  it('should reject a share for an archived document', async () => {
    workspaceOrmManagerFindOne.mockResolvedValue({
      id: 'doc-1',
      archivedAt: new Date('2026-01-01T00:00:00Z'),
    });
    repositoryFindOne.mockResolvedValue(null);

    await expect(
      service.createDocumentShare({
        documentRecordId: 'doc-1',
        titleSnapshot: 'Compte rendu',
        bodySnapshot: '',
        encryptedBody: null,
        bodyIv: null,
        bodySalt: null,
        expiresAt: null,
        workspace,
      }),
    ).rejects.toThrow('Archived documents cannot be shared');

    expect(repositorySave).not.toHaveBeenCalled();
  });

  it('should run the document lookup without permission bypass', async () => {
    repositoryFindOne.mockResolvedValue(null);
    repositorySave.mockImplementation(async (entity) => entity);

    await service.createDocumentShare({
      documentRecordId: 'doc-1',
      titleSnapshot: 'Compte rendu',
      bodySnapshot: '',
      encryptedBody: null,
      bodyIv: null,
      bodySalt: null,
      expiresAt: null,
      workspace,
    });

    expect(workspaceOrmManagerFindOne).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      select: { id: true, archivedAt: true },
    });
  });

  it('should reject a duplicate share for the same document', async () => {
    repositoryFindOne.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createDocumentShare({
        documentRecordId: 'doc-1',
        titleSnapshot: 'Compte rendu',
        bodySnapshot: '',
        encryptedBody: null,
        bodyIv: null,
        bodySalt: null,
        expiresAt: null,
        workspace,
      }),
    ).rejects.toThrow('A share link already exists for this document');
  });

  it('should throw DOCUMENT_SHARE_EXPIRED for expired shares on the guest path', async () => {
    repositoryFindOne.mockResolvedValue({
      shareToken: 'token',
      documentRecordId: 'doc-1',
      titleSnapshot: 'Compte rendu',
      bodySnapshot: '{"type":"doc"}',
      encryptedBody: null,
      bodyIv: null,
      bodySalt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.getShareForGuest('token')).rejects.toThrow(
      'This share link has expired',
    );
  });

  it('should return the guest payload including the ciphertext triple', async () => {
    repositoryFindOne.mockResolvedValue({
      shareToken: 'token',
      documentRecordId: 'doc-1',
      titleSnapshot: 'Compte rendu',
      bodySnapshot: null,
      encryptedBody: 'ciphertext-base64',
      bodyIv: 'iv-base64',
      bodySalt: 'salt-base64',
      expiresAt: null,
    });

    const guestShare = await service.getShareForGuest('token');

    expect(guestShare.isPassphraseProtected).toBe(true);
    expect(guestShare.encryptedBody).toBe('ciphertext-base64');
    expect(guestShare.bodyIv).toBe('iv-base64');
    expect(guestShare.bodySalt).toBe('salt-base64');
  });

  it('should never return plaintext on the guest path of a protected share', async () => {
    repositoryFindOne.mockResolvedValue({
      shareToken: 'token',
      documentRecordId: 'doc-1',
      titleSnapshot: 'Compte rendu',
      // Legacy row that carries both representations.
      bodySnapshot: 'plaintext-leak',
      encryptedBody: 'ciphertext-base64',
      bodyIv: 'iv-base64',
      bodySalt: 'salt-base64',
      expiresAt: null,
    });

    const guestShare = await service.getShareForGuest('token');

    expect(guestShare.bodySnapshot).toBeNull();
    expect(guestShare.encryptedBody).toBe('ciphertext-base64');
  });

  it('should throw DOCUMENT_SHARE_NOT_FOUND for unknown tokens', async () => {
    repositoryFindOne.mockResolvedValue(null);

    await expect(service.getShareForGuest('missing')).rejects.toThrow(
      'Share link not found',
    );
  });

  it('should scope deletes to the workspace', async () => {
    repositoryDelete.mockResolvedValue({ affected: 1 });

    await service.deleteDocumentShare({
      shareToken: 'token',
      workspace,
    });

    expect(repositoryDelete).toHaveBeenCalledWith({
      shareToken: 'token',
      workspaceId: 'workspace-1',
    });
  });

  it('should scope listings to the workspace', async () => {
    repositoryFind.mockResolvedValue([
      {
        id: 'share-1',
        shareToken: 'token-1',
        documentRecordId: 'doc-1',
        expiresAt: null,
        encryptedBody: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    const shares = await service.findManyDocumentShares('workspace-1');

    expect(repositoryFind).toHaveBeenCalledWith({
      where: { workspaceId: 'workspace-1' },
    });
    expect(shares).toHaveLength(1);
    expect(shares[0].shareToken).toBe('token-1');
    expect(shares[0].isPassphraseProtected).toBe(false);
  });
});
