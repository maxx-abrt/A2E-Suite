import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  deriveDealWonCorrelationKey,
  deriveDealWonProjectKey,
  deriveDealWonProjectName,
} from '../../lib/deal-won-recipe.ts';

// L'ÉTAPE « CRÉER LE PROJET » DE LA RECETTE AFFAIRE GAGNÉE.
//
// Le workflow « affaire gagnée » déclenche cette action via son événement de
// base de données natif puis exécute ce logic function comme n'importe quelle
// autre étape : pas de second bus d'événements, pas de second moteur.
//
// Idempotence sans intention cachée : la clé de corrélation C5 est persistée
// dans `recipeCorrelationKey`; avant de créer, on cherche un projet qui la
// porte déjà. Un rejeu du déclencheur (retry, relivraison) retrouve donc le
// projet existant et ne le duplique pas.

export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

export type DealWonCreateProjectInput = {
  opportunityId?: string;
  opportunityName?: string | null;
  companyId?: string | null;
  workspaceId?: string | null;
  actorId?: string | null;
};

export type DealWonCreateProjectStatus =
  | 'CREATED'
  | 'ALREADY_EXISTS'
  | 'INVALID_INPUT';

export type DealWonCreateProjectResult = {
  status: DealWonCreateProjectStatus;
  projectId: string | null;
  projectName: string | null;
  correlationKey: string | null;
};

export const coreClient = (): CoreApiClient => new CoreApiClient();

const findProjectIdByCorrelationKey = async (
  client: CoreClientLike,
  correlationKey: string,
): Promise<string | undefined> => {
  const result = (await client.query({
    projects: {
      __args: {
        filter: { recipeCorrelationKey: { eq: correlationKey } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { projects?: { edges?: { node: { id: string } }[] } };

  return result?.projects?.edges?.[0]?.node?.id;
};

export const createDealWonProject = async (
  input: DealWonCreateProjectInput,
  client: CoreClientLike = coreClient(),
): Promise<DealWonCreateProjectResult> => {
  const opportunityId =
    typeof input.opportunityId === 'string' ? input.opportunityId.trim() : '';

  if (opportunityId === '') {
    return {
      status: 'INVALID_INPUT',
      projectId: null,
      projectName: null,
      correlationKey: null,
    };
  }

  const correlationKey = deriveDealWonCorrelationKey({
    opportunityId,
    workspaceId: input.workspaceId,
  });
  const projectName = deriveDealWonProjectName(input.opportunityName);
  const existingProjectId = await findProjectIdByCorrelationKey(
    client,
    correlationKey,
  );

  if (existingProjectId !== undefined) {
    return {
      status: 'ALREADY_EXISTS',
      projectId: existingProjectId,
      projectName,
      correlationKey,
    };
  }

  const companyId =
    typeof input.companyId === 'string' && input.companyId.length > 0
      ? input.companyId
      : undefined;

  const result = (await client.mutation({
    createProjects: {
      __args: {
        data: [
          {
            name: projectName,
            key: deriveDealWonProjectKey(projectName),
            recipeCorrelationKey: correlationKey,
            ...(companyId === undefined ? {} : { companyId }),
          },
        ],
      },
      id: true,
    },
  } as never)) as { createProjects?: { id: string }[] };

  return {
    status: 'CREATED',
    projectId: result?.createProjects?.[0]?.id ?? null,
    projectName,
    correlationKey,
  };
};
