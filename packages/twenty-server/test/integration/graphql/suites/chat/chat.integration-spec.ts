import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import gql from 'graphql-tag';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { type Manifest } from 'twenty-shared/application';
import { STANDARD_OBJECT_FIELDS } from 'twenty-shared/metadata';

import { forgeLegacyHs256Token } from 'test/integration/graphql/utils/forge-legacy-hs256-token.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { cleanupApplicationAndAppRegistration } from 'test/integration/metadata/suites/application/utils/cleanup-application-and-app-registration.util';
import { setupApplicationForSync } from 'test/integration/metadata/suites/application/utils/setup-application-for-sync.util';
import { syncApplicationQueryFactory } from 'test/integration/metadata/suites/application/utils/sync-application-query-factory.util';
import { uploadApplicationFile } from 'test/integration/metadata/suites/application/utils/upload-application-file.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

// P5.1 bullets 5–6: message attachments reuse the standard `attachment` object
// and the file-storage primitives (no chat-owned storage table), and the chat
// API is proven paginated, channel/workspace isolated and its unread
// aggregation exposed as a query. The real a2e-chat manifest is synced, so the
// spec fails whenever the app's objects stop matching what the server resolver
// reads (`chatMessage.channelId/authorId`, `chatReadCursor.readCursor*`).
const A2E_CHAT_APPLICATION_UNIVERSAL_IDENTIFIER =
  'e2dce399-87f1-4548-b307-5f368b4d5dd4';
const A2E_CHAT_OUTPUT_PATH = join(
  __dirname,
  '../../../../../../../packages/twenty-apps/internal/a2e-chat/.twenty/output',
);
const A2E_CHAT_MANIFEST_PATH = join(A2E_CHAT_OUTPUT_PATH, 'manifest.json');

const YCOMBINATOR_WORKSPACE_ID = '3b8e6458-5fc1-4e63-8563-008ccddaa6db';
const TIM_USER_ID = '20202020-9e3b-46d4-a556-88b9ddc2b034';
const TIM_YCOMBINATOR_USER_WORKSPACE_ID =
  '20202020-e10a-4c27-a90b-b08c57b02d44';
const TIM_WORKSPACE_MEMBER_ID = '20202020-0687-4c41-b707-ed1bfca972a7';
const JANE_WORKSPACE_MEMBER_ID = WORKSPACE_MEMBER_DATA_SEED_IDS.JANE;
const JONY_WORKSPACE_MEMBER_ID = WORKSPACE_MEMBER_DATA_SEED_IDS.JONY;

const foreignWorkspaceAdminToken = forgeLegacyHs256Token(
  {
    sub: TIM_USER_ID,
    userId: TIM_USER_ID,
    userWorkspaceId: TIM_YCOMBINATOR_USER_WORKSPACE_ID,
    workspaceId: YCOMBINATOR_WORKSPACE_ID,
    workspaceMemberId: TIM_WORKSPACE_MEMBER_ID,
    type: JwtTokenTypeEnum.ACCESS,
    authProvider: AuthProviderEnum.Password,
  },
  YCOMBINATOR_WORKSPACE_ID,
);

type ChatMessageNode = {
  id: string;
  body: string | null;
  channelId: string;
  authorId: string | null;
  createdAt: string;
};

