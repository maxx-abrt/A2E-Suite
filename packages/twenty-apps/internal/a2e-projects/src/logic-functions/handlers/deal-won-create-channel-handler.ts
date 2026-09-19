import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import {
  DEAL_WON_CHANNEL_KIND,
  DEAL_WON_CHANNEL_VISIBILITY,
  deriveDealWonChannelCorrelationKey,
  deriveDealWonChannelName,
  type DealWonChannelSkipReason,
} from '../../lib/deal-won-recipe.ts';
import { EXTERNAL_APPLICATION_UNIVERSAL_IDENTIFIERS } from '../../constants/universal-identifiers.ts';

// L'ÉTAPE « CRÉER LE CANAL LIÉ » DE LA RECETTE AFFAIRE GAGNÉE.
//
// A2E Chat est optionnel : si l'app n'est pas installée, l'étape s'arrête avec
// une raison explicite (`CHAT_NOT_INSTALLED`) au lieu d'échouer ou de laisser
// un canal orphelin — c'est la règle de dégradation C5. L'accessibilité est
// vérifiée à l'exécution, pas seulement à la construction de la recette, pour
// couvrir une désinstallation après matérialisation du workflow.
//
// Idempotence : le canal porte la relation `projectId` (qui porte lui-même la
// clé de corrélation du projet) ; avant de créer, on cherche un canal déjà
// relié à ce projet. Un rejeu ne duplique donc pas le canal.

export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

export type DealWonCreateChannelInput = {
  projectId?: string;
  projectName?: string | null;
  correlationKey?: string | null;
};

export type DealWonCreateChannelStatus =
  | 'CREATED'
  | 'ALREADY_EXISTS'
  | 'SKIPPED'
  | 'INVALID_INPUT';

export type DealWonCreateChannelResult = {
  status: DealWonCreateChannelStatus;
  channelId: string | null;
  correlationKey: string | null;
  skipReason?: DealWonChannelSkipReason;
};

export const coreClient = (): CoreApiClient => new CoreApiClient();

export const isChatInstalled = async (): Promise<boolean> => {
  const result = await new MetadataApiClient().query({
    findManyApplications: { universalIdentifier: true },
  });

  return result.findManyApplications.some(
    (application) =>
      application.universalIdentifier ===
      EXTERNAL_APPLICATION_UNIVERSAL_IDENTIFIERS.chat,
  );
};

const findChannelIdByProjectId = async (
  client: CoreClientLike,
  projectId: string,
): Promise<string | undefined> => {
  const result = (await client.query({
    chatChannels: {
      __args: { filter: { projectId: { eq: projectId } }, first: 1 },
      edges: { node: { id: true } },
    },
  } as never)) as { chatChannels?: { edges?: { node: { id: string } }[] } };

  return result?.chatChannels?.edges?.[0]?.node?.id;
};

export const createDealWonChannel = async (
  input: DealWonCreateChannelInput,
  client: CoreClientLike = coreClient(),
  chatInstalled: () => Promise<boolean> = isChatInstalled,
): Promise<DealWonCreateChannelResult> => {
  const projectId =
    typeof input.projectId === 'string' ? input.projectId.trim() : '';

  if (projectId === '') {
    return {
      status: 'INVALID_INPUT',
      channelId: null,
      correlationKey: null,
    };
  }

  const correlationKey =
    typeof input.correlationKey === 'string' && input.correlationKey.length > 0
      ? deriveDealWonChannelCorrelationKey(input.correlationKey)
      : null;

  if (!(await chatInstalled())) {
    return {
      status: 'SKIPPED',
      channelId: null,
      correlationKey,
      skipReason: 'CHAT_NOT_INSTALLED',
    };
  }

  const existingChannelId = await findChannelIdByProjectId(client, projectId);

  if (existingChannelId !== undefined) {
    return {
      status: 'ALREADY_EXISTS',
      channelId: existingChannelId,
      correlationKey,
    };
  }

  const projectName =
    typeof input.projectName === 'string' && input.projectName.trim().length > 0
      ? input.projectName.trim()
      : 'Projet';

  const result = (await client.mutation({
    createChatChannels: {
      __args: {
        data: [
          {
            name: deriveDealWonChannelName(projectName),
            kind: DEAL_WON_CHANNEL_KIND,
            visibility: DEAL_WON_CHANNEL_VISIBILITY,
            topic: `Suivi du projet ${projectName}`,
            projectId,
          },
        ],
      },
      id: true,
    },
  } as never)) as { createChatChannels?: { id: string }[] };

  return {
    status: 'CREATED',
    channelId: result?.createChatChannels?.[0]?.id ?? null,
    correlationKey,
  };
};
