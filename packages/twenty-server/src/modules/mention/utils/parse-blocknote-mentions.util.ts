import { isArray, isNonEmptyString } from '@sniptt/guards';

import {
  type CommentMentionExtraction,
  type MentionExtraction,
} from 'src/modules/mention/types/mention.type';
import {
  type MentionSnippetUnit,
  pickMentionContextSnippet,
} from 'src/modules/mention/utils/build-mention-snippet.util';

// The editor stores both documents and comments as BlockNote JSON: a document
// is an array of blocks in its RICH_TEXT `content` column, a comment thread is
// an array of CommentData whose `body` is the same block shape. A mention is an
// inline content node `{ type: 'mention', props: { objectNameSingular, recordId,
// label } }` (BlockNote Schema.ts), so both surfaces walk the same structure.
const WORKSPACE_MEMBER_OBJECT_NAME = 'workspaceMember';
const MENTION_INLINE_CONTENT_TYPE = 'mention';

type BlocknoteRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is BlocknoteRecord =>
  typeof value === 'object' && value !== null && !isArray(value);

const parseBlocknoteJson = (value: unknown): unknown[] => {
  if (isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed === '{}') {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);

    return isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

type InlineExtraction = {
  text: string;
  mentionedWorkspaceMemberIds: string[];
};

const extractInlineContent = (content: unknown): InlineExtraction => {
  if (typeof content === 'string') {
    return { text: content, mentionedWorkspaceMemberIds: [] };
  }

  if (!isArray(content)) {
    return { text: '', mentionedWorkspaceMemberIds: [] };
  }

  let text = '';
  const mentionedWorkspaceMemberIds: string[] = [];

  for (const node of content) {
    if (typeof node === 'string') {
      text += node;
      continue;
    }

    if (!isRecord(node)) {
      continue;
    }

    if (node.type === MENTION_INLINE_CONTENT_TYPE && isRecord(node.props)) {
      const { objectNameSingular, recordId, label } = node.props;
      const isWorkspaceMemberMention =
        objectNameSingular === WORKSPACE_MEMBER_OBJECT_NAME &&
        isNonEmptyString(recordId);

      if (isWorkspaceMemberMention) {
        mentionedWorkspaceMemberIds.push(recordId);
      }

      // Record mentions keep their chip label as plain context; only
      // workspaceMember mentions produce a notification.
      if (isNonEmptyString(label)) {
        text += `@${label}`;
      }
      continue;
    }

    if (typeof node.text === 'string') {
      text += node.text;
    }

    // Link inline content nests its own inline content array.
    const nested = extractInlineContent(node.content);

    text += nested.text;
    mentionedWorkspaceMemberIds.push(...nested.mentionedWorkspaceMemberIds);
  }

  return { text, mentionedWorkspaceMemberIds };
};

type BlockExtraction = {
  text: string;
  hasMention: boolean;
  mentionedWorkspaceMemberIds: string[];
};

const extractBlock = (block: unknown): BlockExtraction => {
  if (!isRecord(block)) {
    return { text: '', hasMention: false, mentionedWorkspaceMemberIds: [] };
  }

  const inline = extractInlineContent(block.content);
  const mentionedWorkspaceMemberIds = [...inline.mentionedWorkspaceMemberIds];
  let text = inline.text;
  let hasMention = inline.mentionedWorkspaceMemberIds.length > 0;

  if (isArray(block.children)) {
    for (const child of block.children) {
      const childExtraction = extractBlock(child);

      text += ` ${childExtraction.text}`;
      hasMention = hasMention || childExtraction.hasMention;
      mentionedWorkspaceMemberIds.push(
        ...childExtraction.mentionedWorkspaceMemberIds,
      );
    }
  }

  return { text, hasMention, mentionedWorkspaceMemberIds };
};

const parseBlocknoteBlocks = (blocks: unknown[]): MentionExtraction => {
  const mentionedWorkspaceMemberIds = new Set<string>();
  const units: MentionSnippetUnit[] = [];

  for (const block of blocks) {
    const extraction = extractBlock(block);

    extraction.mentionedWorkspaceMemberIds.forEach((id) =>
      mentionedWorkspaceMemberIds.add(id),
    );

    if (extraction.text.trim().length > 0) {
      units.push({ text: extraction.text, hasMention: extraction.hasMention });
    }
  }

  return {
    mentionedWorkspaceMemberIds: [...mentionedWorkspaceMemberIds],
    contextSnippet: pickMentionContextSnippet(units),
  };
};

export const parseDocumentMentions = (content: unknown): MentionExtraction =>
  parseBlocknoteBlocks(parseBlocknoteJson(content));

export const extractDocumentMentionedWorkspaceMemberIds = (
  content: unknown,
): string[] => parseDocumentMentions(content).mentionedWorkspaceMemberIds;

export const parseCommentBodyMentions = (body: unknown): MentionExtraction =>
  parseBlocknoteBlocks(parseBlocknoteJson(body));

// A thread row projects each comment's BlockNote body under `body`; a bare
// block array is tolerated so the parser also handles an unprojected body.
export const parseCommentMentionEntries = (
  comments: unknown,
): CommentMentionExtraction[] =>
  parseBlocknoteJson(comments).flatMap((comment) => {
    if (!isRecord(comment)) {
      return [];
    }

    const commentId = isNonEmptyString(comment.id) ? comment.id : null;
    const body = 'body' in comment ? comment.body : comment;

    return [
      {
        commentId,
        extraction: parseCommentBodyMentions(body),
      },
    ];
  });

export const extractCommentIds = (comments: unknown): string[] =>
  parseBlocknoteJson(comments)
    .filter(isRecord)
    .map((comment) => comment.id)
    .filter(isNonEmptyString);

// A thread edit appends comments; only the ones whose id was absent from the
// previous revision are new and worth notifying (creation has no `before`).
export const selectNewCommentEntries = ({
  before,
  after,
}: {
  before: unknown;
  after: unknown;
}): unknown[] => {
  const beforeCommentIds = new Set(extractCommentIds(before));

  return parseBlocknoteJson(after).filter(
    (comment) =>
      isRecord(comment) &&
      isNonEmptyString(comment.id) &&
      !beforeCommentIds.has(comment.id),
  );
};
