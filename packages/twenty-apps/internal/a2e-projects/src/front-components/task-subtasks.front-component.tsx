import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  navigate,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import {
  buildTaskParentPayload,
  collectTaskParentCandidates,
  collectTaskParentIdMap,
  type TaskParentIdMap,
  type TaskParentPayload,
  type TaskTreeRecord,
} from '../lib/task-tree.ts';

// LA LISTE DES SOUS-TÂCHES.
//
// The native task record page cannot render a tree, so this widget carries the
// genuinely novel structure: the subtask forest built from the app's
// `parentTask` self-relation. Children load lazily per parent, and reparenting
// goes through the shared cycle guard (lib/task-tree.ts) so a task can never
// become its own descendant — the browser refuses before the API call.

const TASK_CHILDREN_PAGE_SIZE = 50;

type TaskNode = {
  id: string;
  title: string;
  parentTask?: { id?: string | null } | null;
};

type TaskChildrenPage = {
  nodes: TaskNode[];
  endCursor: string | null;
  hasNextPage: boolean;
};

type TaskPageState = {
  isLoaded: boolean;
  endCursor: string | null;
  hasNextPage: boolean;
};

type TasksQueryResult = {
  tasks?: {
    edges?: { node: TaskNode }[];
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
  };
};

type TaskQueryResult = {
  task?: TaskNode | null;
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
  spacing4: 'var(--t-spacing-4)',
} as const;

const ghostButtonStyle = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
  color: 'var(--t-font-color-secondary)',
} as const;

const openTask = (taskId: string): void => {
  // NavigateFunction is positional: (to, params, queryParams, options)
  void navigate(AppPath.RecordShowPage, {
    objectNameSingular: 'task',
    objectRecordId: taskId,
  });
};

const fetchTaskChildrenPage = async (options: {
  parentId: string | null;
  after: string | null;
}): Promise<TaskChildrenPage> => {
  const client = new CoreApiClient();

  // A parent is filtered through the relation target id, not the join column
  // key: the schema exposes `parentTask { id }` while the app join column
  // (`subtaskId`) is not a filter key.
  const filter =
    options.parentId === null
      ? { parentTask: { id: { is: 'NULL' } } }
      : { parentTask: { id: { eq: options.parentId } } };

  const result = (await client.query({
    tasks: {
      __args: {
        filter,
        orderBy: [
          { position: 'AscNullsFirst' },
          { createdAt: 'Asc' },
          { id: 'Asc' },
        ],
        first: TASK_CHILDREN_PAGE_SIZE,
        ...(options.after === null ? {} : { after: options.after }),
      },
      edges: { node: { id: true, title: true, parentTask: { id: true } } },
      pageInfo: { hasNextPage: true, endCursor: true },
    },
  } as never)) as TasksQueryResult;

  return {
    nodes: result?.tasks?.edges?.map((edge) => edge.node) ?? [],
    hasNextPage: result?.tasks?.pageInfo?.hasNextPage ?? false,
    endCursor: result?.tasks?.pageInfo?.endCursor ?? null,
  };
};

const fetchTask = async (taskId: string): Promise<TaskNode | null> => {
  const client = new CoreApiClient();

  const result = (await client.query({
    task: {
      __args: { id: taskId },
      id: true,
      title: true,
      parentTask: { id: true },
    },
  } as never)) as TaskQueryResult;

  return result?.task ?? null;
};

const mergeTaskPage = (loaded: TaskNode[], page: TaskNode[]): TaskNode[] => {
  const knownIds = new Set(loaded.map((node) => node.id));
  const merged = [...loaded];

  for (const node of page) {
    if (!knownIds.has(node.id)) {
      knownIds.add(node.id);
      merged.push(node);
    }
  }

  return merged;
};

