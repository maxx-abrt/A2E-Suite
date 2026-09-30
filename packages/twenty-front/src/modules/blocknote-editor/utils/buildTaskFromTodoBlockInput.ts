export type TodoTaskInput = {
  id: string;
  title: string;
  status: 'TODO';
  dueAt?: string;
};

// Native `task` payload for the to-do block's "Convert to task" action. The
// block keeps the returned id in its own props, so the conversion is
// idempotent and the to-do still points at the task it created (provenance).
// A blank title never mints an untitled task.
export const buildTaskFromTodoBlockInput = ({
  taskId,
  title,
  dueAt,
}: {
  taskId: string;
  title: string;
  dueAt?: string;
}): TodoTaskInput | null => {
  const trimmedTitle = title.trim();

  if (trimmedTitle.length === 0) {
    return null;
  }

  return {
    id: taskId,
    title: trimmedTitle,
    status: 'TODO',
    ...(dueAt ? { dueAt } : {}),
  };
};
