import { CoreApiClient } from 'twenty-client-sdk/core';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';

// INSTALL = READY TO USE.
//
// Installing A2E Documents must leave a workspace with a usable "Getting
// started" doc and one reusable template, so the tree is never empty on the
// first open. Every step is idempotent, because an app can be reinstalled.

const coreClient = (): CoreApiClient => new CoreApiClient();

const findExistingRootDocuments = async (
  client: CoreApiClient,
): Promise<{ id: string }[]> => {
  const result = (await client.query({
    documents: {
      __args: {
        filter: { parent: { is: 'NULL' } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { documents?: { edges: { node: { id: string } }[] } };

  return result?.documents?.edges?.map((edge) => edge.node) ?? [];
};

const seedGettingStartedDocument = async (
  client: CoreApiClient,
): Promise<boolean> => {
  const existing = await findExistingRootDocuments(client);

  if (existing.length > 0) {
    return false;
  }

  await client.mutation({
    createDocuments: {
      __args: {
        data: [
          {
            title: 'Bienvenue dans A2E Documents',
            kind: 'DOCUMENT',
            isFavorite: true,
            position: 'V',
            content: {
              blocknote: null,
              markdown:
                '# Bienvenue dans A2E Documents\n\n' +
                'Voici votre premier document. Depuis l’arborescence vous pouvez :\n\n' +
                '- créer des sous-documents et les glisser pour les réorganiser ;\n' +
                '- épingler vos favoris ;\n' +
                '- dupliquer un modèle depuis la vue Modèles ;\n' +
                '- partager un lien de lecture en public.\n',
            },
          },
        ],
      },
      id: true,
    },
  } as never);

  return true;
};

const seedMeetingNotesTemplate = async (
  client: CoreApiClient,
): Promise<boolean> => {
  const result = (await client.query({
    documents: {
      __args: {
        filter: { kind: { equals: 'TEMPLATE' } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { documents?: { edges: { node: { id: string } }[] } };

  if ((result?.documents?.edges?.length ?? 0) > 0) {
    return false;
  }

  await client.mutation({
    createDocuments: {
      __args: {
        data: [
          {
            title: 'Modèle — Notes de réunion',
            kind: 'TEMPLATE',
            content: {
              blocknote: null,
              markdown:
                '# Notes de réunion\n\n## Participants\n\n## Ordre du jour\n\n## Décisions\n\n## Actions\n',
            },
          },
        ],
      },
      id: true,
    },
  } as never);

  return true;
};

const handler = async () => {
  const client = coreClient();

  const gettingStartedCreated = await seedGettingStartedDocument(client);
  const templateCreated = await seedMeetingNotesTemplate(client);

  console.log('[a2e-documents] Installation terminée', {
    gettingStartedDocumentCreated: gettingStartedCreated,
    templateCreated,
  });

  return {
    gettingStartedDocumentCreated: gettingStartedCreated,
    templateCreated,
  };
};

export default definePostInstallLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.postInstall,
  name: 'post-install',
  description:
    'Prépare A2E Documents : document de bienvenue et modèle de notes de réunion.',
  timeoutSeconds: 120,
  shouldRunSynchronously: false,
  handler,
});
