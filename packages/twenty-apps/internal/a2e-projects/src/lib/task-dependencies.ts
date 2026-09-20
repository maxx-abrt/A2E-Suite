// Pure rules of the task dependency edge and its picker cycle guard.
//
// The dependency comes from the task self-relation (task.blockedBy ➜ task):
// the foreign key lives on the blocked task, so following `blockedBy` from a
// task walks its chain of blockers. Mutations stay payload-only — the browser
// owns persistence — so node:test can exercise the guard without a server.
//
// The walk is the SAME visited-set reachability check as task-tree.ts's
// `isTaskParentCycle` (itself the a2e-documents `isDocumentParentCycle`
// algorithm): the map is synchronous and injected-free so the caller passes
// the loaded rows, and an ancestor the map does not know ends the walk.

export type TaskDependencyRelationRecord = {
  blockedBy?: { id?: string | null } | null;
  // Raw join column (task-blocked-by.field.ts pins `blockedById`): an event or
  // a query projection may carry the column instead of the relation object.
  blockedById?: string | null;
};

export type TaskDependencyRecord = TaskDependencyRelationRecord & {
  id: string;
  title?: string | null;
};

export type TaskDependencyIdMap = Map<string, string | null>;

export type TaskDependencyPayload = {
  blockedById: string | null;
};

// The relation object and the join column are two shapes of the same link;
// read whichever one the caller has. An empty string is "no dependency",
// never a dangling id.
export const readTaskDependencyId = (
  record: TaskDependencyRelationRecord | null | undefined,
): string | null => {
  if (record == null) {
    return null;
  }

  const dependencyId = record.blockedBy?.id ?? record.blockedById ?? null;

  return dependencyId === '' ? null : dependencyId;
};

export const collectTaskDependencyIdMap = (
  tasks: TaskDependencyRecord[],
): TaskDependencyIdMap => {
  const dependencyIdByTaskId: TaskDependencyIdMap = new Map();

  for (const task of tasks) {
    dependencyIdByTaskId.set(task.id, readTaskDependencyId(task));
  }

  return dependencyIdByTaskId;
};

// Adding `task.blockedBy = candidate` closes a cycle exactly when the
// candidate's own blocker chain already reaches the task: the new edge would
// make the task an ancestor of its own dependency. Seeding the visited set
// with the task makes "blocked by self" and "blocked by a transitive
// dependent" the same reachability test, and an already-looping chain is
// detected on the first revisit.
export const isTaskDependencyCycle = (options: {
  taskId: string;
  candidateDependencyId: string | null | undefined;
  dependencyIdByTaskId: TaskDependencyIdMap;
}): boolean => {
  const { taskId, candidateDependencyId, dependencyIdByTaskId } = options;

  if (candidateDependencyId == null || candidateDependencyId === '') {
    return false;
  }

  const visited = new Set<string>([taskId]);
  let cursor: string | null = candidateDependencyId;

  while (cursor != null && cursor !== '') {
    if (visited.has(cursor)) {
      return true;
    }

    visited.add(cursor);
    cursor = dependencyIdByTaskId.get(cursor) ?? null;
  }

  return false;
};

// Client-side rejection: a cyclic dependency never reaches the API. Throwing
// (rather than returning null) mirrors `buildTaskParentPayload`, so a caller
// cannot silently apply an invalid edge.
export const buildTaskDependencyPayload = (options: {
  taskId: string;
  candidateDependencyId: string | null | undefined;
  dependencyIdByTaskId: TaskDependencyIdMap;
}): TaskDependencyPayload => {
  const { taskId, candidateDependencyId, dependencyIdByTaskId } = options;
  const normalizedDependencyId =
    candidateDependencyId == null || candidateDependencyId === ''
      ? null
      : candidateDependencyId;

  if (
    isTaskDependencyCycle({
      taskId,
      candidateDependencyId: normalizedDependencyId,
      dependencyIdByTaskId,
    })
  ) {
    throw new Error(
      'a task cannot be blocked by itself or by one of its dependents',
    );
  }

  return { blockedById: normalizedDependencyId };
};

// Picker options: every loaded task the moving task may legally depend on —
// never itself, never one it already blocks (directly or transitively). Cycle
// validation and option building share the one predicate above.
export const collectTaskDependencyCandidates = (options: {
  taskId: string;
  tasks: TaskDependencyRecord[];
  dependencyIdByTaskId: TaskDependencyIdMap;
}): TaskDependencyRecord[] =>
  options.tasks.filter(
    (task) =>
      task.id !== options.taskId &&
      !isTaskDependencyCycle({
        taskId: options.taskId,
        candidateDependencyId: task.id,
        dependencyIdByTaskId: options.dependencyIdByTaskId,
      }),
  );
