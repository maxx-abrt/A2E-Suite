import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildEmailReplyDraft } from '../handlers/draft-email-reply-handler.ts';
import { buildFakeCoreClient, findQuery } from './crm-tool-test-fixtures.ts';

// Contract with the Core API: the caller-context `messageThread` query returns
// the thread or `null`. Missing and unauthorized are the same `null` at this
// boundary, so both fail closed to one typed status and never leak content.

const buildThread = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  messageThread: {
    id: 'thread-1',
    subject: 'Devis',
    messages: {
      edges: [
        {
          node: {
            id: 'message-2',
            subject: 'Re: Devis',
            text: 'Deuxième',
            receivedAt: '2026-09-19T10:00:00.000Z',
            isDraft: false,
            messageParticipants: {
              edges: [
                {
                  node: {
                    role: 'FROM',
                    displayName: 'Client',
                    handle: 'client@acme.test',
                  },
                },
              ],
            },
          },
        },
        {
          node: {
            id: 'message-1',
            subject: 'Devis',
            text: 'Premier',
            receivedAt: '2026-09-18T10:00:00.000Z',
            isDraft: false,
            messageParticipants: {
              edges: [
                {
                  node: {
                    role: 'TO',
                    displayName: 'Moi',
                    handle: 'moi@a2e.test',
                  },
                },
              ],
            },
          },
        },
      ],
    },
    ...overrides,
  },
});

test('a readable thread yields its messages oldest first', async () => {
  const { client, calls } = buildFakeCoreClient(buildThread());

  const result = await buildEmailReplyDraft(
    { messageThreadId: 'thread-1' },
    client,
  );

  assert.equal(result.status, 'READ');
  assert.equal(result.messageThreadId, 'thread-1');
  assert.equal(result.subject, 'Devis');
  assert.deepEqual(
    result.messages.map((message) => message.id),
    ['message-1', 'message-2'],
  );
  assert.equal(result.messages[0].participants[0].role, 'TO');
  assert.equal(result.messages[0].participants[0].handle, 'moi@a2e.test');
  assert.deepEqual(result.options, {
    tone: null,
    language: null,
    maxWords: null,
  });
  // Exactly one caller-scoped read, by id.
  assert.deepEqual(findQuery(calls, 'messageThread')?.args, { id: 'thread-1' });
  assert.equal(calls.length, 1);
});

test('the thread id is trimmed before the read', async () => {
  const { client, calls } = buildFakeCoreClient(buildThread());

  const result = await buildEmailReplyDraft(
    { messageThreadId: '  thread-1  ' },
    client,
  );

  assert.equal(result.messageThreadId, 'thread-1');
  assert.deepEqual(findQuery(calls, 'messageThread')?.args, { id: 'thread-1' });
});

test('valid drafting options are echoed back', async () => {
  const { client } = buildFakeCoreClient(buildThread());

  const result = await buildEmailReplyDraft(
    {
      messageThreadId: 'thread-1',
      tone: 'chaleureux',
      language: 'français',
      maxWords: 120,
    },
    client,
  );

  assert.deepEqual(result.options, {
    tone: 'chaleureux',
    language: 'français',
    maxWords: 120,
  });
});

test('a blank option fails closed before any read', async () => {
  const { client, calls } = buildFakeCoreClient(buildThread());

  const result = await buildEmailReplyDraft(
    { messageThreadId: 'thread-1', tone: '   ' },
    client,
  );

  assert.equal(result.status, 'INVALID_INPUT');
  assert.equal(calls.length, 0);
});

test('a malformed word budget fails closed before any read', async () => {
  const { client, calls } = buildFakeCoreClient(buildThread());

  for (const maxWords of [0, 2001, 12.5]) {
    const result = await buildEmailReplyDraft(
      { messageThreadId: 'thread-1', maxWords },
      client,
    );

    assert.equal(result.status, 'INVALID_INPUT', `maxWords=${maxWords}`);
  }

  assert.equal(calls.length, 0);
});

test('a missing thread id fails closed before any read', async () => {
  const { client, calls } = buildFakeCoreClient(buildThread());

  const result = await buildEmailReplyDraft({ messageThreadId: '   ' }, client);

  assert.equal(result.status, 'INVALID_INPUT');
  assert.equal(calls.length, 0);
});

test('a missing or unauthorized thread fails closed', async () => {
  const { client } = buildFakeCoreClient({ messageThread: null });

  const result = await buildEmailReplyDraft(
    { messageThreadId: 'thread-1' },
    client,
  );

  assert.deepEqual(result, {
    status: 'THREAD_NOT_FOUND',
    messageThreadId: 'thread-1',
    subject: null,
    messages: [],
    options: { tone: null, language: null, maxWords: null },
  });
});

test('a message without a timestamp sorts last', async () => {
  const { client } = buildFakeCoreClient({
    messageThread: {
      id: 'thread-1',
      subject: 'Devis',
      messages: {
        edges: [
          { node: { id: 'no-date', text: 'Date inconnue', receivedAt: null } },
          {
            node: {
              id: 'dated',
              text: 'Daté',
              receivedAt: '2026-09-18T10:00:00.000Z',
            },
          },
        ],
      },
    },
  });

  const result = await buildEmailReplyDraft(
    { messageThreadId: 'thread-1' },
    client,
  );

  assert.deepEqual(
    result.messages.map((message) => message.id),
    ['dated', 'no-date'],
  );
});

test('a long thread keeps the most recent bounded window', async () => {
  const edges = Array.from({ length: 25 }, (_, index) => ({
    node: {
      id: `message-${index}`,
      text: `Message ${index}`,
      receivedAt: `2026-09-01T00:${String(index).padStart(2, '0')}:00.000Z`,
    },
  }));

  const { client } = buildFakeCoreClient({
    messageThread: { id: 'thread-1', subject: 'Devis', messages: { edges } },
  });

  const result = await buildEmailReplyDraft(
    { messageThreadId: 'thread-1' },
    client,
  );

  assert.equal(result.messages.length, 20);
  assert.equal(result.messages[0].id, 'message-5');
  assert.equal(result.messages[19].id, 'message-24');
});

test('an empty thread is still readable', async () => {
  const { client } = buildFakeCoreClient({
    messageThread: { id: 'thread-1', subject: null, messages: null },
  });

  const result = await buildEmailReplyDraft(
    { messageThreadId: 'thread-1' },
    client,
  );

  assert.equal(result.status, 'READ');
  assert.equal(result.subject, null);
  assert.deepEqual(result.messages, []);
});
