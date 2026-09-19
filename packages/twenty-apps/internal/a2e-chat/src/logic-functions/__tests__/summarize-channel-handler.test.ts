import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summarizeChannel } from '../handlers/summarize-channel-handler.ts';
import {
  buildChannel,
  buildChannelMemberEdge,
  buildFakeClient,
  buildMessage,
  buildMessagesResponse,
  findQuery,
} from './chat-tool-test-fixtures.ts';

// Contract with the Core API: the caller-context `chatChannel` query returns
// the channel or `null`, and `chatMessages` returns a newest-first page. A
// private channel without the caller as member is refused by the explicit
// re-assert even if the read path let it through.

test('a readable channel yields the chronological transcript and stats', async () => {
  const { client, calls } = buildFakeClient({
    chatChannel: buildChannel(),
    chatMessages: buildMessagesResponse(
      [
        buildMessage({
          id: 'message-2',
          body: 'Ça avance',
          createdAt: '2026-09-19T09:30:00.000Z',
          reactions: { edges: [{ node: { emoji: '👍' } }] },
        }),
        buildMessage({ id: 'message-1' }),
      ],
      true,
    ),
  });

  const result = await summarizeChannel(
    { channelId: 'channel-1', maxMessages: 2, callerWorkspaceMemberId: 'wm1' },
    client,
  );

  assert.equal(result.status, 'SUMMARIZED');
  assert.deepEqual(result.channel, {
    id: 'channel-1',
    name: 'Général',
    kind: 'WORKSPACE',
    visibility: 'PUBLIC',
    topic: null,
  });
  assert.equal(result.messageCount, 2);
  assert.equal(result.truncated, true);
  assert.deepEqual(
    result.messages.map((message) => message.id),
    ['message-1', 'message-2'],
  );
  assert.equal(result.messages[0].authorName, 'Ada Lovelace');
  assert.deepEqual(result.participants, [
    { authorId: 'wm1', authorName: 'Ada Lovelace', messageCount: 2 },
  ]);
  assert.deepEqual(result.reactions, [{ emoji: '👍', count: 1 }]);
  assert.deepEqual(findQuery(calls, 'chatMessages')?.args, {
    filter: { channelId: { eq: 'channel-1' } },
    orderBy: [{ createdAt: 'DescNullsLast' }, { id: 'Desc' }],
    first: 2,
  });
});

test('an empty channel is implemented, with an empty payload', async () => {
  const { client } = buildFakeClient({
    chatChannel: buildChannel(),
    chatMessages: buildMessagesResponse([]),
  });

  const result = await summarizeChannel({ channelId: 'channel-1' }, client);

  assert.deepEqual(result, {
    status: 'SUMMARIZED',
    channelId: 'channel-1',
    channel: {
      id: 'channel-1',
      name: 'Général',
      kind: 'WORKSPACE',
      visibility: 'PUBLIC',
      topic: null,
    },
    threadParentId: null,
    messageCount: 0,
    truncated: false,
    messages: [],
    participants: [],
    reactions: [],
  });
});

test('a private channel denies a non-member and reads no message', async () => {
  const { client, calls } = buildFakeClient({
    chatChannel: buildChannel({
      visibility: 'PRIVATE',
      members: { edges: [buildChannelMemberEdge('wm-other')] },
    }),
  });

  const result = await summarizeChannel(
    { channelId: 'channel-1', callerWorkspaceMemberId: 'wm1' },
    client,
  );

  assert.equal(result.status, 'CHANNEL_FORBIDDEN');
  assert.equal(result.channel, null);
  assert.deepEqual(result.messages, []);
  assert.equal(findQuery(calls, 'chatMessages'), undefined);
});

test('a private channel is readable by one of its members', async () => {
  const { client } = buildFakeClient({
    chatChannel: buildChannel({
      visibility: 'PRIVATE',
      members: { edges: [buildChannelMemberEdge('wm1')] },
    }),
    chatMessages: buildMessagesResponse([buildMessage()]),
  });

  const result = await summarizeChannel(
    { channelId: 'channel-1', callerWorkspaceMemberId: 'wm1' },
    client,
  );

  assert.equal(result.status, 'SUMMARIZED');
  assert.equal(result.messageCount, 1);
});

test('a missing or unauthorized channel fails closed', async () => {
  const { client } = buildFakeClient({ chatChannel: null });

  const result = await summarizeChannel({ channelId: 'channel-1' }, client);

  assert.equal(result.status, 'CHANNEL_NOT_FOUND');
  assert.deepEqual(result.messages, []);
});

test('a blank channelId is refused before any read', async () => {
  const { client, calls } = buildFakeClient({});

  const result = await summarizeChannel({ channelId: '   ' }, client);

  assert.equal(result.status, 'INVALID_INPUT');
  assert.equal(result.channelId, '');
  assert.deepEqual(calls, []);
});

test('a provided-but-blank threadParentId is refused', async () => {
  const { client, calls } = buildFakeClient({});

  const result = await summarizeChannel(
    { channelId: 'channel-1', threadParentId: '  ' },
    client,
  );

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(calls, []);
});

test('threadParentId scopes the message read to one thread', async () => {
  const { client, calls } = buildFakeClient({
    chatChannel: buildChannel(),
    chatMessages: buildMessagesResponse([buildMessage()]),
  });

  const result = await summarizeChannel(
    {
      channelId: 'channel-1',
      threadParentId: ' parent-1 ',
      callerWorkspaceMemberId: 'wm1',
    },
    client,
  );

  assert.equal(result.status, 'SUMMARIZED');
  assert.equal(result.threadParentId, 'parent-1');
  assert.deepEqual(findQuery(calls, 'chatMessages')?.args, {
    filter: {
      channelId: { eq: 'channel-1' },
      threadParent: { id: { eq: 'parent-1' } },
    },
    orderBy: [{ createdAt: 'DescNullsLast' }, { id: 'Desc' }],
    first: 50,
  });
});
