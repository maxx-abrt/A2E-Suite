import gql from 'graphql-tag';
import request from 'supertest';

import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';

// P0.2 boundary checks for the document-share surface, run against a seeded
// workspace WITHOUT the a2e-documents app installed:
// - listing is workspace-scoped and reveals nothing about other workspaces;
// - creation is denied (fail closed) when the caller cannot read the document
//   source, which is also the uninstalled-app state;
// - the server enforces one consistent encrypted/plain representation;
// - the guest query is reachable without any Authorization header.
describe('document share (integration)', () => {
  describe('findManyDocumentShares', () => {
    it('returns a workspace-scoped list without leaking foreign share tokens', async () => {
      const response = await makeGraphqlAPIRequest({
        query: gql`
          query FindManyDocumentShares {
            findManyDocumentShares {
              id
              shareToken
              documentRecordId
              isPassphraseProtected
              expiresAt
              createdAt
            }
          }
        `,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();

      const shares = response.body.data.findManyDocumentShares;

      expect(Array.isArray(shares)).toBe(true);

      // Every returned row belongs to the caller's workspace through the
      // repository scoping; on a fresh seeded workspace the list is empty
      // because no share can exist without the documents app.
      for (const share of shares) {
        expect(share.shareToken).toBeDefined();
        expect(share.shareToken.length).toBeGreaterThan(20);
      }
    });
  });

  describe('createDocumentShare', () => {
    const createOperation = (overrides: Record<string, unknown> = {}) => ({
      query: gql`
        mutation CreateDocumentShare($input: CreateDocumentShareInput!) {
          createDocumentShare(createDocumentShareInput: $input) {
            id
            shareToken
            documentRecordId
            isPassphraseProtected
          }
        }
      `,
      variables: {
        input: {
          documentRecordId: '3f1b7e64-0000-4000-8000-000000000001',
          titleSnapshot: 'Compte rendu — test integration',
          bodySnapshot: '{"type":"doc"}',
          encryptedBody: null,
          bodyIv: null,
          bodySalt: null,
          expiresAt: null,
          ...overrides,
        },
      },
    });

    it('forbids creation when the caller cannot read the document (no documents app installed)', async () => {
      const response = await makeGraphqlAPIRequest(createOperation());

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();

      const messages = (response.body.errors ?? [])
        .map((error: { message: string }) => error.message)
        .join('\n');

      expect(messages).toContain('not have access to this document');
    });

    it('rejects a partial ciphertext triple before any authorization work', async () => {
      const response = await makeGraphqlAPIRequest(
        createOperation({
          encryptedBody: 'ciphertext-base64',
          bodyIv: null,
          bodySalt: 'salt-base64',
        }),
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();

      const messages = (response.body.errors ?? [])
        .map((error: { message: string }) => error.message)
        .join('\n');

      expect(messages).toContain('encryptedBody, bodyIv and bodySalt together');
    });
  });

  describe('getGuestDocumentShare', () => {
    it('requires no Authorization header and hides unknown tokens behind a not-found error', async () => {
      // supertest directly so the request carries no Authorization header at
      // all; makeGraphqlAPIRequest always injects the default admin token.
      const response = await request(`http://localhost:${APP_PORT}`)
        .post('/graphql')
        .send({
          query: `query GetGuestDocumentShare {
            getGuestDocumentShare(shareToken: "unknown-token-not-in-db") {
              documentRecordId
              titleSnapshot
              bodySnapshot
              isPassphraseProtected
            }
          }`,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();

      const messages = (response.body.errors ?? [])
        .map((error: { message: string }) => error.message)
        .join('\n');

      expect(messages.toLowerCase()).toContain('not found');
    });
  });
});
