import {
  defineLogicFunction,
  HTTPMethod,
  type RoutePayload,
} from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import {
  buildAiCacheKey,
  filterSubventions,
  type OrgMatchProfile,
  scoreSubvention,
} from '../lib/subvention-matching.ts';
import { contentHash } from '../lib/subvention-sources.ts';
import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  createRecords,
  findAllRecords,
  findOneRecord,
  todayIso,
  updateRecord,
} from './utils/records.ts';

// SUBVENTION MATCHING — the deterministic half.
//
// This is the whole matching pipeline except the language model: it reads the
// org profile, filters the catalogue, ranks it with explainable rules, and
// stores the run in the shared LLM cache under the exact key an LLM call will
// use later (kind + model + payload digest + catalogue version). When Syna (P9)
// lands, it re-ranks the top of this list and writes its answer to the same
// cache row — so re-opening a past analysis costs zero tokens, today and then.

const RULES_MODEL = 'bilan.rules.v1';
const CACHE_KIND = 'SUBVENTION_MATCH';
const DEFAULT_LIMIT = 25;

type OrgProfileRecord = {
  id: string;
  structureKind?: string | null;
  matchCategories?: string[] | null;
  matchRegions?: string[] | null;
  matchKeywords?: string[] | null;
  projectSummary?: string | null;
};

type SubventionRecord = {
  id: string;
  title?: string | null;
  searchText?: string | null;
  audiences?: string[] | null;
  categories?: string[] | null;
  aidTypes?: string[] | null;
  region?: string | null;
  perimeterScale?: string | null;
  submissionDeadline?: string | null;
  isEuropean?: boolean | null;
  isCallForProject?: boolean | null;
  isLive?: boolean | null;
  catalogVersion?: number | null;
};

type MatchOptions = {
  limit?: number;
  onlyOpen?: boolean;
  onlyCallForProject?: boolean;
  audiences?: string[];
  query?: string;
  forceRefresh?: boolean;
};

const toMatchProfile = (
  profile: OrgProfileRecord | undefined,
): OrgMatchProfile => ({
  structureKind: profile?.structureKind ?? undefined,
  categories: profile?.matchCategories ?? [],
  regions: profile?.matchRegions ?? [],
  keywords: profile?.matchKeywords ?? [],
  isEuropeanEligible: true,
});

const toScorable = (record: SubventionRecord) => ({
  audiences: record.audiences ?? [],
  categories: record.categories ?? [],
  aidTypes: record.aidTypes ?? [],
  region: record.region ?? undefined,
  perimeterScale: record.perimeterScale ?? undefined,
  searchText: record.searchText ?? '',
  submissionDeadline: record.submissionDeadline ?? undefined,
  isEuropean: record.isEuropean === true,
  isCallForProject: record.isCallForProject === true,
  isLive: record.isLive !== false,
});

const runMatch = async (options: MatchOptions) => {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), 100);
  const client = coreClient();

  const profile = await findOneRecord<OrgProfileRecord>(
    client,
    'orgProfiles',
    {
      id: true,
      structureKind: true,
      matchCategories: true,
      matchRegions: true,
      matchKeywords: true,
      projectSummary: true,
    },
    {},
  );

  const catalogue = await findAllRecords<SubventionRecord>(
    client,
    'subventions',
    {
      id: true,
      title: true,
      searchText: true,
      audiences: true,
      categories: true,
      aidTypes: true,
      region: true,
      perimeterScale: true,
      submissionDeadline: true,
      isEuropean: true,
      isCallForProject: true,
      isLive: true,
      catalogVersion: true,
    },
    { filter: { isLive: { eq: true } } },
  );

  const matchProfile = toMatchProfile(profile);
  const catalogVersion = catalogue.reduce(
    (highest, record) => Math.max(highest, record.catalogVersion ?? 0),
    0,
  );

  const payloadHash = contentHash(
    JSON.stringify({
      profile: matchProfile,
      options: {
        limit,
        onlyOpen: options.onlyOpen ?? true,
        onlyCallForProject: options.onlyCallForProject ?? false,
        audiences: options.audiences ?? [],
        query: options.query ?? '',
      },
    }),
  );

  const cacheKey = buildAiCacheKey({
    kind: CACHE_KIND,
    model: RULES_MODEL,
    payloadHash,
    catalogVersion,
  });

  const cached = await findOneRecord<{
    id: string;
    response?: unknown;
    hits?: number | null;
  }>(
    client,
    'aiCacheEntries',
    { id: true, response: true, hits: true },
    { cacheKey: { eq: cacheKey } },
  );

  if (cached !== undefined && options.forceRefresh !== true) {
    await updateRecord(client, 'updateAiCacheEntry', cached.id, {
      hits: (cached.hits ?? 0) + 1,
      lastHitAt: todayIso(),
    });

    return { fromCache: true, cacheKey, ...(cached.response as object) };
  }

  const eligible = filterSubventions(
    catalogue.map((record) => ({ ...record, ...toScorable(record) })),
    {
      query: options.query,
      audiences: options.audiences,
      onlyOpen: options.onlyOpen ?? true,
      onlyCallForProject: options.onlyCallForProject,
    },
  );

  const ranked = eligible
    .map((record) => {
      const match = scoreSubvention(toScorable(record), matchProfile);

      return {
        subventionId: record.id,
        title: record.title ?? '',
        submissionDeadline: record.submissionDeadline ?? null,
        score: match.score,
        reasons: match.reasons,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  const response = {
    model: RULES_MODEL,
    catalogVersion,
    candidates: catalogue.length,
    eligible: eligible.length,
    results: ranked,
    ranAt: todayIso(),
  };

  await createRecords(client, 'createAiCacheEntries', [
    {
      cacheKey,
      cacheKind: CACHE_KIND,
      model: RULES_MODEL,
      payloadHash,
      catalogVersion,
      response,
      hits: 1,
      costMicros: 0,
      lastHitAt: todayIso(),
    },
  ]);

  console.log('[bilan] Classement des subventions calculé', {
    candidates: catalogue.length,
    eligible: eligible.length,
    kept: ranked.length,
  });

  return { fromCache: false, cacheKey, ...response };
};

const handler = async (event: RoutePayload): Promise<Response> => {
  const options = (event.body as MatchOptions | null) ?? {};

  try {
    const result = await runMatch(options);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.scoreSubventions,
  name: 'score-subventions',
  description:
    "Classe le catalogue de subventions selon le profil de la structure, avec la raison de chaque point attribué. Résultat mis en cache : réouvrir une analyse ne coûte rien. Prêt à être re-classé par l'IA sans changer de contrat.",
  timeoutSeconds: 120,
  httpRouteTriggerSettings: {
    path: '/subventions/match',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler,
});
