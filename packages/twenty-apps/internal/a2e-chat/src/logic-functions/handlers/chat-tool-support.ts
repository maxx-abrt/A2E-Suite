import { CoreApiClient } from 'twenty-client-sdk/core';

import { canReadChannel } from '../../lib/channel-membership.ts';
import {
  buildChatTranscript,
  type ChatMessageSource,
  type ChatTranscript,
} from '../../lib/chat-transcript.ts';

// Shared plumbing for the read-only P9.2 chat tools. Both summarize-channel and
// catch-me-up must (1) read a channel through the caller-context Core API
// client, (2) fail closed on a private channel the caller does not belong to,
// and (3) shape an authorized transcript. Centralizing it keeps the two tools
// from drifting on the access rule.
//
// The client is injectable so node:test exercises the reads without a live Core
// API (the generated client throws before generation).

export type CoreClientLike = Pick<CoreApiClient, 'query'>;

export const coreClient = (): CoreApiClient => new CoreApiClient();

// Only the caller identity is needed to scope the reads. The full execution
// context type is not exported by the pinned twenty-sdk 2.31.0 runtime barrel,
// so the tools declare the single field they consume.
export type ChatToolExecutionContext = {
  workspaceMemberId?: string | null;
};

export type ChatChannelNode = {
  id: string;
  name?: string | null;
  kind?: string | null;
  visibility?: string | null;
  topic?: string | null;
  members?: {
    edges?: {
      node: { workspaceMember?: { id?: string | null } | null };
    }[];
  } | null;
};

export type ChatChannelSummary = {
  id: string;
  name: string;
  kind: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  topic: string | null;
};

export type ChannelAccessOutcome =
  | { readable: true; channel: ChatChannelSummary }
  | { readable: false; reason: 'CHANNEL_NOT_FOUND' | 'CHANNEL_FORBIDDEN' };

const CHANNEL_SELECTION = {
  id: true,
  name: true,
  kind: true,
  visibility: true,
  topic: true,
  members: { edges: { node: { workspaceMember: { id: true } } } },
} as const;

const MESSAGE_SELECTION = {
  id: true,
  body: true,
  createdAt: true,
  threadParentId: true,
  author: { id: true, name: { firstName: true, lastName: true } },
  reactions: { edges: { node: { emoji: true } } },
} as const;

export const readChannelAccess = async (
  client: CoreClientLike,
  channelId: string,
  callerWorkspaceMemberId: string | null,
): Promise<ChannelAccessOutcome> => {
  const result = (await client.query({
    chatChannel: { __args: { id: channelId }, ...CHANNEL_SELECTION },
  } as never)) as { chatChannel?: ChatChannelNode | null };

  const channel = result?.chatChannel;

  if (channel === undefined || channel === null) {
    return { readable: false, reason: 'CHANNEL_NOT_FOUND' };
  }

  const visibility = channel.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
  const isMember =
    callerWorkspaceMemberId !== null &&
    (channel.members?.edges ?? []).some(
      (edge) => edge.node.workspaceMember?.id === callerWorkspaceMemberId,
    );

  // Defense in depth: the caller-scoped read should already hide a private
  // channel from a non-member; re-assert so a permissive read path cannot leak
  // messages the caller is not entitled to.
  if (
    !canReadChannel({
      visibility,
      postingRoles: [],
      isMember,
      isAdmin: false,
    })
  ) {
    return { readable: false, reason: 'CHANNEL_FORBIDDEN' };
  }

  return {
    readable: true,
    channel: {
      id: channel.id,
      name: channel.name ?? '',
      kind: channel.kind ?? null,
      visibility,
      topic: channel.topic ?? null,
    },
  };
};

export const readChannelMessages = async (
  client: CoreClientLike,
  {
    channelId,
    threadParentId,
    sinceIso,
    limit,
  }: {
    channelId: string;
    threadParentId?: string;
    sinceIso?: string;
    limit: number;
  },
): Promise<{ transcript: ChatTranscript; truncated: boolean }> => {
  const filter: Record<string, unknown> = { channelId: { eq: channelId } };

  if (threadParentId !== undefined) {
    filter.threadParent = { id: { eq: threadParentId } };
  }

  if (sinceIso !== undefined) {
    filter.createdAt = { gt: sinceIso };
  }

  const result = (await client.query({
    chatMessages: {
      __args: {
        filter,
        orderBy: [{ createdAt: 'DescNullsLast' }, { id: 'Desc' }],
        first: limit,
      },
      edges: { node: MESSAGE_SELECTION },
      pageInfo: { hasNextPage: true },
    },
  } as never)) as {
    chatMessages?: {
      edges?: { node: ChatMessageSource }[];
      pageInfo?: { hasNextPage?: boolean };
    };
  };

  // The keyset read is newest-first so `first: limit` yields the most recent
  // messages; the transcript is chronological for the summarizer.
  const messages = (result?.chatMessages?.edges ?? [])
    .map((edge) => edge.node)
    .reverse();

  return {
    transcript: buildChatTranscript(messages),
    truncated: result?.chatMessages?.pageInfo?.hasNextPage ?? false,
  };
};

export const readReadCursorSince = async (
  client: CoreClientLike,
  channelId: string,
  callerWorkspaceMemberId: string | null,
): Promise<string | null> => {
  if (callerWorkspaceMemberId === null) {
    return null;
  }

  const result = (await client.query({
    chatReadCursors: {
      __args: {
        filter: {
          channel: { id: { eq: channelId } },
          workspaceMember: { id: { eq: callerWorkspaceMemberId } },
        },
        first: 1,
      },
      edges: {
        node: {
          id: true,
          lastReadAt: true,
          lastReadMessage: { createdAt: true },
        },
      },
    },
  } as never)) as {
    chatReadCursors?: {
      edges?: {
        node: {
          lastReadAt?: string | null;
          lastReadMessage?: { createdAt?: string | null } | null;
        };
      }[];
    };
  };

  // lastReadMessage.createdAt is the durable cursor; lastReadAt is the
  // fallback for a cursor written before a message id was known.
  const cursor = result?.chatReadCursors?.edges?.[0]?.node;

  return cursor?.lastReadMessage?.createdAt ?? cursor?.lastReadAt ?? null;
};
