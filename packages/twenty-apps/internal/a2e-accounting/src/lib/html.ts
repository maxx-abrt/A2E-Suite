// Open-data descriptions arrive as HTML fragments. Bilan stores plain text so
// the same string is safe in a table cell, a PDF, a search index and an LLM
// prompt.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  quot: '"',
  lt: '<',
  gt: '>',
  nbsp: ' ',
  euro: '€',
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  agrave: 'à',
  ccedil: 'ç',
  ugrave: 'ù',
  ocirc: 'ô',
  icirc: 'î',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  rsquo: '’',
  deg: '°',
};

export const decodeEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      const replacement = NAMED_ENTITIES[name.toLowerCase()];

      return replacement === undefined ? match : replacement;
    });

export const stripHtml = (
  value: unknown,
  maxLength = 4000,
): string | undefined => {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  const text = decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|div|h\d|tr)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text.length === 0 ? undefined : text.slice(0, maxLength);
};

export const truncate = (value: string, maxLength: number): string =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
