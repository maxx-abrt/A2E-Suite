import {
  type CarenewsRawCall,
  normaliseCarenewsCall,
  type NormalisedAid,
} from './subvention-sources.ts';

// Carenews has no API, so the listing page is the contract. Every call is a
// `job-thumbnail` block with the same five labelled slots, which is stable
// enough to read with anchored patterns — and cheap to re-point if the markup
// changes, because nothing else in Bilan knows about HTML.

const BLOCK_SEPARATOR = 'class="job-thumbnail"';

const TITLE_PATTERN =
  /job-thumbnail__title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/;

const decodeEntities = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&rsquo;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();

const slot = (block: string, cssSuffix: string): string | undefined => {
  const pattern = new RegExp(
    `job-thumbnail__${cssSuffix}">([\\s\\S]*?)<\\/div>`,
  );
  const match = pattern.exec(block);

  if (match === null) {
    return undefined;
  }

  const text = decodeEntities(match[1]);

  return text.length === 0 ? undefined : text;
};

const stripLabel = (value: string | undefined): string | undefined =>
  value?.replace(/^(Publié le|Date de clôture|Par)\s*:?\s*/i, '').trim() ||
  undefined;

export const parseCarenewsListing = (html: string): CarenewsRawCall[] => {
  const blocks = html.split(BLOCK_SEPARATOR).slice(1);
  const calls: CarenewsRawCall[] = [];

  for (const block of blocks) {
    const titleMatch = TITLE_PATTERN.exec(block);

    if (titleMatch === null) {
      continue;
    }

    const [, path, rawTitle] = titleMatch;
    const title = decodeEntities(rawTitle);

    if (title.length === 0 || !path.includes('/appels-a-projet')) {
      continue;
    }

    calls.push({
      path,
      title,
      description: slot(block, 'text'),
      publisher: stripLabel(slot(block, 'company')),
      publishedAtLabel: stripLabel(slot(block, 'date-start')),
      deadlineLabel: stripLabel(slot(block, 'date-end')),
    });
  }

  return calls;
};

export const parseCarenewsAids = (html: string): NormalisedAid[] =>
  parseCarenewsListing(html)
    .map((call) => normaliseCarenewsCall(call))
    .filter((aid): aid is NormalisedAid => aid !== undefined);
