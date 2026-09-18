import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  canPostToChannel,
  canReadChannel,
  type ChannelAccessInput,
} from '../channel-membership.ts';

const access = (
  overrides: Partial<ChannelAccessInput> = {},
): ChannelAccessInput => ({
  visibility: 'PUBLIC',
  postingRoles: ['MEMBER', 'ADMIN'],
  isMember: false,
  isAdmin: false,
  ...overrides,
});

test('a public channel is readable by every workspace member', () => {
  assert.equal(canReadChannel(access({ visibility: 'PUBLIC' })), true);
});

test('a private channel is readable only by its members', () => {
  assert.equal(
    canReadChannel(access({ visibility: 'PRIVATE', isMember: false })),
    false,
  );
  assert.equal(
    canReadChannel(access({ visibility: 'PRIVATE', isMember: true })),
    true,
  );
});

test('an admin who is not a member still cannot read a private channel', () => {
  assert.equal(
    canReadChannel(
      access({ visibility: 'PRIVATE', isMember: false, isAdmin: true }),
    ),
    false,
  );
});

test('posting follows the channel posting roles', () => {
  assert.equal(canPostToChannel(access({ isMember: true })), true);
  assert.equal(
    canPostToChannel(access({ isMember: true, postingRoles: ['ADMIN'] })),
    false,
  );
  assert.equal(
    canPostToChannel(access({ postingRoles: ['ADMIN'], isAdmin: true })),
    true,
  );
});

test('a non-member cannot post to a public channel', () => {
  assert.equal(canPostToChannel(access({ isMember: false })), false);
});

test('no one posts to a channel they cannot read', () => {
  assert.equal(
    canPostToChannel(
      access({ visibility: 'PRIVATE', isMember: false, isAdmin: true }),
    ),
    false,
  );
});
