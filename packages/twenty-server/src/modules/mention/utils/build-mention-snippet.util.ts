import { isDefined } from 'twenty-shared/utils';

// Short enough to render on one inbox line, long enough to carry the sentence
// the mention sits in ("context snippet").
export const MENTION_SNIPPET_MAX_LENGTH = 140;

const SNIPPET_ELLIPSIS = '…';

export type MentionSnippetUnit = {
  text: string;
  hasMention: boolean;
};

export const normalizeMentionSnippetText = (text: string): string =>
  text.replace(/\s+/g, ' ').trim();

export const truncateMentionSnippet = (
  text: string,
  maxLength: number = MENTION_SNIPPET_MAX_LENGTH,
): string =>
  text.length <= maxLength
    ? text
    : `${text.slice(0, Math.max(maxLength - SNIPPET_ELLIPSIS.length, 0)).trimEnd()}${SNIPPET_ELLIPSIS}`;

// Prefers the first unit that actually carries a mention, so the inbox preview
// shows the sentence around the mention rather than the document header.
export const pickMentionContextSnippet = (
  units: MentionSnippetUnit[],
  maxLength: number = MENTION_SNIPPET_MAX_LENGTH,
): string => {
  const nonEmptyUnits = units
    .map((unit) => ({ ...unit, text: normalizeMentionSnippetText(unit.text) }))
    .filter((unit) => unit.text.length > 0);

  const snippet =
    nonEmptyUnits.find((unit) => unit.hasMention) ?? nonEmptyUnits[0];

  return isDefined(snippet)
    ? truncateMentionSnippet(snippet.text, maxLength)
    : '';
};
