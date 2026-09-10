import { type NormalisedAid } from './subvention-sources.ts';

// Rule-based relevance, no LLM. It is deterministic, explainable and free, and
// it is the fallback Syna (P9) will re-rank on top of — never replace. Every
// point awarded carries its own human-readable reason, so the UI can always
// answer "why is this here?".

export type OrgMatchProfile = {
  structureKind?: string;
  categories?: string[];
  regions?: string[];
  keywords?: string[];
  isEuropeanEligible?: boolean;
};

export type MatchExplanation = { points: number; reason: string };

export type MatchResult = {
  score: number;
  reasons: string[];
  explanations: MatchExplanation[];
};

const STRUCTURE_TO_AUDIENCE: Record<string, string> = {
  ASSOCIATION: 'ASSOCIATION',
  ENTREPRISE: 'ENTREPRISE',
  COLLECTIVITE: 'COLLECTIVITE',
  INDIVIDUEL: 'PARTICULIER',
};

const normalise = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const scoreSubvention = (
  aid: Pick<
    NormalisedAid,
    | 'audiences'
    | 'categories'
    | 'region'
    | 'perimeterScale'
    | 'searchText'
    | 'submissionDeadline'
    | 'isEuropean'
    | 'isCallForProject'
  >,
  profile: OrgMatchProfile,
  reference: Date = new Date(),
): MatchResult => {
  const explanations: MatchExplanation[] = [];

  const expectedAudience = profile.structureKind
    ? STRUCTURE_TO_AUDIENCE[profile.structureKind.toUpperCase()]
    : undefined;

  if (expectedAudience !== undefined) {
    if (aid.audiences.includes(expectedAudience)) {
      explanations.push({
        points: 35,
        reason: `Public visé compatible (${expectedAudience.toLowerCase()})`,
      });
    } else if (aid.audiences.length > 0) {
      explanations.push({
        points: -25,
        reason: "Public visé différent de votre type de structure",
      });
    }
  }

  const profileCategories = (profile.categories ?? []).map(normalise);
  const aidCategories = aid.categories.map(normalise);
  const matchedCategories = aidCategories.filter((category) =>
    profileCategories.some(
      (wanted) => category.includes(wanted) || wanted.includes(category),
    ),
  );

  if (matchedCategories.length > 0) {
    explanations.push({
      points: Math.min(30, 15 * matchedCategories.length),
      reason: `Thématique alignée : ${matchedCategories.slice(0, 3).join(', ')}`,
    });
  }

  const keywords = (profile.keywords ?? []).map(normalise).filter(Boolean);
  const matchedKeywords = keywords.filter((keyword) =>
    aid.searchText.includes(keyword),
  );

  if (matchedKeywords.length > 0) {
    explanations.push({
      points: Math.min(20, 7 * matchedKeywords.length),
      reason: `Mots-clés de votre projet trouvés : ${matchedKeywords.slice(0, 3).join(', ')}`,
    });
  }

  const regions = (profile.regions ?? []).map(normalise);

  if (aid.region && regions.some((region) => normalise(aid.region ?? '').includes(region))) {
    explanations.push({ points: 15, reason: `Périmètre régional correspondant` });
  } else if (aid.perimeterScale === 'NATIONAL' || aid.perimeterScale === undefined) {
    explanations.push({ points: 5, reason: 'Dispositif national, ouvert partout' });
  }

  if (aid.isEuropean && profile.isEuropeanEligible === false) {
    explanations.push({
      points: -15,
      reason: 'Dispositif européen, exigences de cofinancement lourdes',
    });
  }

  if (aid.submissionDeadline !== undefined) {
    const daysLeft = Math.round(
      (Date.parse(aid.submissionDeadline) - reference.getTime()) / 86_400_000,
    );

    if (daysLeft < 0) {
      explanations.push({ points: -60, reason: 'Date limite dépassée' });
    } else if (daysLeft <= 14) {
      explanations.push({
        points: 12,
        reason: `Clôture imminente : ${daysLeft} jour(s)`,
      });
    } else if (daysLeft <= 60) {
      explanations.push({ points: 8, reason: `Clôture dans ${daysLeft} jours` });
    }
  } else {
    explanations.push({ points: 3, reason: 'Dépôt au fil de l’eau' });
  }

  if (aid.isCallForProject) {
    explanations.push({ points: 4, reason: 'Appel à projets identifié' });
  }

  const rawScore = explanations.reduce(
    (total, explanation) => total + explanation.points,
    0,
  );

  return {
    score: Math.max(0, Math.min(100, rawScore)),
    reasons: explanations
      .filter((explanation) => explanation.points !== 0)
      .map((explanation) => explanation.reason),
    explanations,
  };
};

export type SubventionFilters = {
  query?: string;
  audiences?: string[];
  perimeterScales?: string[];
  aidTypes?: string[];
  onlyCallForProject?: boolean;
  onlyOpen?: boolean;
  deadlineWithinDays?: number;
};

export const filterSubventions = <
  T extends Pick<
    NormalisedAid,
    | 'searchText'
    | 'audiences'
    | 'perimeterScale'
    | 'aidTypes'
    | 'isCallForProject'
    | 'submissionDeadline'
    | 'isLive'
  >,
>(
  aids: T[],
  filters: SubventionFilters,
  reference: Date = new Date(),
): T[] => {
  const query = filters.query ? normalise(filters.query) : undefined;
  const queryTerms = query ? query.split(/\s+/).filter(Boolean) : [];

  return aids.filter((aid) => {
    if (aid.isLive === false) {
      return false;
    }

    if (
      queryTerms.length > 0 &&
      !queryTerms.every((term) => aid.searchText.includes(term))
    ) {
      return false;
    }

    if (
      filters.audiences?.length &&
      !filters.audiences.some((audience) => aid.audiences.includes(audience))
    ) {
      return false;
    }

    if (
      filters.perimeterScales?.length &&
      !filters.perimeterScales.includes(aid.perimeterScale ?? 'AUTRE')
    ) {
      return false;
    }

    if (
      filters.aidTypes?.length &&
      !filters.aidTypes.some((aidType) =>
        aid.aidTypes.some((candidate) => normalise(candidate).includes(normalise(aidType))),
      )
    ) {
      return false;
    }

    if (filters.onlyCallForProject === true && !aid.isCallForProject) {
      return false;
    }

    if (aid.submissionDeadline !== undefined) {
      const daysLeft = Math.round(
        (Date.parse(aid.submissionDeadline) - reference.getTime()) / 86_400_000,
      );

      if (filters.onlyOpen === true && daysLeft < 0) {
        return false;
      }

      if (
        filters.deadlineWithinDays !== undefined &&
        (daysLeft < 0 || daysLeft > filters.deadlineWithinDays)
      ) {
        return false;
      }
    } else if (filters.deadlineWithinDays !== undefined) {
      return false;
    }

    return true;
  });
};

// Cache key for every expensive AI call (P9): kind + model + payload digest +
// catalogue version. A catalogue refresh bumps the version, which invalidates
// exactly the runs whose input actually changed.
export const buildAiCacheKey = (input: {
  kind: string;
  model: string;
  payloadHash: string;
  catalogVersion: number;
}): string =>
  `${input.kind}|${input.model}|${input.catalogVersion}|${input.payloadHash}`;
