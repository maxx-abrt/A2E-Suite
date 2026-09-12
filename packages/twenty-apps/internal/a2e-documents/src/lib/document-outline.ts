// Outline extraction for the document page widget. Operates on the markdown
// projection of the RICH_TEXT field (blocknote AST is not parseable in the
// sandbox without the editor bundle); fenced code blocks are skipped so
// `# comments` inside them never leak into the outline.

export type DocumentOutlineEntry = {
  level: number;
  text: string;
};

const MAX_HEADING_LEVEL = 6;

export const extractOutline = (
  markdown: string | null | undefined,
): DocumentOutlineEntry[] => {
  if (!markdown) {
    return [];
  }

  const entries: DocumentOutlineEntry[] = [];
  let isInsideFence = false;

  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      isInsideFence = !isInsideFence;
      continue;
    }

    if (isInsideFence) {
      continue;
    }

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);

    if (match) {
      entries.push({
        level: Math.min(match[1].length, MAX_HEADING_LEVEL),
        text: match[2],
      });
    }
  }

  return entries;
};
