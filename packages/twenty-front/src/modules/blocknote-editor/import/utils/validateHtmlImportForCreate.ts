import { hasUnsafeHtmlImportMarkup } from '@/blocknote-editor/import/utils/htmlImportWarnings';

export type HtmlImportRejectionReason =
  | 'empty-import'
  | 'no-importable-blocks'
  | 'unsafe-residue';

export type HtmlImportValidation = {
  valid: boolean;
  reasons: HtmlImportRejectionReason[];
};

// Pre-create gate: a document record must never be written from an import that
// is empty or still carries unsafe markup. Fail-closed — any reason rejects.
export const validateHtmlImportForCreate = (args: {
  sanitizedHtml: string;
  blocks: readonly unknown[];
}): HtmlImportValidation => {
  const reasons: HtmlImportRejectionReason[] = [];

  if (args.sanitizedHtml.trim().length === 0) {
    reasons.push('empty-import');
  }

  if (!Array.isArray(args.blocks) || args.blocks.length === 0) {
    reasons.push('no-importable-blocks');
  }

  if (hasUnsafeHtmlImportMarkup(args.sanitizedHtml)) {
    reasons.push('unsafe-residue');
  }

  return { valid: reasons.length === 0, reasons };
};
