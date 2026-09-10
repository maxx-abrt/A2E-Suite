type InlineContentLike = {
  text?: unknown;
  content?: readonly InlineContentLike[];
};

type BlockLike = {
  content?: unknown;
  children?: readonly BlockLike[];
};

const collectTextFromInlineContent = (
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
      collectTextFromInlineContent(inlineContentItem.content, textAccumulator);
    }
  }
};

const collectTextFromBlocks = (
  blocks: readonly BlockLike[],
  textAccumulator: string[],
): void => {
  for (const block of blocks) {
    collectTextFromInlineContent(block.content, textAccumulator);

    if (Array.isArray(block.children)) {
      collectTextFromBlocks(block.children, textAccumulator);
    }
  }
};

export const getBlockWordCount = (blocks: unknown): number => {
  if (!Array.isArray(blocks)) {
    return 0;
  }

  const textAccumulator: string[] = [];

  collectTextFromBlocks(blocks as readonly BlockLike[], textAccumulator);

  // Non-breaking space is a real separator in prose; the unicode class covers
  // accented languages (fr) that \w misses.
  const words = textAccumulator
    .join(' ')
    .split(/[\s\p{Zs}]+/u)
    .filter((word) => word.length > 0);

  return words.length;
};
