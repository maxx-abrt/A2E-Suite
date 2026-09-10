import { stripHtml } from './html.ts';

// BILAN — subvention source adapters.
//
// Everything here is public and refreshable daily:
//
//  1. `AIDES_TERRITOIRES` — the French state's own aid aggregator
//     (aides-territoires.beta.gouv.fr). ~3 200 live aids including calls for
//     projects, with eligibility, audiences, perimeter, deadlines and rates.
//     Auth: a permanent X-AUTH-TOKEN is exchanged for a 24 h Bearer.
//  2. `CARENEWS` — the reference French feed of foundation / corporate calls
//     for projects (appels à projets), which no public API exposes.
//  3. `CURATED` — the national schemes every association or small structure
//     actually asks about, with their official application URL. Stable
//     programmes that live behind a portal; an explicit versioned list beats
//     scraping and never goes stale silently.
//
// All three normalise into ONE shape before storage, so the catalogue, the
// filters and the ranker only ever see one vocabulary.

export type SubventionSourceKey =
  | 'AIDES_TERRITOIRES'
  | 'CARENEWS'
  | 'CURATED'
  | 'MANUAL';

export type NormalisedAid = {
  source: SubventionSourceKey;
  sourceId: string;
  sourceKey: string;
  slug?: string;
  title: string;
  shortTitle?: string;
  description?: string;
  eligibility?: string;
  financers: string[];
  instructors: string[];
  programs: string[];
  audiences: string[];
  aidTypes: string[];
  categories: string[];
  perimeter?: string;
  perimeterScale?: string;
  region?: string;
  isCallForProject: boolean;
  startDate?: string;
  submissionDeadline?: string;
  predepositDate?: string;
  publishedAt?: string;
  rateMin?: number;
  rateMax?: number;
  amountHint?: string;
  url: string;
  applicationUrl?: string;
  contact?: string;
  recurrence?: string;
  isEuropean: boolean;
  isLive: boolean;
  searchText: string;
  contentHash: string;
};

export const AUDIENCES = [
  'ASSOCIATION',
  'ENTREPRISE',
  'COLLECTIVITE',
  'ETABLISSEMENT_PUBLIC',
  'PARTICULIER',
  'AGRICULTEUR',
  'RECHERCHE',
] as const;

export const PERIMETER_SCALES = [
  'EUROPEEN',
  'NATIONAL',
  'REGION',
  'DEPARTEMENT',
  'COMMUNE',
  'AUTRE',
] as const;

export const buildSourceKey = (
  source: SubventionSourceKey,
  sourceId: string,
): string => `${source}:${sourceId}`;

export const normaliseAudiences = (raw: unknown): string[] => {
  const list = Array.isArray(raw) ? raw.map((item) => String(item).toLowerCase()) : [];
  const audiences = new Set<string>();

  for (const item of list) {
    if (item.includes('association')) {
      audiences.add('ASSOCIATION');
    } else if (
      item.includes('entreprise') ||
      item.includes('pme') ||
      item.includes('tpe') ||
      item.includes('commerçant') ||
      item.includes('artisan')
    ) {
      audiences.add('ENTREPRISE');
    } else if (
      item.includes('commune') ||
      item.includes('epci') ||
      item.includes('collectivit') ||
      item.includes('intercommunalit') ||
      item.includes('syndicat') ||
      item.includes('département') ||
      item.includes('departement') ||
      item.includes('région') ||
      item.includes('region')
    ) {
      audiences.add('COLLECTIVITE');
    } else if (item.includes('public')) {
      audiences.add('ETABLISSEMENT_PUBLIC');
    } else if (item.includes('particulier') || item.includes('habitant')) {
      audiences.add('PARTICULIER');
    } else if (item.includes('agricult') || item.includes('exploitant')) {
      audiences.add('AGRICULTEUR');
    } else if (
      item.includes('recherche') ||
      item.includes('universit') ||
      item.includes('enseignement')
    ) {
      audiences.add('RECHERCHE');
    }
    // Anything outside the fixed vocabulary is intentionally dropped: the
    // filters must stay a short, readable, translatable list.
  }

  return [...audiences];
};

export const normalisePerimeterScale = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string' || raw.length === 0) {
    return undefined;
  }

  const value = raw.toLowerCase();

  if (value.includes('europe')) return 'EUROPEEN';
  if (value.includes('pays') || value.includes('national')) return 'NATIONAL';
  if (value.includes('région') || value.includes('region')) return 'REGION';
  if (value.includes('départ') || value.includes('depart')) return 'DEPARTEMENT';
  if (value.includes('commune') || value.includes('ville')) return 'COMMUNE';

  return 'AUTRE';
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];

const isoDate = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
};

const numberOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const buildSearchText = (
  aid: Pick<
    NormalisedAid,
    'title' | 'description' | 'eligibility' | 'financers' | 'categories' | 'programs'
  >,
): string =>
  [
    aid.title,
    aid.description ?? '',
    aid.eligibility ?? '',
    aid.financers.join(' '),
    aid.programs.join(' '),
    aid.categories.join(' '),
  ]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);

// A stable non-cryptographic digest: the ingest only writes a row when the
// content actually changed, which keeps the daily cron cheap and the record
// timeline readable. Not a security primitive.
export const contentHash = (value: string): string => {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x01000193;

  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);

    hash1 = (hash1 ^ code) >>> 0;
    hash1 = (hash1 * 0x01000193) >>> 0;
    hash2 = (hash2 + code * (index + 1)) >>> 0;
  }

  return `${hash1.toString(16).padStart(8, '0')}${hash2.toString(16).padStart(8, '0')}`;
};

