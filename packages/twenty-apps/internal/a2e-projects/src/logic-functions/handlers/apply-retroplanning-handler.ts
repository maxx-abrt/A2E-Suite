import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  buildRetroplanningPreview,
  buildRetroplanningProvenanceValue,
  findRetroplanningRecipe,
  orderRetroplanningTasksByParentDepth,
  parseRetroplanningProvenanceValue,
  readRetroplanningTaskKey,
  reconcileRetroplanningDraft,
  type RetroplanningDeadline,
  type RetroplanningExistingTask,
  type RetroplanningPlannedTask,
  type RetroplanningPreview,
  type RetroplanningReconcileMode,
  type RetroplanningChangeSet,
} from '../../lib/retroplanning.ts';

// L'APPLICATION D'UN RÉTROPLANNING.
//
// Le moteur pur (lib/retroplanning.ts) calcule l'aperçu et le jeu de
// changements ; ce handler est la seule couche qui parle au Core API. Il
// matérialise les tâches standard (projet, parentTask, assigné, dates) via les
// mutations générées — pas de second moteur de génération de tâches.
//
// Idempotence : chaque tâche créée porte `retroplanningProvenance`
// (`<recette>@v<version>:<clé>#<échéance générée>`). Un rejeu retrouve donc ses
// propres lignes par provenance, ne recrée rien, et ne déplace que les tâches
// qu'il possède encore — une date éditée à la main ou une tâche terminée reste
// intouchée. La confirmation destructive (REPLACE) est exigée pour toute
// suppression, jamais déduite.

export const RETROPLANNING_TASK_PAGE_SIZE = 500;

export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

export type RetroplanningAssigneeRoles = Record<string, string>;

export type ApplyRetroplanningInput = {
  projectId: string;
  recipeKey: string;
  deadline: RetroplanningDeadline;
  mode: RetroplanningReconcileMode;
  confirmedDestructiveChange?: boolean;
  // Logical recipe role → workspace member id.
  assigneeRoles?: RetroplanningAssigneeRoles;
};

export type PreviewRetroplanningResult = {
  preview: RetroplanningPreview;
  changeSet: RetroplanningChangeSet;
  // Stale generated rows REPLACE would delete once confirmed (0 in APPEND).
  // Computed read-only so the screen can name the destructive change before
  // the user confirms it.
  pendingRemovalCount: number;
};

export type ApplyRetroplanningResult = {
  preview: RetroplanningPreview;
  changeSet: RetroplanningChangeSet;
  created: number;
  updated: number;
  removed: number;
  skippedProtected: number;
};

export const coreClient = (): CoreApiClient => new CoreApiClient();

type ExistingTaskNode = {
  id: string;
  title: string;
  dueAt?: string | null;
  projectStatus?: string | null;
  retroplanningProvenance?: string | null;
  parentTask?: { id: string } | null;
};

const readProjectTasks = async (
  client: CoreClientLike,
  projectId: string,
): Promise<ExistingTaskNode[]> => {
  const result = (await client.query({
    tasks: {
      __args: {
        filter: { projectId: { eq: projectId } },
        first: RETROPLANNING_TASK_PAGE_SIZE,
      },
      edges: {
        node: {
          id: true,
          title: true,
          dueAt: true,
          projectStatus: true,
          retroplanningProvenance: true,
          parentTask: { id: true },
        },
      },
    },
  } as never)) as { tasks?: { edges?: { node: ExistingTaskNode }[] } };

  return (result?.tasks?.edges ?? []).map((edge) => edge.node);
};

const toExistingTask = (node: ExistingTaskNode): RetroplanningExistingTask => ({
  id: node.id,
  title: node.title,
  dueAt: node.dueAt ?? null,
  projectStatus: node.projectStatus ?? null,
  provenance: node.retroplanningProvenance ?? null,
});

const createRetroplanningTask = async (
  client: CoreClientLike,
  planned: RetroplanningPlannedTask,
  projectId: string,
  assigneeId: string | undefined,
  parentTaskId: string | undefined,
): Promise<string | undefined> => {
  const result = (await client.mutation({
    createTasks: {
      __args: {
        data: [
          {
            title: planned.title,
            dueAt: planned.dueAt,
            projectId,
            projectStatus: planned.projectStatus,
            position: 'last',
            retroplanningProvenance: buildRetroplanningProvenanceValue(
              planned.provenance,
              planned.dueAt,
            ),
            ...(assigneeId === undefined ? {} : { assigneeId }),
            ...(parentTaskId === undefined ? {} : { parentTaskId }),
          },
        ],
      },
      id: true,
    },
  } as never)) as { createTasks?: { id: string }[] };

  return result?.createTasks?.[0]?.id;
};

