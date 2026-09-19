import {
  clampChatToolMessageLimit,
  type ChatTranscriptMessage,
  type ChatTranscriptParticipant,
  type ChatTranscriptReaction,
} from '../../lib/chat-transcript.ts';
import {
  coreClient,
  readChannelAccess,
  readChannelMessages,
  type ChatChannelSummary,
  type CoreClientLike,
} from './chat-tool-support.ts';

// READ-ONLY CHANNEL SUMMARY (P9.2).
//
// The assistant asks for the recent messages of one authorized channel (or one
// thread inside it) and receives typed data plus participant and emoji-reaction
// stats. Summarization itself happens in the assistant; this handler only
// supplies authorized content and never writes a message, reaction or cursor.
//
// Access: the reads run through the caller-context Core API client, so a
// private channel the caller cannot read is hidden by the platform. The
// explicit membership re-assert in `readChannelAccess` is defense in depth and
// yields a typed `CHANNEL_FORBIDDEN` instead of a leak.

export type SummarizeChannelStatus =
  | 'SUMMARIZED'
  | 'CHANNEL_NOT_FOUND'
  | 'CHANNEL_FORBIDDEN'
  | 'INVALID_INPUT';

export type SummarizeChannelResult = {
  status: SummarizeChannelStatus;
  channelId: string;
  channel: ChatChannelSummary | null;
  threadParentId: string | null;
  messageCount: number;
  truncated: boolean;
  messages: ChatTranscriptMessage[];
  participants: ChatTranscriptParticipant[];
  reactions: ChatTranscriptReaction[];
};

export type SummarizeChannelInput = {
  channelId?: string;
  threadParentId?: string;
  maxMessages?: number;
  callerWorkspaceMemberId?: string | null;
};

const emptyTranscript = {
  messages: [] as ChatTranscriptMessage[],
  participants: [] as ChatTranscriptParticipant[],
  reactions: [] as ChatTranscriptReaction[],
};

const normalizeOptionalId = (value: string | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

export const summarizeChannel = async (
  input: SummarizeChannelInput,
  client: CoreClientLike = coreClient(),
): Promise<SummarizeChannelResult> => {
  const channelId =
    typeof input.channelId === 'string' ? input.channelId.trim() : '';
  const threadParentId = normalizeOptionalId(input.threadParentId);

  const invalid = (
    forwardedChannelId: string,
  ): SummarizeChannelResult => ({
    status: 'INVALID_INPUT',
    channelId: forwardedChannelId,
    channel: null,
    threadParentId,
    messageCount: 0,
    truncated: false,
    ...emptyTranscript,
  });

  if (channelId === '') {
    return invalid('');
  }

  // A provided-but-blank threadParentId is a caller mistake, not "no thread":
  // refuse it rather than silently widening to the whole channel.
  if (typeof input.threadParentId === 'string' && threadParentId === null) {
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
      threadParentId,
      messageCount: 0,
      truncated: false,
      ...emptyTranscript,
    };
  }

  const { transcript, truncated } = await readChannelMessages(client, {
    channelId,
    threadParentId: threadParentId ?? undefined,
    limit: clampChatToolMessageLimit(input.maxMessages),
  });

  return {
    status: 'SUMMARIZED',
    channelId,
    channel: access.channel,
    threadParentId,
    messageCount: transcript.messages.length,
    truncated,
    ...transcript,
  };
};
