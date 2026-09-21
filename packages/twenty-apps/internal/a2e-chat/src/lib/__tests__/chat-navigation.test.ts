import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CHAT_DISCUSSIONS_PATH } from '../chat-navigation.ts';

// The P5.2 reachability follow-up: the a2e-chat "go to chat" command (and the
// nav entry) must land on the dedicated chat page at /discussions with its
// channel sidebar, not on the chatChannels record index it used to open.
test('the discussions path matches AppPath.Discussions', () => {
  assert.equal(CHAT_DISCUSSIONS_PATH, '/discussions');
});

test('the go-to-chat command no longer targets the chatChannels record index', () => {
  assert.notEqual(CHAT_DISCUSSIONS_PATH, '/objects/chatChannels');
});