const finalise = (
  aid: Omit<NormalisedAid, 'searchText' | 'contentHash' | 'sourceKey'>,
): NormalisedAid => {
  const searchText = buildSearchText(aid);

  return {
    ...aid,
    sourceKey: buildSourceKey(aid.source, aid.sourceId),
    searchText,
    contentHash: contentHash(
      [
        aid.title,
        aid.description ?? '',
        aid.eligibility ?? '',
        aid.submissionDeadline ?? '',
        aid.applicationUrl ?? '',
        String(aid.isLive),
      ].join('|'),
    ),
  };
};

// The curated list ships without the derived fields, so callers finalise it the
// same way the two live adapters do.
export const finaliseAid = finalise;

export const AIDES_TERRITOIRES_BASE_URL =
  'https://aides-territoires.beta.gouv.fr';
export const normaliseAidesTerritoiresAid = (
  aid: Record<string, unknown>,
): NormalisedAid | undefined => {
  const title = String(aid.name ?? '').trim();

  if (title.length <= 2) {
    return undefined;
  }

  const path = typeof aid.url === 'string' ? aid.url : undefined;

  return finalise({
    source: 'AIDES_TERRITOIRES',
    sourceId: String(aid.id ?? ''),
    slug: typeof aid.slug === 'string' ? aid.slug : undefined,
    title,
    shortTitle:
      typeof aid.short_title === 'string' && aid.short_title.length > 0
        ? aid.short_title
        : undefined,
    description: stripHtml(aid.description),
    eligibility: stripHtml(aid.eligibility),
    financers: strings(aid.financers),
    instructors: strings(aid.instructors),
    programs: strings(aid.programs),
    audiences: normaliseAudiences(aid.targeted_audiences),
    aidTypes: strings(aid.aid_types),
    categories: strings(aid.categories)
      .map((category) => category.split('/').pop()?.trim() ?? '')
      .filter(Boolean),
    perimeter: typeof aid.perimeter === 'string' ? aid.perimeter : undefined,
    perimeterScale: normalisePerimeterScale(aid.perimeter_scale),
    region: typeof aid.region === 'string' ? aid.region : undefined,
    isCallForProject: aid.is_call_for_project === true,
    startDate: isoDate(aid.start_date),
    submissionDeadline: isoDate(aid.submission_deadline),
    predepositDate: isoDate(aid.predeposit_date),
    publishedAt: isoDate(aid.date_created),
    rateMin: numberOrUndefined(aid.subvention_rate_lower_bound),
    rateMax: numberOrUndefined(aid.subvention_rate_upper_bound),
    amountHint:
      [aid.subvention_comment, aid.loan_amount, aid.recoverable_advance_amount]
        .map((value) =>
          value === null || value === undefined || value === ''
            ? ''
            : String(value),
        )
        .filter(Boolean)
        .join(' · ') || undefined,
    url:
      path !== undefined
        ? `${AIDES_TERRITOIRES_BASE_URL}${path}`
        : `${AIDES_TERRITOIRES_BASE_URL}/aides/${String(aid.slug ?? '')}`,
    applicationUrl:
      (typeof aid.application_url === 'string' && aid.application_url) ||
      (typeof aid.origin_url === 'string' && aid.origin_url) ||
      undefined,
    contact: stripHtml(aid.contact, 500),
    recurrence: typeof aid.recurrence === 'string' ? aid.recurrence : undefined,
    isEuropean: aid.european_aid === true,
    isLive: aid.is_live !== false,
  });
};

export const CARENEWS_BASE_URL = 'https://www.carenews.com';

export type CarenewsRawCall = {
  path: string;
  title: string;
  description?: string;
  publisher?: string;
  publishedAtLabel?: string;
  deadlineLabel?: string;
};

// Carenews prints French short dates (DD.MM.YYYY).
export const parseFrenchShortDate = (
  value: string | undefined,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const match = /(\d{2})[./](\d{2})[./](\d{4})/.exec(value);

  if (match === null) {
    return undefined;
  }

  const [, day, month, year] = match;

  return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
};

export const normaliseCarenewsCall = (
  call: CarenewsRawCall,
): NormalisedAid | undefined => {
  const title = call.title.replace(/\s*-\s*$/, '').trim();
  const sourceId = call.path.split('/').filter(Boolean).pop() ?? '';

  if (title.length <= 2 || sourceId.length === 0) {
    return undefined;
  }

  const publisher = call.publisher?.trim();

  return finalise({
    source: 'CARENEWS',
    sourceId,
    slug: sourceId,
    title,
    description: stripHtml(call.description),
    eligibility: undefined,
    financers: publisher ? [publisher] : [],
    instructors: [],
    programs: [],
    audiences: ['ASSOCIATION'],
    aidTypes: ['Appel à projets'],
    categories: ['Appel à projets'],
    perimeter: 'France',
    perimeterScale: 'NATIONAL',
    isCallForProject: true,
    submissionDeadline: parseFrenchShortDate(call.deadlineLabel),
    publishedAt: parseFrenchShortDate(call.publishedAtLabel),
    url: call.path.startsWith('http')
      ? call.path
      : `${CARENEWS_BASE_URL}${call.path}`,
    applicationUrl: call.path.startsWith('http')
      ? call.path
      : `${CARENEWS_BASE_URL}${call.path}`,
    isEuropean: false,
    isLive: true,
  });
};

export const isStillOpen = (
  aid: Pick<NormalisedAid, 'submissionDeadline'>,
  reference: Date = new Date(),
): boolean => {
  if (aid.submissionDeadline === undefined) {
    return true;
  }

  return Date.parse(aid.submissionDeadline) >= reference.getTime() - 86_400_000;
};
