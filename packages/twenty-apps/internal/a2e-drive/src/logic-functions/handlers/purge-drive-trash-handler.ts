import { CoreApiClient } from 'twenty-client-sdk/core';

import { isPastTrashRetention } from '../../lib/drive-trash-retention.ts';

// LE BALAYAGE DE LA CORBEILLE DRIVE.
//
// Le cron nocturne interroge les lignes encore archivées, ne garde que celles
// dont la fenêtre de 7 jours est dépassée, puis les supprime via la mutation
// générée de l'objet. driveFolder est l'objet de l'app ; `attachment` est un
// objet standard, mais Drive porte l'expérience fichier et le plan impose un
// archivedAt applicatif unique (P6.2/P4.3), donc les fichiers sont couverts
// ici aussi plutôt que de mélanger deux fenêtres de rétention.

export type TrashObjectTarget = {
  queryKey: string;
  deleteMutation: string;
};

export const TRASH_OBJECT_TARGETS: readonly TrashObjectTarget[] = [
  { queryKey: 'driveFolders', deleteMutation: 'deleteDriveFolders' },
  { queryKey: 'attachments', deleteMutation: 'deleteAttachments' },
];

export const coreClient = (): CoreApiClient => new CoreApiClient();

// Le client est injectable pour que node:test exerce le balayage sans Core API
// live (le client généré lève avant génération).
export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

type ArchivedRecord = {
  id: string;
  archivedAt?: string | null;
};

export type PurgeDriveTrashResult = {
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

// The generated plural delete takes a REQUIRED filter, not an id (live-
// verified in a2e-projects); `filter: { id: { eq } }` targets the single row.
const deleteRecord = async (
  client: CoreClientLike,
  deleteMutation: string,
  recordId: string,
): Promise<void> => {
  await client.mutation({
    [deleteMutation]: {
      __args: { filter: { id: { eq: recordId } } },
      id: true,
    },
  } as never);
};

export const purgeDriveExpiredTrash = async (
  client: CoreClientLike = coreClient(),
  now: number = Date.now(),
): Promise<PurgeDriveTrashResult> => {
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
