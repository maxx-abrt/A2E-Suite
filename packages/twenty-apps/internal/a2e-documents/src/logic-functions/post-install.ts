import { CoreApiClient } from 'twenty-client-sdk/core';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { findMissingStarterTemplates } from '../lib/starter-templates.ts';

// INSTALL = READY TO USE.
//
// Installing A2E Documents must leave a workspace with a usable "Getting
// started" doc and the full starter bundle of reusable templates (meeting
// notes, project brief, PRD, one-on-one), so the tree is never empty on the
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

const findExistingTemplateTitles = async (
  client: CoreApiClient,
): Promise<string[]> => {
  const result = (await client.query({
    documents: {
      __args: {
        filter: { kind: { equals: 'TEMPLATE' } },
        first: 30,
      },
      edges: { node: { title: true } },
    },
  } as never)) as {
    documents?: { edges: { node: { title: string } }[] };
  };

  return result?.documents?.edges?.map((edge) => edge.node.title) ?? [];
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

// Starter bundle seeding is repeat-safe: only titles that are not already
// TEMPLATE documents are created, so reinstall or retry never duplicates
// seeds (same rule as the template-operation provenance check).
const seedStarterTemplates = async (
  client: CoreApiClient,
): Promise<number> => {
  const existingTemplateTitles = await findExistingTemplateTitles(client);

  const missingTemplates = findMissingStarterTemplates(existingTemplateTitles);

  if (missingTemplates.length === 0) {
    return 0;
  }

  await client.mutation({
    createDocuments: {
      __args: {
        data: missingTemplates.map((starterTemplate) => ({
          title: starterTemplate.title,
          kind: 'TEMPLATE',
          content: {
            blocknote: null,
            markdown: starterTemplate.markdown,
          },
        })),
      },
      id: true,
    },
  } as never);

  return missingTemplates.length;
};

const handler = async () => {
  const client = coreClient();

  const gettingStartedCreated = await seedGettingStartedDocument(client);
  const starterTemplatesCreated = await seedStarterTemplates(client);

  console.log('[a2e-documents] Installation terminée', {
    gettingStartedDocumentCreated: gettingStartedCreated,
    starterTemplatesCreated,
  });

  return {
    gettingStartedDocumentCreated: gettingStartedCreated,
    starterTemplatesCreated,
  };
};

export default definePostInstallLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.postInstall,
  name: 'post-install',
  description:
    'Prépare A2E Documents : document de bienvenue et bundle de modèles de démarrage (réunion, brief, PRD, entretien).',
  timeoutSeconds: 120,
  shouldRunSynchronously: false,
  handler,
});
