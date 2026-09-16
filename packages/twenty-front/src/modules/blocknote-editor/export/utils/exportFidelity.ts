import { isDefined } from 'twenty-shared/utils';

// Export fidelity/emptiness matrix for the export menu (P3.2). Operates on the
// structural block shape via `unknown` fields — the generic BLOCK_SCHEMA block
// union is not stably nameable here, and the checks are runtime properties.

export type ExportFormat = 'pdf' | 'docx' | 'markdown';

// Machine-readable keys; the menu maps them to localized strings so this util
// stays free of Lingui and trivially testable.
export type ExportFidelityWarning =
  | 'callout-degrades'
  | 'file-omitted'
  | 'mention-degrades';

type ExportBlockInput = {
  type?: unknown;
  content?: unknown;
  children?: unknown;
};

// Blocks whose mere presence counts as exportable content even without inline
// text (their payload lives in props/rows, not in `content` runs).
const ALWAYS_EXPORTED_BLOCK_TYPES = new Set([
  'image',
  'table',
  'file',
  'video',
  'audio',
]);

// The canonical warning order, also the format allow-list: PDF prints the live
// DOM so every rendered block survives; Markdown and DOCX both lose custom
// specs (callout/file are custom in BLOCK_SCHEMA, mention is custom inline).
const WARNINGS_BY_FORMAT: Record<
  ExportFormat,
  readonly ExportFidelityWarning[]
> = {
  pdf: [],
  docx: ['callout-degrades', 'file-omitted', 'mention-degrades'],
  markdown: ['callout-degrades', 'file-omitted', 'mention-degrades'],
};

const hasNonEmptyInlineContent = (content: unknown): boolean => {
  // Non-array content (e.g. the table payload) is real content by definition.
  if (!Array.isArray(content)) {
    return true;
  }

  return content.some((inlineContent) => {
    if (!isDefined(inlineContent) || typeof inlineContent !== 'object') {
      return false;
    }

    const { type: inlineType, text } = inlineContent as {
      type?: unknown;
      text?: unknown;
    };

    if (inlineType === 'text') {
      return typeof text === 'string' && text.trim().length > 0;
    }

    // Link/mention and any future inline kind carry their own payload.
    return true;
  });
};

const walkExportBlocks = (
  documentBlocks: readonly ExportBlockInput[] | null | undefined,
  visitBlock: (blockType: string, block: ExportBlockInput) => void,
): void => {
  if (!Array.isArray(documentBlocks)) {
    return;
  }

  for (const block of documentBlocks) {
    if (!isDefined(block) || typeof block !== 'object') {
      continue;
    }

    const blockType = typeof block.type === 'string' ? block.type : '';

    visitBlock(blockType, block);

    walkExportBlocks(block.children as readonly ExportBlockInput[], visitBlock);
  }
};

export const isDocumentEmptyForExport = (
  documentBlocks: readonly ExportBlockInput[] | null | undefined,
): boolean => {
  if (!Array.isArray(documentBlocks)) {
    return true;
  }

  let hasContent = false;

  walkExportBlocks(documentBlocks, (blockType, block) => {
    if (ALWAYS_EXPORTED_BLOCK_TYPES.has(blockType)) {
      hasContent = true;

      return;
    }

    if (hasNonEmptyInlineContent(block.content)) {
      hasContent = true;
    }
  });

  return !hasContent;
};

export const collectExportFidelityWarnings = (
  documentBlocks: readonly ExportBlockInput[] | null | undefined,
  format: ExportFormat,
): ExportFidelityWarning[] => {
  const foundWarnings = new Set<ExportFidelityWarning>();

  walkExportBlocks(documentBlocks, (blockType, block) => {
    if (blockType === 'callout') {
      foundWarnings.add('callout-degrades');
    }

    if (blockType === 'file') {
      foundWarnings.add('file-omitted');
    }

    if (Array.isArray(block.content)) {
      const hasMention = block.content.some(
        (inlineContent) =>
          isDefined(inlineContent) &&
          typeof inlineContent === 'object' &&
          (inlineContent as { type?: unknown }).type === 'mention',
      );

      if (hasMention) {
        foundWarnings.add('mention-degrades');
      }
    }
  });

  return WARNINGS_BY_FORMAT[format].filter((warning) =>
    foundWarnings.has(warning),
  );
};
