import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_STARTER_CHANNELS,
  findMissingStarterChannels,
} from '../starter-channels.ts';

test('every starter channel is workspace-scoped and public or private', () => {
  for (const channel of DEFAULT_STARTER_CHANNELS) {
    assert.equal(channel.kind, 'WORKSPACE');
    assert.ok(['PUBLIC', 'PRIVATE'].includes(channel.visibility));
    assert.ok(channel.postingRoles.length > 0);
  }
});

test('a fresh workspace is missing every starter channel', () => {
  assert.equal(
    findMissingStarterChannels([]).length,
    DEFAULT_STARTER_CHANNELS.length,
  );
});

test('an existing channel is never re-created, regardless of case', () => {
  const existing = DEFAULT_STARTER_CHANNELS.map((channel) =>
    channel.name.toUpperCase(),
  );

  assert.deepEqual(findMissingStarterChannels(existing), []);
});

test('only the absent channels are returned', () => {
  const [first, second] = DEFAULT_STARTER_CHANNELS;

  assert.deepEqual(
    findMissingStarterChannels([first.name]).map((channel) => channel.name),
    [second.name],
  );
});