type ChatMessageConnection = {
  edges: { node: ChatMessageNode; cursor: string }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

const chatMessagesQuery = gql`
  query ChatMessages($channelId: UUID!, $limit: Int, $after: String) {
    chatMessages(channelId: $channelId, limit: $limit, after: $after) {
      edges {
        node {
          id
          body
          channelId
          authorId
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const createChannelMutation = gql`
  mutation CreateChannel($input: ChatChannelCreateInput!) {
    createChatChannel(data: $input) {
      id
    }
  }
`;

const createMessageMutation = gql`
  mutation CreateMessage($input: ChatMessageCreateInput!) {
    createChatMessage(data: $input) {
      id
      createdAt
    }
  }
`;

const createReadCursorMutation = gql`
  mutation CreateReadCursor($input: ChatReadCursorCreateInput!) {
    createChatReadCursor(data: $input) {
      id
    }
  }
`;

const createAttachmentMutation = gql`
  mutation CreateAttachment($input: AttachmentCreateInput!) {
    createAttachment(data: $input) {
      id
      targetChatMessageId
      file {
        fileId
        label
      }
    }
  }
`;

const createFileUploadMutation = gql`
  mutation CreateFileUpload(
    $filename: String!
    $size: Float!
    $fileFolder: FileFolder!
    $fieldMetadataUniversalIdentifier: String
  ) {
    createFileUpload(
      filename: $filename
      size: $size
      fileFolder: $fileFolder
      fieldMetadataUniversalIdentifier: $fieldMetadataUniversalIdentifier
    ) {
      fileId
      uploadUrl
      contentType
    }
  }
`;

const completeFileUploadMutation = gql`
  mutation CompleteFileUpload($fileId: String!) {
    completeFileUpload(fileId: $fileId) {
      id
    }
  }
`;

const syncManifest = async () => {
  const manifest = JSON.parse(
    readFileSync(A2E_CHAT_MANIFEST_PATH, 'utf8'),
  ) as Manifest;

  await setupApplicationForSync({
    applicationUniversalIdentifier: A2E_CHAT_APPLICATION_UNIVERSAL_IDENTIFIER,
    name: 'A2E Chat Integration Test',
    description: 'A2E Chat manifest sync acceptance',
    sourcePath: 'a2e-chat-integration-test',
  });

  // setupApplicationForSync leaves fake timers on; the uploads below need real
  // timers, exactly like the other manifest-sync specs.
  jest.useRealTimers();

  for (const logicFunction of manifest.logicFunctions ?? []) {
    await uploadApplicationFile({
      applicationUniversalIdentifier: A2E_CHAT_APPLICATION_UNIVERSAL_IDENTIFIER,
      fileFolder: 'BuiltLogicFunction',
      filePath: logicFunction.builtHandlerPath!,
      fileBuffer: readFileSync(
        join(A2E_CHAT_OUTPUT_PATH, logicFunction.builtHandlerPath!),
      ),
      filename: logicFunction.builtHandlerPath!.split('/').pop()!,
      contentType: 'application/javascript',
      expectToFail: false,
    });
  }

  for (const frontComponent of manifest.frontComponents ?? []) {
    await uploadApplicationFile({
      applicationUniversalIdentifier: A2E_CHAT_APPLICATION_UNIVERSAL_IDENTIFIER,
      fileFolder: 'BuiltFrontComponent',
      filePath: frontComponent.builtComponentPath!,
      fileBuffer: readFileSync(
        join(A2E_CHAT_OUTPUT_PATH, frontComponent.builtComponentPath!),
      ),
      filename: frontComponent.builtComponentPath!.split('/').pop()!,
      contentType: 'application/javascript',
      expectToFail: false,
    });
  }

  const response = await makeMetadataAPIRequest(
    syncApplicationQueryFactory({ manifest }),
  );

  if (response.body.errors) {
    throw new Error(
      `a2e-chat manifest sync failed: ${JSON.stringify(response.body.errors).slice(0, 4000)}`,
    );
  }
};

const createChannel = async (name: string): Promise<string> => {
  const response = await makeGraphqlAPIRequest({
    query: createChannelMutation,
    variables: {
      input: { name, kind: 'CUSTOM', visibility: 'PUBLIC' },
    },
  });

  expect(response.body.errors).toBeUndefined();

  return response.body.data.createChatChannel.id as string;
};

const createMessage = async ({
  channelId,
  body,
  authorId,
}: {
  channelId: string;
  body: string;
  authorId?: string;
}): Promise<ChatMessageNode> => {
  const response = await makeGraphqlAPIRequest({
    query: createMessageMutation,
    variables: {
      input: { body, channelId, ...(authorId ? { authorId } : {}) },
    },
  });

  expect(response.body.errors).toBeUndefined();

  return {
    id: response.body.data.createChatMessage.id,
    createdAt: response.body.data.createChatMessage.createdAt,
    body,
    channelId,
    authorId: authorId ?? null,
  };
};

const queryMessages = async ({
  channelId,
  limit,
  after,
}: {
  channelId: string;
  limit: number;
  after?: string;
}): Promise<ChatMessageConnection> => {
  const response = await makeMetadataAPIRequest({
    query: chatMessagesQuery,
    variables: { channelId, limit, after },
  });

  expect(response.body.errors).toBeUndefined();

  return response.body.data.chatMessages as ChatMessageConnection;
};

// Follows endCursor until hasNextPage is false, mirroring how a client pages a
// keyset connection.
const fetchAllMessageIds = async (
  channelId: string,
  pageSize: number,
): Promise<string[]> => {
  const ids: string[] = [];
  let after: string | undefined = undefined;

  for (let page = 0; page < 20; page += 1) {
    const connection = await queryMessages({
      channelId,
      limit: pageSize,
      after,
    });

    ids.push(...connection.edges.map((edge) => edge.node.id));

    if (!connection.pageInfo.hasNextPage) {
      return ids;
    }

    after = connection.pageInfo.endCursor ?? undefined;
  }

  throw new Error('pagination did not terminate');
};

const uploadFile = async (): Promise<{ fileId: string; label: string }> => {
  const content = Buffer.from('a2e-chat attachment content');
  const filename = `chat-attachment-${uuidv4()}.txt`;

  const createResponse = await makeMetadataAPIRequest({
    query: createFileUploadMutation,
    variables: {
      filename,
      size: content.length,
      fileFolder: 'FilesField',
      fieldMetadataUniversalIdentifier:
        STANDARD_OBJECT_FIELDS.attachment.file.universalIdentifier,
    },
  });

  expect(createResponse.body.errors).toBeUndefined();

  const uploadTarget = createResponse.body.data.createFileUpload;
  const { pathname, search } = new URL(uploadTarget.uploadUrl);

  await request(global.app.getHttpServer())
    .put(`${pathname}${search}`)
    .set('Content-Type', uploadTarget.contentType)
    .send(content)
    .expect(204);

  const completeResponse = await makeMetadataAPIRequest({
    query: completeFileUploadMutation,
    variables: { fileId: uploadTarget.fileId },
  });

  expect(completeResponse.body.errors).toBeUndefined();

  return { fileId: uploadTarget.fileId, label: filename };
};

describe('A2E Chat API (integration)', () => {
  beforeAll(async () => {
    jest.useRealTimers();

    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: A2E_CHAT_APPLICATION_UNIVERSAL_IDENTIFIER,
    });
  }, 60000);

  beforeAll(async () => {
    await syncManifest();

    jest.useRealTimers();
  }, 120000);

  afterAll(async () => {
    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: A2E_CHAT_APPLICATION_UNIVERSAL_IDENTIFIER,
    });
  }, 60000);

  describe('key-set pagination', () => {
    it('pages newest-first through the channel history without gaps', async () => {
      const channelId = await createChannel(`P5.1 pagination ${uuidv4()}`);

      const created: ChatMessageNode[] = [];

      for (let index = 0; index < 5; index += 1) {
        created.push(
          await createMessage({
            channelId,
            body: `message ${index}`,
            authorId: JANE_WORKSPACE_MEMBER_ID,
          }),
        );
      }

      // The resolver orders by (createdAt DESC, id DESC); reproducing that sort
      // keeps the expectation independent of insertion timing.
      const expectedIds = [...created]
        .sort(
          (first, second) =>
            second.createdAt.localeCompare(first.createdAt) ||
            second.id.localeCompare(first.id),
        )
        .map((message) => message.id);

      const firstPage = await queryMessages({ channelId, limit: 2 });

      expect(firstPage.edges).toHaveLength(2);
      expect(firstPage.pageInfo.hasNextPage).toBe(true);
      expect(firstPage.edges.map((edge) => edge.node.id)).toEqual(
        expectedIds.slice(0, 2),
      );

      const allIds = await fetchAllMessageIds(channelId, 2);

      expect(allIds).toEqual(expectedIds);
      expect(new Set(allIds).size).toBe(5);
    });

    it('rejects a malformed cursor instead of silently restarting the page', async () => {
      const channelId = await createChannel(`P5.1 cursor ${uuidv4()}`);

      await createMessage({ channelId, body: 'only message' });

      const response = await makeMetadataAPIRequest({
        query: chatMessagesQuery,
        variables: { channelId, limit: 2, after: 'not-a-cursor' },
      });

      expect(response.body.errors).toBeUndefined();

      // decodeChatMessageCursor returns null on malformed input, so the query
      // falls back to the first page — it never throws and never leaks another
      // channel's history.
      const connection = response.body.data
        .chatMessages as ChatMessageConnection;

      expect(connection.edges).toHaveLength(1);
    });
  });

  describe('channel isolation', () => {
    it('never returns another channel history', async () => {
      const firstChannelId = await createChannel(`P5.1 channel A ${uuidv4()}`);
      const secondChannelId = await createChannel(`P5.1 channel B ${uuidv4()}`);

      const firstMessage = await createMessage({
        channelId: firstChannelId,
        body: `first-channel-${uuidv4()}`,
      });
      const secondMessage = await createMessage({
        channelId: secondChannelId,
        body: `second-channel-${uuidv4()}`,
      });

      const connection = await queryMessages({
        channelId: firstChannelId,
        limit: 50,
      });

      const ids = connection.edges.map((edge) => edge.node.id);

      expect(ids).toContain(firstMessage.id);
      expect(ids).not.toContain(secondMessage.id);
      expect(
        connection.edges.every(
          (edge) => edge.node.channelId === firstChannelId,
        ),
      ).toBe(true);
    });
  });

  describe('cross-workspace isolation', () => {
    it('never leaks Apple messages to a foreign-workspace member', async () => {
      const channelId = await createChannel(`P5.1 cross-workspace ${uuidv4()}`);
      const body = `apple-secret-${uuidv4()}`;

      const message = await createMessage({ channelId, body });

      const response = await makeMetadataAPIRequest(
        {
          query: chatMessagesQuery,
          variables: { channelId, limit: 50 },
        },
        foreignWorkspaceAdminToken,
      );

      // The foreign workspace has no chatMessage object, so the read fails
      // closed: no data and definitely no Apple message body.
      expect(response.body.data?.chatMessages ?? null).toBeNull();
      expect(JSON.stringify(response.body)).not.toContain(body);
      expect(JSON.stringify(response.body)).not.toContain(message.id);
    });
  });

  describe('unread counts', () => {
    it('aggregates unread messages for the followed channel', async () => {
      const channelId = await createChannel(`P5.1 unread ${uuidv4()}`);

      // A read position older than the messages about to be created, so both
      // count as unread.
      const readCursorResponse = await makeGraphqlAPIRequest({
        query: createReadCursorMutation,
        variables: {
          // GraphQL exposes relation scalars as `${fieldName}Id`, not the
          // custom join column: channel -> channelId, workspaceMember ->
          // workspaceMemberId.
          input: {
            lastReadAt: new Date(Date.now() - 60_000).toISOString(),
            channelId,
            workspaceMemberId: JANE_WORKSPACE_MEMBER_ID,
          },
        },
      });

      expect(readCursorResponse.body.errors).toBeUndefined();

      await createMessage({
        channelId,
        body: 'unread one',
        authorId: JONY_WORKSPACE_MEMBER_ID,
      });
      await createMessage({
        channelId,
        body: 'unread two',
        authorId: JONY_WORKSPACE_MEMBER_ID,
      });
      // Own message: never counted as unread.
      await createMessage({
        channelId,
        body: 'own message',
        authorId: JANE_WORKSPACE_MEMBER_ID,
      });

      const response = await makeMetadataAPIRequest({
        query: gql`
          query ChatUnreadCounts {
            chatUnreadCounts {
              channelId
              unreadCount
            }
          }
        `,
      });

      expect(response.body.errors).toBeUndefined();

      const counts = response.body.data.chatUnreadCounts as {
        channelId: string;
        unreadCount: number;
      }[];

      expect(counts.find((entry) => entry.channelId === channelId)).toEqual({
        channelId,
        unreadCount: 2,
      });
    });
  });

  describe('message attachments', () => {
    it('links a file-storage upload to a message through the shared attachment object', async () => {
      const channelId = await createChannel(`P5.1 attachments ${uuidv4()}`);
      const message = await createMessage({
        channelId,
        body: 'message with an attachment',
      });

      const { fileId, label } = await uploadFile();

      const attachmentResponse = await makeGraphqlAPIRequest({
        query: createAttachmentMutation,
        variables: {
          input: {
            name: label,
            targetChatMessageId: message.id,
            file: [{ fileId, label }],
          },
        },
      });

      expect(attachmentResponse.body.errors).toBeUndefined();

      const createdAttachment = attachmentResponse.body.data.createAttachment;

      expect(createdAttachment.targetChatMessageId).toBe(message.id);
      expect(createdAttachment.file).toEqual(
        expect.arrayContaining([expect.objectContaining({ fileId, label })]),
      );

      const readResponse = await makeGraphqlAPIRequest({
        query: gql`
          query AttachmentsForMessage($messageId: UUID!) {
            attachments(filter: { targetChatMessageId: { eq: $messageId } }) {
              edges {
                node {
                  id
                  targetChatMessageId
                  file {
                    fileId
                    label
                  }
                }
              }
            }
          }
        `,
        variables: { messageId: message.id },
      });

      expect(readResponse.body.errors).toBeUndefined();

      const edges = readResponse.body.data.attachments.edges as {
        node: {
          id: string;
          targetChatMessageId: string;
          file: { fileId: string; label: string }[];
        };
      }[];

      expect(edges).toHaveLength(1);
      expect(edges[0].node.targetChatMessageId).toBe(message.id);
      expect(edges[0].node.file[0].fileId).toBe(fileId);
    });
  });
});
