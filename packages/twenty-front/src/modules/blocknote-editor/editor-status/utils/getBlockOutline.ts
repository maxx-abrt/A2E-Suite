// Structural types keep this testable without importing the blocknote
// runtime (which cannot be jest-loaded — see phase-03 report).
type InlineContentLike = {
  text?: unknown;
  content?: readonly InlineContentLike[];
};

type BlockLike = {
  id?: string;
  type?: unknown;
  props?: { level?: unknown };
  content?: unknown;
  children?: readonly BlockLike[];
};

export type BlockOutlineEntry = {
  blockId: string;
  level: number;
  text: string;
};

const MAX_HEADING_LEVEL = 6;

const extractTextFromInlineContent = (inlineContent: unknown): string => {
  if (!Array.isArray(inlineContent)) {
    return '';
  }

  let text = '';

  for (const inlineContentItem of inlineContent as InlineContentLike[]) {
    if (typeof inlineContentItem?.text === 'string') {
      text += `${inlineContentItem.text} `;
      continue;
    }

    if (Array.isArray(inlineContentItem?.content)) {
      text += extractTextFromInlineContent(inlineContentItem.content);
    }
  }

  return text;
};

const collectHeadingEntries = (
  blocks: readonly BlockLike[],
  entries: BlockOutlineEntry[],
): void => {
  for (const block of blocks) {
    if (block.type === 'heading' && typeof block.id === 'string') {
      const level =
        typeof block.props?.level === 'number' &&
        block.props.level >= 1 &&
        block.props.level <= MAX_HEADING_LEVEL
          ? block.props.level
          : 1;

      // Multiple styled runs each contribute a trailing separator space;
      // collapse them so the outline shows natural single-spaced text.
      entries.push({
        blockId: block.id,
        level,
        text: extractTextFromInlineContent(block.content)
          .trim()
          .replace(/\s+/g, ' '),
      });
    }

    if (Array.isArray(block.children)) {
      collectHeadingEntries(block.children, entries);
    }
  }
};

// Accepts `unknown` because the generic Block shape from @blocknote/core is
// structurally awkward to name here; the runtime check does the narrowing.
export const getBlockOutline = (blocks: unknown): BlockOutlineEntry[] => {
  if (!Array.isArray(blocks)) {
    return [];
  }

  const entries: BlockOutlineEntry[] = [];

  collectHeadingEntries(blocks as readonly BlockLike[], entries);

  return entries;
};
