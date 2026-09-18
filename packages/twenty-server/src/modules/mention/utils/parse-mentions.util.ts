import {
  type MentionExtraction,
  type MentionSurface,
} from 'src/modules/mention/types/mention.type';
import { parseChatMentions } from 'src/modules/mention/utils/parse-chat-mentions.util';
import {
  parseCommentMentionEntries,
  parseDocumentMentions,
} from 'src/modules/mention/utils/parse-blocknote-mentions.util';
import {
  type MentionSnippetUnit,
  pickMentionContextSnippet,
} from 'src/modules/mention/utils/build-mention-snippet.util';

// One entry point for every surface. The parser dispatches on the surface so a
// caller never re-implements the chat Markdown-lite or BlockNote walk, and the
// notification payload shape stays identical across docs, chat and comments.
export const parseMentions = ({
  surface,
  body,
}: {
  surface: MentionSurface;
  body: unknown;
}): MentionExtraction => {
  switch (surface) {
    case 'chat':
      return parseChatMentions(typeof body === 'string' ? body : null);

    case 'document':
      return parseDocumentMentions(body);

    case 'comment':
      return parseCommentThreadMentions(body);
  }
};

const parseCommentThreadMentions = (comments: unknown): MentionExtraction => {
  const mentionedWorkspaceMemberIds = new Set<string>();
  const units: MentionSnippetUnit[] = [];

  for (const entry of parseCommentMentionEntries(comments)) {
    const { mentionedWorkspaceMemberIds: entryIds, contextSnippet } =
      entry.extraction;

    entryIds.forEach((id) => mentionedWorkspaceMemberIds.add(id));

    if (contextSnippet.length > 0) {
      units.push({
        text: contextSnippet,
        hasMention: entryIds.length > 0,
      });
    }
  }

  return {
    mentionedWorkspaceMemberIds: [...mentionedWorkspaceMemberIds],
    contextSnippet: pickMentionContextSnippet(units),
  };
};
