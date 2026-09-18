import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_MESSAGE_BODY_LENGTH,
  extractMentionedWorkspaceMemberIds,
  isMessageBodyWithinLimit,
  normalizeMessageBody,
} from '../message-body.ts';

test('normalizes line endings and trims the body', () => {
  assert.equal(normalizeMessageBody('  hello\r\nworld  '), 'hello\nworld');
});

test('rejects a body past the length limit, counting normalized text', () => {
  const withinLimit = 'a'.repeat(MAX_MESSAGE_BODY_LENGTH);
  const overLimit = 'a'.repeat(MAX_MESSAGE_BODY_LENGTH + 1);

  assert.equal(isMessageBodyWithinLimit(withinLimit), true);
  assert.equal(isMessageBodyWithinLimit(overLimit), false);
  // Trailing whitespace does not push a body over the limit.
  assert.equal(isMessageBodyWithinLimit(`${overLimit}   `), false);
  assert.equal(isMessageBodyWithinLimit(`  ${withinLimit}  `), true);
});

test('extracts unique mentioned workspace member ids in first-seen order', () => {
  assert.deepEqual(
    extractMentionedWorkspaceMemberIds(
      'Bonjour @[Alice](member-1) et @[Bob](member-2), merci @[Alice](member-1)',
    ),
    ['member-1', 'member-2'],
  );
});

test('ignores plain @words that are not mention links', () => {
  assert.deepEqual(extractMentionedWorkspaceMemberIds('salut @tous'), []);
});
