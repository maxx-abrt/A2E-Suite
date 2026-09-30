// Structural `unknown` input keeps this testable without importing the
// blocknote runtime (which cannot be jest-loaded — see phase-13 report).
type InlineContentLike = {
  text?: unknown;
  content?: readonly InlineContentLike[];
};

const collectInlineText = (
  inlineContent: unknown,
  textAccumulator: string[],
): void => {
  if (!Array.isArray(inlineContent)) {
    return;
  }

  for (const inlineContentItem of inlineContent as InlineContentLike[]) {
    if (typeof inlineContentItem?.text === 'string') {
      textAccumulator.push(inlineContentItem.text);
      continue;
    }

    if (Array.isArray(inlineContentItem?.content)) {
      collectInlineText(inlineContentItem.content, textAccumulator);
    }
  }
};

export const getInlineContentPlainText = (inlineContent: unknown): string => {
  const textAccumulator: string[] = [];

  collectInlineText(inlineContent, textAccumulator);

  return textAccumulator.join('').trim();
};
