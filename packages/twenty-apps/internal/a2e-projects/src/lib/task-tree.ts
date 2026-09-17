// Pure rules of the task subtask forest and its parent-selection cycle guard.
//
// The nesting comes from the task self-relation (task.parentTask ➜ task): the
// foreign key lives on the child, so a flat list of rows nests into a forest.
// Tree mutations stay payload-only — the browser owns persistence — so
// node:test can exercise reparenting without a running server.
//
// Cycle detection is the SAME visited-set ancestor walk as a2e-documents'
// `isDocumentParentCycle`: a second structure that gains a parent link must
// reuse that one algorithm, not grow a second one. The walk is synchronous
// here because the browser holds the loaded tasks in a map, and an ancestor
// the map does not know ends the walk (the server-side guard re-checks the
// committed edge where the row lands).

export type TaskParentRelationRecord = {
  parentTask?: { id?: string | null } | null;
  parentTaskId?: string | null;
  // Raw join column (task-subtask.field.ts pins `subtaskId`): an event or a
  // query projection may carry the column instead of the relation object.
  subtaskId?: string | null;
};

export type TaskTreeRecord = TaskParentRelationRecord & {
  id: string;
  title?: string | null;
};

export type TaskTreeNode = TaskTreeRecord & {
  children: TaskTreeNode[];
};

export type TaskParentIdMap = Map<string, string | null>;

export type TaskParentPayload = {
  parentTaskId: string | null;
};

// The relation object, the field foreign key and the join column are three
// shapes of the same link; read whichever one the caller has. An empty string
// is "no parent", never a dangling id.
export const readTaskParentId = (
  record: TaskParentRelationRecord | null | undefined,
): string | null => {
  if (record == null) {
    return null;
  }

  const parentId =
    record.parentTask?.id ?? record.parentTaskId ?? record.subtaskId ?? null;

  return parentId === '' ? null : parentId;
};

export const collectTaskParentIdMap = (
  tasks: TaskTreeRecord[],
): TaskParentIdMap => {
  const parentIdByTaskId: TaskParentIdMap = new Map();

  for (const task of tasks) {
    parentIdByTaskId.set(task.id, readTaskParentId(task));
  }

  return parentIdByTaskId;
};

// A node is corrupt only when its own ancestry re-enters IT (a cycle can only
// be written by a client that bypassed this guard): promoting exactly those
// nodes to the root severs the loop while leaving every bystander attached.
// Stopping on any revisit would also promote innocent siblings of the loop.
const collectCycleBrokenTaskIds = (tasks: TaskTreeRecord[]): Set<string> => {
  const parentIdByTaskId = collectTaskParentIdMap(tasks);
  const brokenIds = new Set<string>();

  for (const task of tasks) {
    const visited = new Set<string>();
    let cursor = parentIdByTaskId.get(task.id) ?? null;

    while (cursor !== null) {
      if (cursor === task.id) {
        brokenIds.add(task.id);
        break;
      }

      if (visited.has(cursor)) {
        break;
      }

      visited.add(cursor);
      cursor = parentIdByTaskId.get(cursor) ?? null;
    }
  }

  return brokenIds;
};

// An orphan whose parent is missing from the loaded set surfaces at the root:
// dropping it would hide a task from every listing.
export const nestTaskTree = (tasks: TaskTreeRecord[]): TaskTreeNode[] => {
  const nodesById = new Map<string, TaskTreeNode>();
  const brokenIds = collectCycleBrokenTaskIds(tasks);
  const roots: TaskTreeNode[] = [];

  for (const task of tasks) {
    nodesById.set(task.id, { ...task, children: [] });
  }

  for (const task of tasks) {
    const node = nodesById.get(task.id);

    if (node === undefined) {
      continue;
    }

    const parentId = brokenIds.has(task.id) ? null : readTaskParentId(task);
    const parent = parentId === null ? undefined : nodesById.get(parentId);

    if (parent === undefined || parent === node) {
      roots.push(node);
    } else {
      parent.children.push(node);
    }
  }

  return roots;
};

export const flattenTaskTree = (nodes: TaskTreeNode[]): TaskTreeNode[] => {
  const flattened: TaskTreeNode[] = [];

  for (const node of nodes) {
    flattened.push(node, ...flattenTaskTree(node.children));
  }

  return flattened;
};

// The ancestor walk shared with a2e-documents' document-cycle guard. Seeding
// the visited set with the moving task makes "parent = self" and "parent = own
// descendant" the same reachability test, and an already-looping ancestry is
// detected on the first revisit.
export const isTaskParentCycle = (options: {
  taskId: string;
  candidateParentId: string | null | undefined;
  parentIdByTaskId: TaskParentIdMap;
}): boolean => {
  const { taskId, candidateParentId, parentIdByTaskId } = options;

  if (candidateParentId == null || candidateParentId === '') {
    return false;
  }

  const visited = new Set<string>([taskId]);
  let cursor: string | null = candidateParentId;

  while (cursor != null && cursor !== '') {
    if (visited.has(cursor)) {
      return true;
    }

    visited.add(cursor);
    cursor = parentIdByTaskId.get(cursor) ?? null;
  }

  return false;
};

// Client-side rejection: a cyclic parent link never reaches the API. Throwing
// (rather than returning null) mirrors `buildMoveDocumentPayload`, so a caller
// cannot silently apply an invalid move.
export const buildTaskParentPayload = (options: {
  taskId: string;
  candidateParentId: string | null | undefined;
  parentIdByTaskId: TaskParentIdMap;
}): TaskParentPayload => {
  const { taskId, candidateParentId, parentIdByTaskId } = options;
  const normalizedParentId =
    candidateParentId == null || candidateParentId === ''
      ? null
      : candidateParentId;

  if (
    isTaskParentCycle({
      taskId,
      candidateParentId: normalizedParentId,
      parentIdByTaskId,
    })
  ) {
    throw new Error('a task cannot become its own parent or descendant');
  }

  return { parentTaskId: normalizedParentId };
};

// Picker options: every loaded task the moving task may legally take as parent
// — never itself, never one of its own descendants. Cycle validation and
// option building share the one predicate above.
export const collectTaskParentCandidates = (options: {
  taskId: string;
  tasks: TaskTreeRecord[];
  parentIdByTaskId: TaskParentIdMap;
}): TaskTreeRecord[] =>
  options.tasks.filter(
    (task) =>
      task.id !== options.taskId &&
      !isTaskParentCycle({
        taskId: options.taskId,
        candidateParentId: task.id,
        parentIdByTaskId: options.parentIdByTaskId,
      }),
  );
