import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DocumentShareService } from 'src/engine/core-modules/document-share/document-share.service';
import { DocumentShareEntity } from 'src/engine/core-modules/document-share/document-share.entity';

describe('DocumentShareService', () => {
  let service: DocumentShareService;

  const repositoryFindOne = jest.fn();
  const repositoryFind = jest.fn();
  const repositorySave = jest.fn();
  const repositoryDelete = jest.fn();

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
      ],
    }).compile();

    service = moduleRef.get(DocumentShareService);

    repositoryFindOne.mockReset();
    repositoryFind.mockReset();
    repositorySave.mockReset();
    repositoryDelete.mockReset();
  });

  const workspace = { id: 'workspace-1' } as never;

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

    // No cleartext next to the key material.
    expect(savedEntity.bodySnapshot).toBe('');
    expect(savedEntity.encryptedBody).toBe('ciphertext-base64');
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
});