const TaskSubtasks = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const scopedTaskId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const [rootTask, setRootTask] = useState<TaskNode | null>(null);
  const [childrenByParentId, setChildrenByParentId] = useState<
    Map<string | null, TaskNode[]>
  >(new Map());
  const [pageStateByParentId, setPageStateByParentId] = useState<
    Map<string | null, TaskPageState>
  >(new Map());
  const [loadingParentIds, setLoadingParentIds] = useState<Set<string | null>>(
    new Set(),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [refusalMessage, setRefusalMessage] = useState<string | null>(null);

  const pageStateByParentIdRef = useRef(pageStateByParentId);
  const loadingParentIdsRef = useRef(loadingParentIds);
  const expandedIdsRef = useRef(expandedIds);

  const loadChildrenPage = useCallback(
    async (parentId: string | null, options?: { append?: boolean }) => {
      if (loadingParentIdsRef.current.has(parentId)) {
        return;
      }

      const isAppend = options?.append === true;
      const currentState = pageStateByParentIdRef.current.get(parentId);
      const after = isAppend ? (currentState?.endCursor ?? null) : null;

      loadingParentIdsRef.current = new Set([
        ...loadingParentIdsRef.current,
        parentId,
      ]);
      setLoadingParentIds(loadingParentIdsRef.current);

      try {
        const page = await fetchTaskChildrenPage({ parentId, after });

        setChildrenByParentId((current) => {
          const next = new Map(current);
          const loaded = isAppend ? (next.get(parentId) ?? []) : [];

          next.set(parentId, mergeTaskPage(loaded, page.nodes));

          return next;
        });

        pageStateByParentIdRef.current = new Map(
          pageStateByParentIdRef.current,
        ).set(parentId, {
          isLoaded: true,
          endCursor: page.endCursor,
          hasNextPage: page.hasNextPage,
        });
        setPageStateByParentId(pageStateByParentIdRef.current);
      } finally {
        const nextLoadingParentIds = new Set(loadingParentIdsRef.current);

        nextLoadingParentIds.delete(parentId);
        loadingParentIdsRef.current = nextLoadingParentIds;
        setLoadingParentIds(nextLoadingParentIds);
      }
    },
    [],
  );

  const reloadTree = useCallback(async () => {
    const expandedTaskIds = [...expandedIdsRef.current];

    setChildrenByParentId(new Map());
    pageStateByParentIdRef.current = new Map();
    setPageStateByParentId(pageStateByParentIdRef.current);

    if (scopedTaskId === null) {
      setRootTask(null);
      await loadChildrenPage(null);
    } else {
      setRootTask(await fetchTask(scopedTaskId));
      await loadChildrenPage(scopedTaskId);
    }

    for (const taskId of expandedTaskIds) {
      await loadChildrenPage(taskId);
    }
  }, [loadChildrenPage, scopedTaskId]);

  useEffect(() => {
    void reloadTree();
  }, [reloadTree]);

  const toggleExpanded = useCallback(
    (taskId: string) => {
      const isCurrentlyExpanded = expandedIdsRef.current.has(taskId);
      const nextExpandedIds = new Set(expandedIdsRef.current);

      if (isCurrentlyExpanded) {
        nextExpandedIds.delete(taskId);
      } else {
        nextExpandedIds.add(taskId);
      }

      expandedIdsRef.current = nextExpandedIds;
      setExpandedIds(nextExpandedIds);

      const pageState = pageStateByParentIdRef.current.get(taskId);

      if (
        !isCurrentlyExpanded &&
        (pageState === undefined || !pageState.isLoaded)
      ) {
        void loadChildrenPage(taskId);
      }
    },
    [loadChildrenPage],
  );

  // The flat loaded set (parent key from the page it was fetched for) is the
  // picker's universe: cycle validation can only judge the links it can see.
  const loadedTasks = useMemo<TaskTreeRecord[]>(() => {
    const tasks: TaskTreeRecord[] = [];

    for (const [parentId, children] of childrenByParentId) {
      for (const child of children) {
        tasks.push({ ...child, parentTaskId: parentId });
      }
    }

    if (rootTask !== null) {
      tasks.push(rootTask);
    }

    return tasks;
  }, [childrenByParentId, rootTask]);

  const parentIdByTaskId: TaskParentIdMap = useMemo(
    () => collectTaskParentIdMap(loadedTasks),
    [loadedTasks],
  );

  const createSubtask = async (parentTaskId: string): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      createTasks: {
        __args: {
          data: [{ title: 'Nouvelle sous-tâche', parentTaskId, position: 'V' }],
        },
        id: true,
      },
    } as never);

    setRefusalMessage(null);
    await loadChildrenPage(parentTaskId);

    if (!expandedIdsRef.current.has(parentTaskId)) {
      const nextExpandedIds = new Set(expandedIdsRef.current);

      nextExpandedIds.add(parentTaskId);
      expandedIdsRef.current = nextExpandedIds;
      setExpandedIds(nextExpandedIds);
    }
  };

  // Client-side rejection: an invalid parent link is refused here, before any
  // mutation, and the picker resets to the current parent.
  const reparentTask = async (
    taskId: string,
    candidateParentId: string | null,
  ): Promise<void> => {
    let payload: TaskParentPayload;

    try {
      payload = buildTaskParentPayload({
        taskId,
        candidateParentId,
        parentIdByTaskId,
      });
    } catch {
      setRefusalMessage(
        'Déplacement refusé : une tâche ne peut pas devenir sa propre descendante.',
      );
      return;
    }

    const client = new CoreApiClient();

    await client.mutation({
      updateTask: {
        __args: { id: taskId, data: { parentTaskId: payload.parentTaskId } },
        id: true,
      },
    } as never);

    setRefusalMessage(null);
    await reloadTree();
  };

  const detachTask = async (taskId: string): Promise<void> => {
    await reparentTask(taskId, null);
  };

  const rootNodes = childrenByParentId.get(null) ?? [];
  const isLoadingRoots =
    scopedTaskId === null &&
    rootNodes.length === 0 &&
    loadingParentIds.has(null);

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
      <strong>Sous-tâches</strong>
      {refusalMessage !== null && (
        <span style={{ color: appTheme.danger }} role="alert">
          {refusalMessage}
        </span>
      )}
      {isLoadingRoots ? (
        <span style={{ color: appTheme.textSecondary }}>Chargement…</span>
      ) : scopedTaskId !== null ? (
        <>
          <div style={{ display: 'flex', gap: appTheme.spacing1 }}>
            <button
              type="button"
              onClick={() => openTask(scopedTaskId)}
              style={{ ...ghostButtonStyle, color: appTheme.text }}
            >
              {rootTask?.title ?? 'Tâche'}
            </button>
            <button
              type="button"
              onClick={() => void createSubtask(scopedTaskId)}
              style={ghostButtonStyle}
            >
              + sous-tâche
            </button>
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: appTheme.spacing4,
              listStyle: 'none',
            }}
          >
            {(childrenByParentId.get(scopedTaskId) ?? []).map((node) => (
              <SubtaskItem
                key={node.id}
                node={node}
                childrenByParentId={childrenByParentId}
                pageStateByParentId={pageStateByParentId}
                loadingParentIds={loadingParentIds}
                expandedIds={expandedIds}
                loadedTasks={loadedTasks}
                parentIdByTaskId={parentIdByTaskId}
                onToggleExpanded={toggleExpanded}
                onLoadMoreChildren={loadChildrenPage}
                onCreateSubtask={createSubtask}
                onReparent={reparentTask}
                onDetach={detachTask}
              />
            ))}
          </ul>
        </>
      ) : (
        <ul
          style={{
            margin: 0,
            paddingLeft: appTheme.spacing2,
            listStyle: 'none',
          }}
        >
          {rootNodes.map((node) => (
            <SubtaskItem
              key={node.id}
              node={node}
              childrenByParentId={childrenByParentId}
              pageStateByParentId={pageStateByParentId}
              loadingParentIds={loadingParentIds}
              expandedIds={expandedIds}
              loadedTasks={loadedTasks}
              parentIdByTaskId={parentIdByTaskId}
              onToggleExpanded={toggleExpanded}
              onLoadMoreChildren={loadChildrenPage}
              onCreateSubtask={createSubtask}
              onReparent={reparentTask}
              onDetach={detachTask}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

type SubtaskItemProps = {
  node: TaskNode;
  childrenByParentId: Map<string | null, TaskNode[]>;
  pageStateByParentId: Map<string | null, TaskPageState>;
  loadingParentIds: Set<string | null>;
  expandedIds: Set<string>;
  loadedTasks: TaskTreeRecord[];
  parentIdByTaskId: TaskParentIdMap;
  onToggleExpanded: (taskId: string) => void;
  onLoadMoreChildren: (
    parentId: string | null,
    options?: { append?: boolean },
  ) => Promise<void>;
  onCreateSubtask: (parentTaskId: string) => Promise<void>;
  onReparent: (
    taskId: string,
    candidateParentId: string | null,
  ) => Promise<void>;
  onDetach: (taskId: string) => Promise<void>;
};

const SubtaskItem = ({
  node,
  childrenByParentId,
  pageStateByParentId,
  loadingParentIds,
  expandedIds,
  loadedTasks,
  parentIdByTaskId,
  onToggleExpanded,
  onLoadMoreChildren,
  onCreateSubtask,
  onReparent,
  onDetach,
}: SubtaskItemProps) => {
  const childNodes = childrenByParentId.get(node.id) ?? [];
  const isExpanded = expandedIds.has(node.id);
  const pageState = pageStateByParentId.get(node.id);
  const currentParentId = parentIdByTaskId.get(node.id) ?? '';

  const candidateIds = useMemo(
    () =>
      collectTaskParentCandidates({
        taskId: node.id,
        tasks: loadedTasks,
        parentIdByTaskId,
      }).map((task) => task.id),
    [node.id, loadedTasks, parentIdByTaskId],
  );

  const optionIds =
    currentParentId !== '' && !candidateIds.includes(currentParentId)
      ? [currentParentId, ...candidateIds]
      : candidateIds;

  return (
    <li style={{ padding: appTheme.spacing1 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: appTheme.spacing1,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={`Afficher les sous-tâches de ${node.title}`}
          onClick={() => onToggleExpanded(node.id)}
          style={ghostButtonStyle}
        >
          {isExpanded ? '▾' : '▸'}
        </button>
        <button
          type="button"
          onClick={() => openTask(node.id)}
          style={{ ...ghostButtonStyle, color: appTheme.text }}
        >
          {node.title}
        </button>
        <button
          type="button"
          onClick={() => void onCreateSubtask(node.id)}
          style={ghostButtonStyle}
        >
          + sous-tâche
        </button>
        <label style={{ color: appTheme.textSecondary }}>
          parent
          <select
            value={currentParentId}
            onChange={(event) =>
              void onReparent(
                node.id,
                event.target.value === '' ? null : event.target.value,
              )
            }
            style={{
              marginLeft: appTheme.spacing1,
              background: 'transparent',
              color: appTheme.text,
              border: `1px solid ${appTheme.border}`,
              borderRadius: appTheme.radius,
            }}
          >
            <option value="">Aucun (racine)</option>
            {optionIds.map((optionId) => (
              <option key={optionId} value={optionId}>
                {loadedTasks.find((task) => task.id === optionId)?.title ??
                  optionId}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void onDetach(node.id)}
          style={{ ...ghostButtonStyle, color: appTheme.danger }}
        >
          détacher
        </button>
      </div>
      {isExpanded && (
        <ul
          style={{
            margin: 0,
            paddingLeft: appTheme.spacing4,
            listStyle: 'none',
          }}
        >
          {childNodes.map((childNode) => (
            <SubtaskItem
              key={childNode.id}
              node={childNode}
              childrenByParentId={childrenByParentId}
              pageStateByParentId={pageStateByParentId}
              loadingParentIds={loadingParentIds}
              expandedIds={expandedIds}
              loadedTasks={loadedTasks}
              parentIdByTaskId={parentIdByTaskId}
              onToggleExpanded={onToggleExpanded}
              onLoadMoreChildren={onLoadMoreChildren}
              onCreateSubtask={onCreateSubtask}
              onReparent={onReparent}
              onDetach={onDetach}
            />
          ))}
          {loadingParentIds.has(node.id) && (
            <li style={{ color: appTheme.textSecondary }}>Chargement…</li>
          )}
          {pageState?.isLoaded === true && pageState.hasNextPage && (
            <li>
              <button
                type="button"
                onClick={() =>
                  void onLoadMoreChildren(node.id, { append: true })
                }
                style={ghostButtonStyle}
              >
                Charger plus
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.taskSubtasks,
  name: 'task-subtasks',
  description:
    'Liste imbriquée des sous-tâches avec déplacement de parent et refus des cycles.',
  component: TaskSubtasks,
});
