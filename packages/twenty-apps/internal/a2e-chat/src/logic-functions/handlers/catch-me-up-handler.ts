import {
  MAX_CHAT_TOOL_MESSAGE_LIMIT,
  type ChatTranscriptMessage,
  type ChatTranscriptParticipant,
  type ChatTranscriptReaction,
} from '../../lib/chat-transcript.ts';
import {
  coreClient,
  readChannelAccess,
  readChannelMessages,
  readReadCursorSince,
  type ChatChannelSummary,
  type CoreClientLike,
} from './chat-tool-support.ts';

// READ-ONLY CATCH-ME-UP (P9.2).
//
// Returns the backlog the caller has not read in one authorized channel. With
// no explicit `sinceIso` the window starts after the caller's durable read
// cursor (chatReadCursor, P5.1); an explicit `sinceIso` overrides it. Nothing
// is written: the read cursor is never advanced here.
//
// The same caller-scoped reads and private-channel fail-closed re-assert apply
// as in summarize-channel.

export type CatchMeUpStatus =
  | 'CAUGHT_UP'
  | 'CHANNEL_NOT_FOUND'
  | 'CHANNEL_FORBIDDEN'
  | 'INVALID_INPUT';

export type CatchMeUpResult = {
  status: CatchMeUpStatus;
  channelId: string;
  channel: ChatChannelSummary | null;
  sinceIso: string | null;
  usedReadCursor: boolean;
  unreadCount: number;
  truncated: boolean;
  messages: ChatTranscriptMessage[];
  participants: ChatTranscriptParticipant[];
  reactions: ChatTranscriptReaction[];
};

export type CatchMeUpInput = {
  channelId?: string;
  sinceIso?: string;
  callerWorkspaceMemberId?: string | null;
};

const emptyTranscript = {
  messages: [] as ChatTranscriptMessage[],
  participants: [] as ChatTranscriptParticipant[],
  reactions: [] as ChatTranscriptReaction[],
};

const normalizeSinceIso = (
  value: string | undefined,
): { isValid: true; iso: string | null } | { isValid: false } => {
  if (value === undefined) {
    return { isValid: true, iso: null };
  }

  if (typeof value !== 'string') {
    return { isValid: false };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { isValid: true, iso: null };
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return { isValid: false };
  }

  return { isValid: true, iso: parsed.toISOString() };
};

export const catchMeUp = async (
  input: CatchMeUpInput,
  client: CoreClientLike = coreClient(),
): Promise<CatchMeUpResult> => {
  const channelId =
    typeof input.channelId === 'string' ? input.channelId.trim() : '';
  const since = normalizeSinceIso(input.sinceIso);

  const invalid = (forwardedChannelId: string): CatchMeUpResult => ({
    status: 'INVALID_INPUT',
    channelId: forwardedChannelId,
    channel: null,
    sinceIso: null,
    usedReadCursor: false,
    unreadCount: 0,
    truncated: false,
    ...emptyTranscript,
  });

  if (channelId === '' || !since.isValid) {
    return invalid(channelId);
  }

  const access = await readChannelAccess(
    client,
    channelId,
    input.callerWorkspaceMemberId ?? null,
  );

  if (!access.readable) {
    return {
      status: access.reason,
      channelId,
      channel: null,
      sinceIso: null,
      usedReadCursor: false,
      unreadCount: 0,
      truncated: false,
      ...emptyTranscript,
    };
  }

  const explicitSince = since.iso;
  const cursorSince =
    explicitSince === null
      ? await readReadCursorSince(
          client,
          channelId,
          input.callerWorkspaceMemberId ?? null,
        )
      : null;
  const effectiveSince = explicitSince ?? cursorSince;

  const { transcript, truncated } = await readChannelMessages(client, {
    channelId,
    sinceIso: effectiveSince ?? undefined,
    limit: MAX_CHAT_TOOL_MESSAGE_LIMIT,
  });

  return {
    status: 'CAUGHT_UP',
    channelId,
    channel: access.channel,
    sinceIso: effectiveSince,
    usedReadCursor: explicitSince === null && cursorSince !== null,
    unreadCount: transcript.messages.length,
    truncated,
    ...transcript,
  };
};
