// Universal identifiers for A2E Chat.
//
// One UUIDv4-class identifier per declarable thing, committed forever
// (additive-only law). A2E Documents owns c31a*, A2E Projects owns c31b*,
// so Chat claims the next free block, c31c*:
// c31c{OO}00-{KK}00-4000-8000-0000000000{NN} where OO is the object index
// (OBJECT_INDEX below: 01 channel, 02 channelMember, 03 message,
// 04 reaction, 05 readCursor; 00 = app-level) and KK the family:
//   0000 object · 0001 own field · 0002 relation field · 0003 view ·
//   0004 view field · 0005 select option · 0006 view sort ·
//   0009 page-layout tab · 000a widget · 0010 nav item ·
//   0011 command menu item · 0012 logic function · 0013 front component
//
// Relation identifiers live here so object files never import each other
// (circular imports resolve to undefined at manifest build time). The names
// are prefixed chat* because the native emailing objects already own
// `message`/`messageThread`/`messageParticipant` in the workspace; a second
// object named `message` would collide with that ledger, not extend it.

export const OBJECT_IDS = {
  channel: 'c31c0100-0000-4000-8000-000000000000',
  channelMember: 'c31c0200-0000-4000-8000-000000000000',
  message: 'c31c0300-0000-4000-8000-000000000000',
  reaction: 'c31c0400-0000-4000-8000-000000000000',
  readCursor: 'c31c0500-0000-4000-8000-000000000000',
} as const;

// Both sides of every relation, grouped by the record that owns the foreign
// key. The inverse side of a relation to workspaceMember lives in
// src/fields/ (standalone field files on the standard object).
export const RELATION_IDS = {
  channelMessages: 'c31c0100-0002-4000-8000-000000000001',
  channelMembers: 'c31c0100-0002-4000-8000-000000000002',
  channelReadCursors: 'c31c0100-0002-4000-8000-000000000003',
  channelMemberChannel: 'c31c0200-0002-4000-8000-000000000001',
  channelMemberWorkspaceMember: 'c31c0200-0002-4000-8000-000000000002',
  workspaceMemberChannelMemberships: 'c31c0200-0002-4000-8000-000000000003',
  messageChannel: 'c31c0300-0002-4000-8000-000000000001',
  threadParent: 'c31c0300-0002-4000-8000-000000000002',
  threadReplies: 'c31c0300-0002-4000-8000-000000000003',
  messageAuthor: 'c31c0300-0002-4000-8000-000000000004',
  workspaceMemberMessages: 'c31c0300-0002-4000-8000-000000000005',
  messageReactions: 'c31c0300-0002-4000-8000-000000000006',
  messageReadCursors: 'c31c0300-0002-4000-8000-000000000007',
  reactionMessage: 'c31c0400-0002-4000-8000-000000000001',
  reactionWorkspaceMember: 'c31c0400-0002-4000-8000-000000000002',
  workspaceMemberReactions: 'c31c0400-0002-4000-8000-000000000003',
  readCursorChannel: 'c31c0500-0002-4000-8000-000000000001',
  readCursorWorkspaceMember: 'c31c0500-0002-4000-8000-000000000002',
  workspaceMemberReadCursors: 'c31c0500-0002-4000-8000-000000000003',
  readCursorLastMessage: 'c31c0500-0002-4000-8000-000000000004',
} as const;

export const LABEL_IDENTIFIER_IDS = {
  channelName: 'c31c0100-0001-4000-8000-000000000001',
  messageBody: 'c31c0300-0001-4000-8000-000000000001',
  reactionEmoji: 'c31c0400-0001-4000-8000-000000000001',
} as const;

export const LOGIC_FUNCTION_IDS = {
  postInstall: 'c31c0000-0012-4000-8000-000000000001',
} as const;

export const COMMAND_MENU_ITEM_IDS = {
  createChannel: 'c31c0000-0011-4000-8000-000000000001',
  goToChat: 'c31c0000-0011-4000-8000-000000000002',
} as const;

export const NAVIGATION_MENU_ITEM_IDS = {
  channels: 'c31c0000-0010-4000-8000-000000000001',
} as const;

export const FRONT_COMPONENT_IDS = {
  createChannelCommand: 'c31c0000-0013-4000-8000-000000000001',
  goToChat: 'c31c0000-0013-4000-8000-000000000002',
} as const;

export const VIEW_IDS = {
  allChannels: 'c31c0100-0003-4000-8000-000000000001',
  allChannelMembers: 'c31c0200-0003-4000-8000-000000000001',
  allMessages: 'c31c0300-0003-4000-8000-000000000001',
} as const;

// View fields are positional, so their identifiers are derived. The middle
// segment is the object index.
export const viewFieldId = (
  objectIndex: string,
  viewIndex: number,
  position: number,
): string =>
  `c31c${objectIndex}00-0004-4000-8000-${viewIndex
    .toString(16)
    .padStart(2, '0')}${position.toString(16).padStart(10, '0')}`;

export const OBJECT_INDEX = {
  channel: '01',
  channelMember: '02',
  message: '03',
  reaction: '04',
  readCursor: '05',
} as const;
