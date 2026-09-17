import { CoreApiClient } from 'twenty-client-sdk/core';

import { isPastTrashRetention } from '../../lib/trash-retention.ts';

// LE BALAYAGE DE LA CORBEILLE.
//
// Chaque objet possédé par l'app porte son propre champ archivedAt (miroir du
// cycle poubelle de a2e-documents) : le cron nocturne interroge les lignes
// encore archivées, ne garde que celles dont la fenêtre de 7 jours est
// dépassée, puis les supprime via la mutation générée de l'objet.
//
// Les tâches ne sont PAS listées : c'est un objet standard, sa corbeille est
// celle de Twenty (soft-delete natif + rétention workspace) et lui ajouter un
// champ archivedAt applicatif dupliquerait ce mécanisme. Ce balayage ne couvre
// donc que les objets déclarés par a2e-projects.

export type TrashObjectTarget = {
  queryKey: string;
  deleteMutation: string;
};

export const TRASH_OBJECT_TARGETS: readonly TrashObjectTarget[] = [
  { queryKey: 'projects', deleteMutation: 'deleteProjects' },
  { queryKey: 'milestones', deleteMutation: 'deleteMilestones' },
  { queryKey: 'timeEntries', deleteMutation: 'deleteTimeEntries' },
  { queryKey: 'labels', deleteMutation: 'deleteLabels' },
];

export const coreClient = (): CoreApiClient => new CoreApiClient();

// Le client est injectable pour que node:test exerce le balayage sans Core API
// live (le client généré lève avant génération).
export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

type ArchivedRecord = {
  id: string;
  archivedAt?: string | null;
};

export type PurgeTrashResult = {
  purged: number;
  purgedByObject: Record<string, number>;
};

const readArchivedRecords = async (
  client: CoreClientLike,
  queryKey: string,
): Promise<ArchivedRecord[]> => {
  const result = (await client.query({
    [queryKey]: {
      __args: { filter: { archivedAt: { is: 'NOT_NULL' } }, first: 500 },
      edges: { node: { id: true, archivedAt: true } },
    },
  } as never)) as Record<
    string,
    { edges?: { node: ArchivedRecord }[] } | undefined
  >;

  return (result?.[queryKey]?.edges ?? []).map((edge) => edge.node);
};

const deleteRecord = async (
  client: CoreClientLike,
  deleteMutation: string,
  recordId: string,
): Promise<void> => {
  await client.mutation({
    [deleteMutation]: { __args: { id: recordId }, id: true },
  } as never);
};

export const purgeExpiredTrash = async (
  client: CoreClientLike = coreClient(),
  now: number = Date.now(),
): Promise<PurgeTrashResult> => {
  const purgedByObject: Record<string, number> = {};
  let purged = 0;

  for (const target of TRASH_OBJECT_TARGETS) {
    const records = await readArchivedRecords(client, target.queryKey);
    const expired = records.filter((record) =>
      isPastTrashRetention(record.archivedAt, now),
    );

    for (const record of expired) {
      await deleteRecord(client, target.deleteMutation, record.id);
    }

    purgedByObject[target.queryKey] = expired.length;
    purged += expired.length;
  }

  return { purged, purgedByObject };
};
