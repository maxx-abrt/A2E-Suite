import {
  coreClient,
  hasNonEmptyString,
  normalizeOptionalPositiveInt,
  normalizeOptionalText,
  type CoreClientLike,
} from './crm-tool-support.ts';

// LECTURE SEULE, SOUS L'AUTORISATION DE L'APPELANT (P9.2).
//
// Reads a caller-authorized message thread so the assistant can draft a reply.
// The assistant owns the writing; this handler only supplies the thread
// content and the validated drafting options. It never sends, never stores a
// draft message and never writes anything (C6: review before any commit).
//
// The read runs through the caller-context Core API client (no system-context
// bypass). A thread the caller cannot read comes back as `null`, so missing and
// unauthorized collapse to one typed status instead of leaking existence (C5).

export type EmailReplyDraftStatus =
  | 'READ'
  | 'THREAD_NOT_FOUND'
  | 'INVALID_INPUT';

export type EmailReplyParticipant = {
  role: string;
  displayName: string | null;
  handle: string | null;
};

export type EmailReplyMessage = {
  id: string;
  subject: string | null;
  text: string | null;
  receivedAt: string | null;
  isDraft: boolean;
  participants: EmailReplyParticipant[];
};

export type EmailReplyDraftOptions = {
  tone: string | null;
  language: string | null;
  maxWords: number | null;
};

export type EmailReplyDraftResult = {
  status: EmailReplyDraftStatus;
  messageThreadId: string;
  subject: string | null;
  messages: EmailReplyMessage[];
  options: EmailReplyDraftOptions;
};

export type EmailReplyDraftInput = {
  messageThreadId?: string;
  tone?: string;
  language?: string;
  maxWords?: number;
};

const MAX_TONE_LENGTH = 60;
const MAX_LANGUAGE_LENGTH = 60;
const MAX_MAX_WORDS = 2000;

// A reply needs the recent exchange, not the whole history: keep a bounded,
// most-recent window so a long thread cannot balloon the assistant context.
const MAX_THREAD_MESSAGES = 20;

const EMPTY_OPTIONS: EmailReplyDraftOptions = {
  tone: null,
  language: null,
  maxWords: null,
};

type ParticipantNode = {
  role?: string | null;
  displayName?: string | null;
  handle?: string | null;
};

type MessageNode = {
  id: string;
  subject?: string | null;
  text?: string | null;
  receivedAt?: string | null;
  isDraft?: boolean | null;
  messageParticipants?: { edges?: { node: ParticipantNode }[] } | null;
};

type MessageThreadNode = {
  id: string;
  subject?: string | null;
  messages?: { edges?: { node: MessageNode }[] } | null;
};

// Any malformed option is refused so a caller cannot smuggle an unvalidated
// parameter through: only `tone`, `language` and `maxWords` are meaningful.
const resolveOptions = (
  input: EmailReplyDraftInput,
): EmailReplyDraftOptions | undefined => {
  const tone = normalizeOptionalText(input.tone, MAX_TONE_LENGTH);
  const language = normalizeOptionalText(input.language, MAX_LANGUAGE_LENGTH);
  const maxWords = normalizeOptionalPositiveInt(input.maxWords, MAX_MAX_WORDS);

  if (!tone.valid || !language.valid || !maxWords.valid) {
    return undefined;
  }

  return { tone: tone.value, language: language.value, maxWords: maxWords.value };
};

const readMessageThread = async (
  client: CoreClientLike,
  messageThreadId: string,
): Promise<MessageThreadNode | undefined> => {
  const result = (await client.query({
    messageThread: {
      __args: { id: messageThreadId },
      id: true,
      subject: true,
      messages: {
        edges: {
          node: {
            id: true,
            subject: true,
            text: true,
            receivedAt: true,
            isDraft: true,
            messageParticipants: {
              edges: { node: { role: true, displayName: true, handle: true } },
            },
          },
        },
      },
    },
  } as never)) as { messageThread?: MessageThreadNode | null };

  return result?.messageThread ?? undefined;
};

const toParticipant = (node: ParticipantNode): EmailReplyParticipant => ({
  role: typeof node.role === 'string' ? node.role : '',
  displayName: node.displayName ?? null,
  handle: node.handle ?? null,
});

const toMessage = (node: MessageNode): EmailReplyMessage => ({
  id: node.id,
  subject: node.subject ?? null,
  text: node.text ?? null,
  receivedAt: node.receivedAt ?? null,
  isDraft: node.isDraft === true,
  participants: (node.messageParticipants?.edges ?? []).map((edge) =>
    toParticipant(edge.node),
  ),
});

// Oldest first, unknown timestamps last, id as the stable tie-break. The
// assistant reads the exchange in the order the people wrote it.
const compareMessages = (left: EmailReplyMessage, right: EmailReplyMessage) => {
  if (left.receivedAt === right.receivedAt) {
    return left.id.localeCompare(right.id);
  }

  if (!hasNonEmptyString(left.receivedAt)) {
    return 1;
  }

  if (!hasNonEmptyString(right.receivedAt)) {
    return -1;
  }

  return left.receivedAt.localeCompare(right.receivedAt);
};

const selectThreadMessages = (nodes: MessageNode[]): EmailReplyMessage[] => {
  const ordered = nodes.map(toMessage).sort(compareMessages);

  return ordered.length > MAX_THREAD_MESSAGES
    ? ordered.slice(ordered.length - MAX_THREAD_MESSAGES)
    : ordered;
};

export const buildEmailReplyDraft = async (
  input: EmailReplyDraftInput,
  client: CoreClientLike = coreClient(),
): Promise<EmailReplyDraftResult> => {
  const messageThreadId = hasNonEmptyString(input.messageThreadId)
    ? input.messageThreadId.trim()
    : '';

  const options = resolveOptions(input);

  if (messageThreadId === '' || options === undefined) {
    return {
      status: 'INVALID_INPUT',
      messageThreadId,
      subject: null,
      messages: [],
      options: EMPTY_OPTIONS,
    };
  }

  const thread = await readMessageThread(client, messageThreadId);

  if (thread === undefined) {
    return {
      status: 'THREAD_NOT_FOUND',
      messageThreadId,
      subject: null,
      messages: [],
      options,
    };
  }

  return {
    status: 'READ',
    messageThreadId,
    subject: thread.subject ?? null,
    messages: selectThreadMessages(
      (thread.messages?.edges ?? []).map((edge) => edge.node),
    ),
    options,
  };
};
