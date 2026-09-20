import { useCallback, useEffect, useMemo, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import {
  buildTaskDependencyPayload,
  collectTaskDependencyCandidates,
  collectTaskDependencyIdMap,
  type TaskDependencyIdMap,
  type TaskDependencyRecord,
} from '../lib/task-dependencies.ts';

// LE SÉLECTIONNEUR DE DÉPENDANCES.
//
// The dependency edge is the app's `blockedBy` self-relation (US-049 decision),
// not the note-targeting `blockIssue`. The picker lists the tasks that may
// legally block the current task and refuses any choice that would close a
// dependency cycle before the mutation is sent (lib/task-dependencies.ts).
//
// The loaded task set is the picker's universe: cycle validation can only
// judge the edges it can read, exactly like the subtask picker.

const TASK_DEPENDENCY_PAGE_SIZE = 200;

const SOURCE_SELECTION_LABEL = 'Sélectionnez une seule tâche pour choisir sa dépendance.';

type TaskRow = {
  id: string;
  title: string;
  blockedBy?: { id?: string | null } | null;
};

type TasksQueryResult = {
  tasks?: { edges?: { node: TaskRow }[] };
};

type TaskQueryResult = {
  task?: TaskRow | null;
};

const appTheme = {
  font: 'var(--t-font-family)',
  text: 'var(--t-font-color-primary)',
  textSecondary: 'var(--t-font-color-secondary)',
  border: 'var(--t-border-color-light)',
  danger: 'var(--t-color-red)',
  radius: 'var(--t-border-radius-sm)',
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
} as const;

const openTask = (taskId: string): void => {
  void navigate(AppPath.RecordShowPage, {
    objectNameSingular: 'task',
    objectRecordId: taskId,
  });
};

const fetchTasks = async (): Promise<TaskRow[]> => {
  const client = new CoreApiClient();

  const result = (await client.query({
    tasks: {
      __args: {
        orderBy: [{ createdAt: 'AscNullsFirst' }, { id: 'AscNullsFirst' }],
        first: TASK_DEPENDENCY_PAGE_SIZE,
      },
      edges: { node: { id: true, title: true, blockedBy: { id: true } } },
    },
  } as never)) as TasksQueryResult;

  return result?.tasks?.edges?.map((edge) => edge.node) ?? [];
};

const fetchTask = async (taskId: string): Promise<TaskRow | null> => {
  const client = new CoreApiClient();

  const result = (await client.query({
    task: {
      __args: { id: taskId },
      id: true,
      title: true,
      blockedBy: { id: true },
    },
  } as never)) as TaskQueryResult;

  return result?.task ?? null;
};

const TaskDependencies = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const scopedTaskId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const [tasks, setTasks] = useState<TaskDependencyRecord[]>([]);
  const [scopedTask, setScopedTask] = useState<TaskRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refusalMessage, setRefusalMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [loadedTasks, loadedScopedTask] = await Promise.all([
      fetchTasks(),
      scopedTaskId === null ? Promise.resolve(null) : fetchTask(scopedTaskId),
    ]);

    setTasks(loadedTasks);
    setScopedTask(loadedScopedTask);
    setIsLoading(false);
  }, [scopedTaskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dependencyIdByTaskId: TaskDependencyIdMap = useMemo(
    () => collectTaskDependencyIdMap(tasks),
    [tasks],
  );

  const currentDependencyId =
    scopedTask === null
      ? ''
      : (dependencyIdByTaskId.get(scopedTask.id) ?? '');

  const candidateIds = useMemo(() => {
    if (scopedTask === null) {
      return [];
    }

    return collectTaskDependencyCandidates({
      taskId: scopedTask.id,
      tasks,
      dependencyIdByTaskId,
    }).map((task) => task.id);
  }, [scopedTask, tasks, dependencyIdByTaskId]);

  // The current blocker may sit outside the loaded page after a manual edit;
  // keep it selectable so the picker never silently resets the edge.
  const optionIds =
    currentDependencyId !== '' && !candidateIds.includes(currentDependencyId)
      ? [currentDependencyId, ...candidateIds]
      : candidateIds;

  const findTitle = (taskId: string): string =>
    tasks.find((task) => task.id === taskId)?.title ?? taskId;

  const applyDependency = async (candidateDependencyId: string): Promise<void> => {
    if (scopedTask === null) {
      return;
    }

    let payload: { blockedById: string | null };

    try {
      payload = buildTaskDependencyPayload({
        taskId: scopedTask.id,
        candidateDependencyId:
          candidateDependencyId === '' ? null : candidateDependencyId,
        dependencyIdByTaskId,
      });
    } catch {
      setRefusalMessage(
        'Dépendance refusée : une tâche ne peut pas dépendre d’elle-même ni de l’une de ses dépendantes.',
      );
      return;
    }

    const client = new CoreApiClient();

    await client.mutation({
      updateTask: {
        __args: { id: scopedTask.id, data: { blockedById: payload.blockedById } },
        id: true,
      },
    } as never);

    setRefusalMessage(null);
    await reload();
  };

  return (
    <div
      style={{
        fontFamily: appTheme.font,
        color: appTheme.text,
        display: 'flex',
        flexDirection: 'column',
        gap: appTheme.spacing2,
      }}
    >
      <strong>Dépendances</strong>
      {refusalMessage !== null && (
        <span style={{ color: appTheme.danger }} role="alert">
          {refusalMessage}
        </span>
      )}
      {isLoading ? (
        <span style={{ color: appTheme.textSecondary }}>Chargement…</span>
      ) : scopedTask === null ? (
        <span style={{ color: appTheme.textSecondary }}>
          {SOURCE_SELECTION_LABEL}
        </span>
      ) : (
        <>
          <div style={{ display: 'flex', gap: appTheme.spacing1 }}>
            <button
              type="button"
              onClick={() => openTask(scopedTask.id)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                color: appTheme.text,
              }}
            >
              {scopedTask.title}
            </button>
          </div>
          <label style={{ color: appTheme.textSecondary }}>
            bloquée par
            <select
              value={currentDependencyId}
              onChange={(event) => void applyDependency(event.target.value)}
              style={{
                marginLeft: appTheme.spacing1,
                background: 'transparent',
                color: appTheme.text,
                border: `1px solid ${appTheme.border}`,
                borderRadius: appTheme.radius,
              }}
            >
              <option value="">Aucune</option>
              {optionIds.map((optionId) => (
                <option key={optionId} value={optionId}>
                  {findTitle(optionId)}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.taskDependencies,
  name: 'task-dependencies',
  description:
    'Sélection de la tâche bloquante avec refus des dépendances cycliques.',
  component: TaskDependencies,
});
