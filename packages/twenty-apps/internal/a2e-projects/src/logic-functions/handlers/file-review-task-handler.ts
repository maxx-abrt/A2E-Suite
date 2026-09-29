import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  deriveFileReviewCorrelationKey,
  deriveFileReviewTaskTitle,
} from '../../lib/file-review-recipe.ts';

// L'ÉTAPE « CRÉER LA TÂCHE DE RELECTURE » DE LA RECETTE FICHIER (US-107).
//
// Le workflow « fichier déposé → tâche de relecture » déclenche cette action
// via son événement de base de données natif. Un document sans projet se
// dégrade proprement (SKIPPED) au lieu de créer une tâche orpheline — c'est la
// règle de dégradation C5.
//
// Idempotence : la clé de corrélation C5 est persistée dans la tâche ; avant de
// créer, on cherche une tâche qui la porte déjà. Un rejeu ne duplique pas.

export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

export type FileReviewTaskInput = {
  fileId?: string;
  fileName?: string | null;
  projectId?: string | null;
  workspaceId?: string | null;
};

export type FileReviewTaskStatus =
  | 'CREATED'
  | 'ALREADY_EXISTS'
  | 'SKIPPED'
  | 'INVALID_INPUT';

export type FileReviewTaskResult = {
  status: FileReviewTaskStatus;
  taskId: string | null;
  correlationKey: string | null;
  skipReason?: 'PROJECT_NOT_LINKED';
};

export const coreClient = (): CoreApiClient => new CoreApiClient();

const findTaskIdByCorrelationKey = async (
  client: CoreClientLike,
  correlationKey: string,
): Promise<string | undefined> => {
  const result = (await client.query({
    tasks: {
      __args: {
        filter: { recipeCorrelationKey: { eq: correlationKey } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { tasks?: { edges?: { node: { id: string } }[] } };

  return result?.tasks?.edges?.[0]?.node?.id;
};

export const createFileReviewTask = async (
  input: FileReviewTaskInput,
  client: CoreClientLike = coreClient(),
): Promise<FileReviewTaskResult> => {
  const fileId = typeof input.fileId === 'string' ? input.fileId.trim() : '';

  if (fileId === '') {
    return {
      status: 'INVALID_INPUT',
      taskId: null,
      correlationKey: null,
    };
  }

  const correlationKey = deriveFileReviewCorrelationKey({
    sourceRecordId: fileId,
    workspaceId: input.workspaceId,
  });
  const projectId =
    typeof input.projectId === 'string' ? input.projectId.trim() : '';

  if (projectId === '') {
    return {
      status: 'SKIPPED',
      taskId: null,
      correlationKey,
      skipReason: 'PROJECT_NOT_LINKED',
    };
  }

  const existingTaskId = await findTaskIdByCorrelationKey(
    client,
    correlationKey,
  );

  if (existingTaskId !== undefined) {
    return {
      status: 'ALREADY_EXISTS',
      taskId: existingTaskId,
      correlationKey,
    };
  }

  const result = (await client.mutation({
    createTasks: {
      __args: {
        data: [
          {
            title: deriveFileReviewTaskTitle(input.fileName),
            projectId,
            recipeCorrelationKey: correlationKey,
            position: 'last',
          },
        ],
      },
      id: true,
    },
  } as never)) as { createTasks?: { id: string }[] };

  return {
    status: 'CREATED',
    taskId: result?.createTasks?.[0]?.id ?? null,
    correlationKey,
  };
};
