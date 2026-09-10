import type { NormalisedAid } from './subvention-sources.ts';

// Ce que l'ingestion décide, sans rien savoir de la base : quelles sources sont
// actives, à quoi ressemble une ligne de catalogue, et si une aide a bougé.
// Tout ce qui est ici est pur, donc testable sans serveur.

export const INGESTABLE_SOURCES = [
  'AIDES_TERRITOIRES',
  'CARENEWS',
  'CURATED',
] as const;

export type IngestableSource = (typeof INGESTABLE_SOURCES)[number];

export const SOURCE_LABELS: Record<IngestableSource, string> = {
  AIDES_TERRITOIRES: 'Aides-territoires (API de l’État)',
  CARENEWS: 'Carenews — appels à projets',
  CURATED: 'Dispositifs nationaux référencés',
};

export const SOURCE_DOC_URLS: Record<IngestableSource, string> = {
  AIDES_TERRITOIRES: 'https://aides-territoires.beta.gouv.fr/api/',
  CARENEWS: 'https://www.carenews.com/appels_a_projets',
  CURATED: 'https://www.associations.gouv.fr/',
};

// Une liste vide vaut « les trois sources » : un déploiement qui oublie la
// variable doit ingérer tout, pas rien.
export const resolveEnabledSources = (
  requested: string[] | undefined,
  configured: string | undefined,
): IngestableSource[] => {
  const raw =
    requested !== undefined && requested.length > 0
      ? requested
      : (configured ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);

  if (raw.length === 0) {
    return [...INGESTABLE_SOURCES];
  }

  const normalised = raw.map((value) => value.toUpperCase().replace(/-/g, '_'));

  return INGESTABLE_SOURCES.filter((source) => normalised.includes(source));
};

export type StoredSubvention = {
  id: string;
  sourceKey: string;
  contentHash?: string | null;
  isLive?: boolean | null;
};

export type IngestDecision =
  | { action: 'CREATE' }
  | { action: 'UPDATE'; id: string }
  | { action: 'UNCHANGED'; id: string };

// Une aide inchangée et toujours active ne coûte aucune écriture : c'est ce qui
// rend une exécution nocturne quasi gratuite.
export const decideIngest = (
  aid: Pick<NormalisedAid, 'sourceKey' | 'contentHash'>,
  stored: StoredSubvention | undefined,
): IngestDecision => {
  if (stored === undefined) {
    return { action: 'CREATE' };
  }

  if (stored.contentHash === aid.contentHash && stored.isLive === true) {
    return { action: 'UNCHANGED', id: stored.id };
  }

  return { action: 'UPDATE', id: stored.id };
};

export const toSubventionRecord = (
  aid: NormalisedAid,
  catalogVersion: number,
  seenAt: string,
): Record<string, unknown> => ({
  title: aid.title,
  source: aid.source,
  sourceId: aid.sourceId,
  sourceKey: aid.sourceKey,
  slug: aid.slug ?? null,
  description: aid.description ?? null,
  eligibility: aid.eligibility ?? null,
  financers: aid.financers,
  instructors: aid.instructors,
  programs: aid.programs,
  audiences: aid.audiences,
  aidTypes: aid.aidTypes,
  categories: aid.categories,
  perimeter: aid.perimeter ?? null,
  perimeterScale: aid.perimeterScale ?? null,
  region: aid.region ?? null,
  isCallForProject: aid.isCallForProject,
  startDate: aid.startDate ?? null,
  submissionDeadline: aid.submissionDeadline ?? null,
  predepositDate: aid.predepositDate ?? null,
  publishedAt: aid.publishedAt ?? null,
  rateMin: aid.rateMin ?? null,
  rateMax: aid.rateMax ?? null,
  amountHint: aid.amountHint ?? null,
  // LINKS composite : lien principal vers la fiche officielle, lien secondaire
  // vers le dépôt du dossier quand la source le distingue.
  links: {
    primaryLinkUrl: aid.url,
    primaryLinkLabel: 'Fiche officielle',
    secondaryLinks:
      aid.applicationUrl !== undefined && aid.applicationUrl !== aid.url
        ? [{ url: aid.applicationUrl, label: 'Déposer un dossier' }]
        : [],
  },
  contact: aid.contact ?? null,
  recurrence: aid.recurrence ?? null,
  isEuropean: aid.isEuropean,
  isLive: aid.isLive,
  searchText: aid.searchText,
  contentHash: aid.contentHash,
  lastSeenAt: seenAt,
  catalogVersion,
});

// Une aide disparue en amont est retirée, jamais supprimée : les dossiers qui la
// citent gardent leur histoire.
export const findAidsToRetire = (
  source: IngestableSource,
  seenKeys: Set<string>,
  stored: Iterable<StoredSubvention>,
): StoredSubvention[] => {
  const toRetire: StoredSubvention[] = [];

  for (const record of stored) {
    if (
      record.sourceKey.startsWith(`${source}:`) &&
      !seenKeys.has(record.sourceKey) &&
      record.isLive !== false
    ) {
      toRetire.push(record);
    }
  }

  return toRetire;
};
