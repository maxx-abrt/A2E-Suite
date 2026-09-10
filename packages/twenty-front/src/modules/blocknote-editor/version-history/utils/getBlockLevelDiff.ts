type InlineContentLike = {
  text?: unknown;
  content?: readonly InlineContentLike[];
};

type DiffBlockLike = {
  id?: string;
  type?: unknown;
  content?: unknown;
  children?: readonly DiffBlockLike[];
};

export type BlockDiffEntry = {
  blockId: string;
  blockType: string;
  status: 'added' | 'removed' | 'changed';
  previousText?: string;
  nextText?: string;
};

const extractText = (block: DiffBlockLike): string => {
  if (!Array.isArray(block.content)) {
    return '';
  }

  let text = '';

  for (const inlineContentItem of block.content as InlineContentLike[]) {
    if (typeof inlineContentItem?.text === 'string') {
      text += `${inlineContentItem.text} `;
      continue;
    }

    if (Array.isArray(inlineContentItem?.content)) {
      text += extractText(inlineContentItem as DiffBlockLike);
    }
  }

  return text.trim();
};

const indexBlocksById = (blocks: readonly DiffBlockLike[]) => {
  const blocksById = new Map<string, DiffBlockLike>();

  for (const block of blocks) {
    if (typeof block.id === 'string') {
      blocksById.set(block.id, block);
    }
  }

  return blocksById;
};

// Block-level v1 diff: identity is the blocknote block id, so pure text edits
// show as "changed" and paste/reorder show as add+remove pairs. Word-level or
// character-level diffing is out of scope for v1.
export const getBlockLevelDiff = (
  previousBlocks: readonly DiffBlockLike[] | null,
  nextBlocks: readonly DiffBlockLike[] | null,
): BlockDiffEntry[] => {
  const entries: BlockDiffEntry[] = [];

  const previousById = indexBlocksById(previousBlocks ?? []);
  const nextById = indexBlocksById(nextBlocks ?? []);

  for (const [blockId, nextBlock] of nextById) {
    const previousBlock = previousById.get(blockId);

    if (previousBlock === undefined) {
      entries.push({
        blockId,
        blockType: String(nextBlock.type ?? ''),
        status: 'added',
        nextText: extractText(nextBlock),
      });
      continue;
    }

    const previousText = extractText(previousBlock);
    const nextText = extractText(nextBlock);

    if (
      previousText !== nextText ||
      String(previousBlock.type ?? '') !== String(nextBlock.type ?? '')
    ) {
      entries.push({
        blockId,
        blockType: String(nextBlock.type ?? ''),
        status: 'changed',
        previousText,
        nextText,
      });
    }
  }

  for (const [blockId, previousBlock] of previousById) {
    if (!nextById.has(blockId)) {
      entries.push({
        blockId,
        blockType: String(previousBlock.type ?? ''),
        status: 'removed',
        previousText: extractText(previousBlock),
      });
    }
  }

  return entries;
};
