import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildChatTranscript,
  clampChatToolMessageLimit,
  DEFAULT_CHAT_TOOL_MESSAGE_LIMIT,
  formatChatAuthorName,
  MAX_CHAT_TOOL_MESSAGE_LIMIT,
} from '../chat-transcript.ts';

// The transcript is the typed data the assistant summarizes. These cases pin
// the shaping rules (author labels, participant/reaction aggregation, limit
// clamping) without any Core API client.

test('a message exposes its id, author name, timestamps and body', () => {
  const transcript = buildChatTranscript([
    {
      id: 'm1',
      body: 'Bonjour',
      createdAt: '2026-09-19T08:00:00.000Z',
      threadParentId: null,
      author: { id: 'wm1', name: { firstName: 'Ada', lastName: 'Lovelace' } },
    },
  ]);

  assert.deepEqual(transcript.messages, [
    {
      id: 'm1',
      authorId: 'wm1',
      authorName: 'Ada Lovelace',
      createdAt: '2026-09-19T08:00:00.000Z',
      body: 'Bonjour',
      threadParentId: null,
    },
  ]);
});

test('participants aggregate message counts, most active first', () => {
  const transcript = buildChatTranscript([
    { id: 'm1', createdAt: 'a', author: { id: 'wm1', name: { firstName: 'Ada' } } },
    { id: 'm2', createdAt: 'b', author: { id: 'wm2', name: { firstName: 'Grace' } } },
    { id: 'm3', createdAt: 'c', author: { id: 'wm1', name: { firstName: 'Ada' } } },
  ]);

  assert.deepEqual(transcript.participants, [
    { authorId: 'wm1', authorName: 'Ada', messageCount: 2 },
    { authorId: 'wm2', authorName: 'Grace', messageCount: 1 },
  ]);
});

test('reactions aggregate emoji counts across the transcript', () => {
  const transcript = buildChatTranscript([
    {
      id: 'm1',
      createdAt: 'a',
      reactions: {
        edges: [{ node: { emoji: '👍' } }, { node: { emoji: '🎉' } }],
      },
    },
    {
      id: 'm2',
      createdAt: 'b',
      reactions: { edges: [{ node: { emoji: '👍' } }] },
    },
  ]);

  assert.deepEqual(transcript.reactions, [
    { emoji: '👍', count: 2 },
    { emoji: '🎉', count: 1 },
  ]);
});

test('an anonymous or deleted author stays a stable participant', () => {
  const transcript = buildChatTranscript([
    { id: 'm1', createdAt: 'a', author: null },
    { id: 'm2', createdAt: 'b', author: { id: null, name: null } },
  ]);

  assert.equal(transcript.participants.length, 1);
  assert.deepEqual(transcript.participants[0], {
    authorId: null,
    authorName: '',
    messageCount: 2,
  });
});

test('the message limit defaults and clamps to the supported range', () => {
  assert.equal(clampChatToolMessageLimit(undefined), DEFAULT_CHAT_TOOL_MESSAGE_LIMIT);
  assert.equal(clampChatToolMessageLimit(0), 1);
  assert.equal(clampChatToolMessageLimit(-5), 1);
  assert.equal(clampChatToolMessageLimit(2000), MAX_CHAT_TOOL_MESSAGE_LIMIT);
  assert.equal(clampChatToolMessageLimit(12.9), 12);
  assert.equal(clampChatToolMessageLimit(Number.NaN), DEFAULT_CHAT_TOOL_MESSAGE_LIMIT);
});

test('author labels join the parts and ignore blank fragments', () => {
  assert.equal(formatChatAuthorName({ firstName: 'Ada', lastName: 'Lovelace' }), 'Ada Lovelace');
  assert.equal(formatChatAuthorName({ firstName: 'Ada', lastName: '  ' }), 'Ada');
  assert.equal(formatChatAuthorName(null), '');
});
