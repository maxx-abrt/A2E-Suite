// Word/character count for the document page chrome (M8c). Operates on the
// markdown projection of the RICH_TEXT field, like document-outline.ts: the
// blocknote AST is not parseable in the sandbox without the editor bundle.
//
// The count is what a writer expects from a reading control — prose words, not
// markdown tokens. Fence markers, heading hashes, list bullets, link syntax and
// emphasis characters are stripped before counting; fenced code is kept (a code
// block is still content the writer wrote).

const leadingMarkdownSyntax = /^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+|```[^\s]*)/;

const stripInlineMarkdown = (line: string): string =>
  line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/[*_~]{1,3}/g, '');

const prepareCountableText = (
  markdown: string | null | undefined,
): string[] => {
  if (!markdown) {
    return [];
  }

  const lines: string[] = [];
  let isInsideFence = false;

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();

    if (line.startsWith('```')) {
      isInsideFence = !isInsideFence;
      continue;
    }

    if (line === '') {
      continue;
    }

    if (isInsideFence) {
      lines.push(line);
      continue;
    }

    lines.push(stripInlineMarkdown(line.replace(leadingMarkdownSyntax, '')));
  }

  return lines;
};

const WORD_PATTERN = /[\p{L}\p{N}]+/gu;

export const countDocumentWords = (
  markdown: string | null | undefined,
): number => {
  const text = prepareCountableText(markdown).join(' ');
  const matches = text.match(WORD_PATTERN);

  return matches === null ? 0 : matches.length;
};

export const countDocumentCharacters = (
  markdown: string | null | undefined,
): number => prepareCountableText(markdown).join('\n').length;
