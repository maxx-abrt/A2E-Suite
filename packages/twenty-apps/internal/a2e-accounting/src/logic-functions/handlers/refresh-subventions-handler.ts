import { CURATED_AIDS } from '../../lib/curated-aids.ts';
import {
  decideIngest,
  findAidsToRetire,
  type IngestableSource,
  resolveEnabledSources,
  SOURCE_DOC_URLS,
  SOURCE_LABELS,
  type StoredSubvention,
  toSubventionRecord,
} from '../../lib/subvention-ingest.ts';
import {
  finaliseAid,
  type NormalisedAid,
} from '../../lib/subvention-sources.ts';
import {
  fetchAidesTerritoiresAids,
  getAidesTerritoiresKey,
} from '../fetchers/aides-territoires.ts';
import { fetchCarenewsAids } from '../fetchers/carenews.ts';
import {
  chunk,
  coreClient,
  createRecords,
  findAllRecords,
  type RecordShape,
  todayIso,
  updateRecord,
} from '../utils/records.ts';

// L'INGESTION DU CATALOGUE.
//
// Tourne chaque nuit et à la demande. Ce qui la rend rejouable sans dégât :
//  - `sourceKey` est l'identité d'une aide, donc jamais de doublon ;
//  - `contentHash` décide s'il faut vraiment écrire, donc une nuit sans
//    changement en amont ne coûte aucune écriture ;
//  - une aide disparue est retirée (`isLive: false`), jamais supprimée ;
//  - chaque source rend son propre compte, donc une source cassée ne fait ni
//    passer ni échouer les autres.

export type SourceOutcome = {
  source: IngestableSource;
  status: 'SUCCESS' | 'FAILED';
  fetched: number;
  created: number;
  updated: number;
  retired: number;
  unchanged: number;
  error?: string;
};

export type RefreshSummary = {
  ranAt: string;
  catalogVersion: number;
  sources: SourceOutcome[];
  totalCreated: number;
  totalUpdated: number;
  totalRetired: number;
};

const WRITE_BATCH = 100;

const collectAids = async (
  source: IngestableSource,
): Promise<NormalisedAid[]> => {
  if (source === 'CURATED') {
    return CURATED_AIDS.map((aid) => finaliseAid(aid));
  }

  if (source === 'CARENEWS') {
    const { aids } = await fetchCarenewsAids({ maxPages: 5 });

    return aids;
  }

  const apiKey = getAidesTerritoiresKey();

  if (apiKey === undefined) {
    throw new Error(
      "Clé API absente : renseignez AIDES_TERRITOIRES_KEY dans les variables de l'application Bilan.",
    );
  }

  const { aids } = await fetchAidesTerritoiresAids({ apiKey });

  return aids;
};

const recordSourceRun = async (
  client: ReturnType<typeof coreClient>,
  outcome: SourceOutcome,
  catalogVersion: number,
): Promise<void> => {
  const existing = await findAllRecords<{ id: string }>(
    client,
    'subventionSources',
    { id: true },
    { filter: { sourceKey: { eq: outcome.source } } },
    1,
    1,
  );

  const data: RecordShape = {
    name: SOURCE_LABELS[outcome.source],
    sourceKey: outcome.source,
    isEnabled: true,
    lastRunAt: todayIso(),
    lastRunStatus: outcome.status,
    itemsTotal: outcome.fetched,
    itemsIngested: outcome.created,
    itemsUpdated: outcome.updated,
    catalogVersion,
    lastError: outcome.error ?? null,
    documentationUrl: {
      primaryLinkUrl: SOURCE_DOC_URLS[outcome.source],
      primaryLinkLabel: 'Documentation',
      secondaryLinks: [],
    },
    ...(outcome.status === 'SUCCESS' ? { lastSuccessAt: todayIso() } : {}),
  };

  if (existing[0] !== undefined) {
    await updateRecord(client, 'updateSubventionSource', existing[0].id, data);

    return;
  }

  await createRecords(client, 'createSubventionSources', [data]);
};

export const refreshSubventions = async ({
  sources,
}: { sources?: string[] } = {}): Promise<RefreshSummary> => {
  const client = coreClient();
  const enabled = resolveEnabledSources(
    sources,
    process.env.BILAN_SUBVENTION_SOURCES,
  );
  const catalogVersion = Math.floor(Date.now() / 1000);

  const storedRecords = await findAllRecords<StoredSubvention>(
    client,
    'subventions',
    { id: true, sourceKey: true, contentHash: true, isLive: true },
    {},
  );

  const stored = new Map<string, StoredSubvention>();

  for (const record of storedRecords) {
    if (typeof record.sourceKey === 'string' && record.sourceKey.length > 0) {
      stored.set(record.sourceKey, record);
    }
  }

  const outcomes: SourceOutcome[] = [];

  for (const source of enabled) {
    const outcome: SourceOutcome = {
      source,
      status: 'SUCCESS',
      fetched: 0,
      created: 0,
      updated: 0,
      retired: 0,
      unchanged: 0,
    };

    try {
      const aids = await collectAids(source);

      outcome.fetched = aids.length;

      const toCreate: RecordShape[] = [];

      for (const aid of aids) {
        const decision = decideIngest(aid, stored.get(aid.sourceKey));
        const record = toSubventionRecord(aid, catalogVersion, todayIso());

        if (decision.action === 'CREATE') {
          toCreate.push(record);
          continue;
        }

        if (decision.action === 'UNCHANGED') {
          outcome.unchanged += 1;
          continue;
        }

        await updateRecord(client, 'updateSubvention', decision.id, record);
        outcome.updated += 1;
      }

      for (const batch of chunk(toCreate, WRITE_BATCH)) {
        await createRecords(client, 'createSubventions', batch);
      }

      outcome.created = toCreate.length;

      // Le retrait n'a de sens que sur une lecture complète de la source : une
      // lecture partielle de Carenews enterrerait des appels encore ouverts.
      if (source !== 'CARENEWS') {
        const toRetire = findAidsToRetire(
          source,
          new Set(aids.map((aid) => aid.sourceKey)),
          stored.values(),
        );

        for (const record of toRetire) {
          await updateRecord(client, 'updateSubvention', record.id, {
            isLive: false,
            lastSeenAt: todayIso(),
          });
        }

        outcome.retired = toRetire.length;
      }
    } catch (error) {
      outcome.status = 'FAILED';
      outcome.error =
        error instanceof Error ? error.message : 'Erreur inconnue.';
      console.error(`[bilan] Ingestion ${source} en échec`, outcome.error);
    }

    await recordSourceRun(client, outcome, catalogVersion);
    outcomes.push(outcome);
  }

  const summary: RefreshSummary = {
    ranAt: todayIso(),
    catalogVersion,
    sources: outcomes,
    totalCreated: outcomes.reduce((total, item) => total + item.created, 0),
    totalUpdated: outcomes.reduce((total, item) => total + item.updated, 0),
    totalRetired: outcomes.reduce((total, item) => total + item.retired, 0),
  };

  console.log('[bilan] Catalogue de subventions rafraîchi', summary);

  return summary;
};
