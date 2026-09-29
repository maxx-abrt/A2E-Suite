// Recette « fichier déposé dans un projet → tâche de relecture » (US-107).
//
// Partie pure : à partir d'un document rattaché à un projet (le dépôt d'un
// fichier y crée ou met à jour un document), elle dérive la clé de corrélation
// C5 puis le plan d'écritures (une tâche de relecture dans le projet). Le plan
// est calculable sans moteur ni Core API : c'est la prévisualisation promise
// avant activation.
//
// Un document sans projet ne planifie rien et l'énonce explicitement (règle de
// dégradation C5) : jamais une étape cassée, jamais un échec silencieux.

import {
  deriveRecipeCorrelationKey,
  type RecipeCorrelationSource,
} from './recipe-correlation.ts';

export const FILE_REVIEW_RECIPE_KEY = 'file-review';
export const FILE_REVIEW_RECIPE_VERSION = 1;

export const FILE_REVIEW_SOURCE_OBJECT = 'document';

// Le libellé de la tâche générée. La relecture est le geste attendu après un
// dépôt ; le nom du fichier (à défaut le titre du document) le rattache au bon
// dépôt dans la liste du projet.
export const FILE_REVIEW_TASK_TITLE = 'Relecture';

export const FILE_REVIEW_FALLBACK_FILE_LABEL = 'fichier du projet';

export type FileUploadSnapshot = {
  id: string;
  fileName?: string | null;
  projectId?: string | null;
};

export type FileReviewRecipeInput = {
  file: FileUploadSnapshot;
  workspaceId?: string | null;
};

export type FileReviewSkipReason = 'PROJECT_NOT_LINKED';

export type FileReviewTaskWrite = {
  kind: 'CREATE_TASK';
  correlationKey: string;
  writes: {
    object: 'task';
    title: string;
    projectId: string;
    recipeCorrelationKey: string;
  };
};

export type FileReviewSkip = {
  kind: 'CREATE_TASK';
  reason: FileReviewSkipReason;
};

export type FileReviewRecipePlan = {
  correlationKey: string;
  steps: FileReviewTaskWrite[];
  skipped: FileReviewSkip[];
};

export const deriveFileReviewCorrelationKey = (
  source: Omit<RecipeCorrelationSource, 'recipeKey' | 'version' | 'sourceObject'>,
): string =>
  deriveRecipeCorrelationKey({
    recipeKey: FILE_REVIEW_RECIPE_KEY,
    version: FILE_REVIEW_RECIPE_VERSION,
    sourceObject: FILE_REVIEW_SOURCE_OBJECT,
    workspaceId: source.workspaceId,
    sourceRecordId: source.sourceRecordId,
  });

export const deriveFileReviewTaskTitle = (
  fileName: string | null | undefined,
): string => {
  const trimmed = (fileName ?? '').trim();

  return trimmed.length > 0
    ? `${FILE_REVIEW_TASK_TITLE} – ${trimmed}`
    : `${FILE_REVIEW_TASK_TITLE} – ${FILE_REVIEW_FALLBACK_FILE_LABEL}`;
};

export const buildFileReviewRecipePlan = (
  input: FileReviewRecipeInput,
): FileReviewRecipePlan => {
  const correlationKey = deriveFileReviewCorrelationKey({
    sourceRecordId: input.file.id,
    workspaceId: input.workspaceId,
  });
  const projectId =
    typeof input.file.projectId === 'string' ? input.file.projectId.trim() : '';

  if (projectId === '') {
    return {
      correlationKey,
      steps: [],
      skipped: [{ kind: 'CREATE_TASK', reason: 'PROJECT_NOT_LINKED' }],
    };
  }

  return {
    correlationKey,
    steps: [
      {
        kind: 'CREATE_TASK',
        correlationKey,
        writes: {
          object: 'task',
          title: deriveFileReviewTaskTitle(input.file.fileName),
          projectId,
          recipeCorrelationKey: correlationKey,
        },
      },
    ],
    skipped: [],
  };
};
