import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { isPastTrashRetention } from '../lib/trash-retention.ts';

// Trash purge. Archived documents live 7 days for restore, then the cron
// destroys them. Destroy (not delete) is the point: a soft-deleted row would
// keep both the body and the tree position forever, and the trash filter is
// archivedAt-based, so a deleted row would resurrect as a ghost restore.

type DocumentRecord = {
  id: string;
  archivedAt?: string | null;
};

const isPastRetention = (archivedAt: string | undefined | null): boolean =>
  isPastTrashRetention(archivedAt);

const handler = async () => {
  const client = new CoreApiClient();

  const result = (await client.query({
    documents: {
      __args: {
        filter: { archivedAt: { is: 'NOT_NULL' } },
        first: 500,
      },
      edges: {
        node: { id: true, archivedAt: true },
      },
    },
  } as never)) as { documents?: { edges: { node: DocumentRecord }[] } };

  const expired = (result?.documents?.edges ?? [])
    .map((edge) => edge.node)
    .filter((document) => isPastRetention(document.archivedAt));

  for (const document of expired) {
    await client.mutation({
      deleteDocuments: {
        __args: { id: document.id },
        id: true,
      },
    } as never);
  }

  console.log('[a2e-documents] Corbeille purgée', { count: expired.length });

  return { purged: expired.length };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.purgeArchivedDocuments,
  name: 'purge-archived-documents',
  description:
    'Détruit chaque nuit les documents archivés depuis plus de 7 jours.',
  timeoutSeconds: 120,
  cronTriggerSettings: {
    pattern: '0 4 * * *',
  },
  handler,
});
