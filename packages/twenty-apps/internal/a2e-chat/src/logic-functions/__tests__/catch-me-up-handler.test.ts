import assert from 'node:assert/strict';
import { test } from 'node:test';

import { catchMeUp } from '../handlers/catch-me-up-handler.ts';
import {
  buildChannel,
  buildChannelMemberEdge,
  buildFakeClient,
  buildMessage,
  buildMessagesResponse,
  findQuery,
} from './chat-tool-test-fixtures.ts';

// The unread window is the caller's durable read cursor (chatReadCursor), or an
// explicit sinceIso that overrides it. All reads stay caller-scoped and the
// cursor is never written.

const buildReadCursors = (createdAt: string | null) => ({
  edges: createdAt === null ? [] : [{ node: { lastReadMessage: { createdAt } } }],
});

test('the default window starts after the caller read cursor', async () => {
  const { client, calls } = buildFakeClient({
    chatChannel: buildChannel(),
    chatReadCursors: buildReadCursors('2026-09-19T08:00:00.000Z'),
    chatMessages: buildMessagesResponse([buildMessage()]),
  });

  const result = await catchMeUp(
    { channelId: 'channel-1', callerWorkspaceMemberId: 'wm1' },
    client,
  );

  assert.equal(result.status, 'CAUGHT_UP');
  assert.equal(result.sinceIso, '2026-09-19T08:00:00.000Z');
  assert.equal(result.usedReadCursor, true);
  assert.equal(result.unreadCount, 1);
  assert.deepEqual(findQuery(calls, 'chatReadCursors')?.args, {
    filter: {
      channel: { id: { eq: 'channel-1' } },
      workspaceMember: { id: { eq: 'wm1' } },
    },
    first: 1,
  });
  assert.deepEqual(findQuery(calls, 'chatMessages')?.args, {
    filter: {
      channelId: { eq: 'channel-1' },
      createdAt: { gt: '2026-09-19T08:00:00.000Z' },
    },
    orderBy: [{ createdAt: 'DescNullsLast' }, { id: 'Desc' }],
    first: 100,
  });
});

test('an explicit sinceIso overrides the read cursor and skips the cursor read', async () => {
  const { client, calls } = buildFakeClient({
    chatChannel: buildChannel(),
    chatMessages: buildMessagesResponse([buildMessage()]),
  });

  const result = await catchMeUp(
    {
      channelId: 'channel-1',
      sinceIso: '2026-09-18T00:00:00Z',
      callerWorkspaceMemberId: 'wm1',
    },
    client,
  );

  assert.equal(result.sinceIso, '2026-09-18T00:00:00.000Z');
  assert.equal(result.usedReadCursor, false);
  assert.equal(findQuery(calls, 'chatReadCursors'), undefined);
  assert.deepEqual(findQuery(calls, 'chatMessages')?.args, {
    filter: {
      channelId: { eq: 'channel-1' },
      createdAt: { gt: '2026-09-18T00:00:00.000Z' },
    },
    orderBy: [{ createdAt: 'DescNullsLast' }, { id: 'Desc' }],
    first: 100,
  });
});

test('no read cursor means the whole channel is the backlog', async () => {
  const { client, calls } = buildFakeClient({
    chatChannel: buildChannel(),
    chatReadCursors: buildReadCursors(null),
    chatMessages: buildMessagesResponse([]),
  });

  const result = await catchMeUp(
    { channelId: 'channel-1', callerWorkspaceMemberId: 'wm1' },
    client,
  );

  assert.equal(result.status, 'CAUGHT_UP');
  assert.equal(result.sinceIso, null);
  assert.equal(result.usedReadCursor, false);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(findQuery(calls, 'chatMessages')?.args, {
    filter: { channelId: { eq: 'channel-1' } },
    orderBy: [{ createdAt: 'DescNullsLast' }, { id: 'Desc' }],
    first: 100,
  });
});

test('a private channel denies a non-member and reads no message', async () => {
  const { client, calls } = buildFakeClient({
    chatChannel: buildChannel({
      visibility: 'PRIVATE',
      members: { edges: [buildChannelMemberEdge('wm-other')] },
    }),
  });

  const result = await catchMeUp(
    { channelId: 'channel-1', callerWorkspaceMemberId: 'wm1' },
    client,
  );

  assert.equal(result.status, 'CHANNEL_FORBIDDEN');
  assert.equal(result.unreadCount, 0);
  assert.equal(findQuery(calls, 'chatMessages'), undefined);
});

test('an invalid sinceIso is refused before any read', async () => {
  const { client, calls } = buildFakeClient({});

  const result = await catchMeUp(
    { channelId: 'channel-1', sinceIso: 'pas-une-date' },
    client,
  );

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(calls, []);
});

test('a blank channelId is refused before any read', async () => {
  const { client, calls } = buildFakeClient({});

  const result = await catchMeUp({ channelId: '   ' }, client);

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(calls, []);
});

test('a missing channel fails closed', async () => {
  const { client } = buildFakeClient({ chatChannel: null });

  const result = await catchMeUp({ channelId: 'channel-1' }, client);

  assert.equal(result.status, 'CHANNEL_NOT_FOUND');
  assert.deepEqual(result.messages, []);
});
