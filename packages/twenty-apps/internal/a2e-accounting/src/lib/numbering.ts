// Per-workspace document sequences. The prefix is a template so a workspace can
// use FA-2026-0001 or DEV20260001 without any code change, and the parser is the
// exact inverse of the builder, which is what makes gap detection trustworthy.

export type NumberingTemplate = {
  prefix: string;
  next: number;
  padding?: number;
};

const DEFAULT_PADDING = 4;

const pad = (value: number, padding: number): string =>
  String(Math.max(0, Math.trunc(value))).padStart(padding, '0');

export const buildDocumentNumber = (
  template: NumberingTemplate,
  issuedAt: Date = new Date(),
): string => {
  const padding = template.padding ?? DEFAULT_PADDING;
  const year = String(issuedAt.getUTCFullYear());
  const month = pad(issuedAt.getUTCMonth() + 1, 2);

  const resolvedPrefix = template.prefix
    .replace(/\{\{YYYY\}\}/g, year)
    .replace(/\{\{YY\}\}/g, year.slice(-2))
    .replace(/\{\{MM\}\}/g, month);

  return `${resolvedPrefix}${pad(template.next, padding)}`;
};

export const parseSequenceNumber = (
  documentNumber: string,
): number | undefined => {
  const trailingDigits = /(\d+)\s*$/.exec(documentNumber);

  if (trailingDigits === null) {
    return undefined;
  }

  return Number.parseInt(trailingDigits[1], 10);
};

// A gap in an invoice sequence is a legal red flag in France (art. L102 B):
// surface them instead of silently renumbering.
export const findSequenceGaps = (documentNumbers: string[]): number[] => {
  const sequences = documentNumbers
    .map(parseSequenceNumber)
    .filter((value): value is number => value !== undefined)
    .sort((left, right) => left - right);

  if (sequences.length === 0) {
    return [];
  }

  const gaps: number[] = [];

  for (let value = sequences[0]; value <= sequences[sequences.length - 1]; value++) {
    if (!sequences.includes(value)) {
      gaps.push(value);
    }
  }

  return gaps;
};

export const nextSequenceFrom = (documentNumbers: string[]): number => {
  const sequences = documentNumbers
    .map(parseSequenceNumber)
    .filter((value): value is number => value !== undefined);

  return sequences.length === 0 ? 1 : Math.max(...sequences) + 1;
};

export const DEFAULT_INVOICE_PREFIX = 'FA-{{YYYY}}-';
export const DEFAULT_QUOTE_PREFIX = 'DE-{{YYYY}}-';
export const DEFAULT_RECEIPT_PREFIX = 'RF-{{YYYY}}-';