const updateRetroplanningTask = async (
  client: CoreClientLike,
  id: string,
  data: {
    dueAt?: string;
    title?: string;
    retroplanningProvenance: string;
  },
): Promise<void> => {
  await client.mutation({
    updateTask: {
      __args: { id, data },
      id: true,
    },
  } as never);
};

const deleteRetroplanningTask = async (
  client: CoreClientLike,
  id: string,
): Promise<void> => {
  await client.mutation({
    deleteTasks: {
      __args: { filter: { id: { eq: id } } },
      id: true,
    },
  } as never);
};

// Read-only half shared by the preview and the apply path: same recipe lookup,
// same schedule, same reconcile against the project's current rows.
const planRetroplanning = async (
  input: ApplyRetroplanningInput,
  now: Date,
  client: CoreClientLike,
) => {
  const recipe = findRetroplanningRecipe(input.recipeKey);

  if (recipe === undefined) {
    throw new Error(
      `Recette de rétroplanning inconnue : « ${input.recipeKey} ».`,
    );
  }

  const preview = buildRetroplanningPreview(recipe, input.deadline, now);
  const existingNodes = await readProjectTasks(client, input.projectId);
  const existingTasks = existingNodes.map(toExistingTask);
  const changeSet = reconcileRetroplanningDraft(
    recipe,
    preview.tasks,
    existingTasks,
    {
      mode: input.mode,
      confirmedDestructiveChange: input.confirmedDestructiveChange === true,
    },
  );

  return { recipe, preview, existingNodes, existingTasks, changeSet };
};

// Dry run for the rétroplanning screen: reads the project's tasks, never
// writes. The removal count is what a confirmed REPLACE would delete.
export const previewRetroplanning = async (
  input: ApplyRetroplanningInput,
  now: Date,
  client: CoreClientLike = coreClient(),
): Promise<PreviewRetroplanningResult> => {
  const { recipe, preview, existingTasks, changeSet } = await planRetroplanning(
    input,
    now,
    client,
  );
  const pendingRemovalCount =
    input.mode === 'REPLACE'
      ? reconcileRetroplanningDraft(recipe, preview.tasks, existingTasks, {
          mode: 'REPLACE',
          confirmedDestructiveChange: true,
        }).remove.length
      : 0;

  return { preview, changeSet, pendingRemovalCount };
};

export const applyRetroplanning = async (
  input: ApplyRetroplanningInput,
  now: Date,
  client: CoreClientLike = coreClient(),
): Promise<ApplyRetroplanningResult> => {
  const { preview, existingNodes, changeSet } = await planRetroplanning(
    input,
    now,
    client,
  );

  const taskIdByRecipeKey = new Map<string, string>();

  for (const node of existingNodes) {
    if (
      node.retroplanningProvenance === null ||
      node.retroplanningProvenance === undefined
    ) {
      continue;
    }

    const parsed = parseRetroplanningProvenanceValue(
      node.retroplanningProvenance,
    );

    if (parsed === undefined) {
      continue;
    }

    const taskKey = readRetroplanningTaskKey(parsed.provenance);

    if (taskKey !== undefined && !taskIdByRecipeKey.has(taskKey)) {
      taskIdByRecipeKey.set(taskKey, node.id);
    }
  }

  const orderedCreates = orderRetroplanningTasksByParentDepth(changeSet.create);
  let created = 0;

  for (const planned of orderedCreates) {
    const parentTaskId =
      planned.parentKey === undefined
        ? undefined
        : taskIdByRecipeKey.get(planned.parentKey);
    const assigneeId =
      planned.assigneeRole === undefined
        ? undefined
        : input.assigneeRoles?.[planned.assigneeRole];
    const createdId = await createRetroplanningTask(
      client,
      planned,
      input.projectId,
      assigneeId,
      parentTaskId,
    );

    if (createdId !== undefined) {
      taskIdByRecipeKey.set(planned.key, createdId);
      created += 1;
    }
  }

  for (const update of changeSet.update) {
    await updateRetroplanningTask(client, update.id, {
      ...(update.dueAt === undefined ? {} : { dueAt: update.dueAt }),
      ...(update.title === undefined ? {} : { title: update.title }),
      retroplanningProvenance: update.provenance,
    });
  }

  for (const removedId of changeSet.remove) {
    await deleteRetroplanningTask(client, removedId);
  }

  return {
    preview,
    changeSet,
    created,
    updated: changeSet.update.length,
    removed: changeSet.remove.length,
    skippedProtected: changeSet.protected.length,
  };
};
