// PURE RULES OF THE TIME TRACKER.
//
// The running timer is one link (task, optional project, start instant); a
// stopped timer becomes one `timeEntry` row (the pre-existing P4.1 object —
// no second time object is declared here). Everything the browser does to a
// timer is expressed as a pure transition below so node:test can prove the
// state machine and the rollup math without a server, and the front
// component only owns rendering + persistence.
//
// Minutes are the stored unit (`timeEntry.minutes`), so every transition
// works in whole minutes. A sub-minute session still logs
// `MINIMUM_LOGGED_MINUTES`: an entry worth zero minutes is indistinguishable
// from a bug, and manual trackers floor the same way.

export const MINIMUM_LOGGED_MINUTES = 1;

export const TIMER_STORAGE_KEY = 'a2e-projects-running-timer';

export type TimeTrackerTimer = {
  taskId: string;
  projectId: string | null;
  startedAt: string;
};

export type TimeEntryPayload = {
  label: string;
  minutes: number;
  spentAt: string;
  taskId: string;
  projectId: string | null;
};

// The relation, the foreign-key input name and the raw join column are three
// shapes of the same link; read whichever one the caller has. An empty string
// is "unset", never a dangling id.
export type TimeEntryRelationRecord = {
  task?: { id?: string | null; title?: string | null } | null;
  taskId?: string | null;
  project?: { id?: string | null } | null;
  projectId?: string | null;
};

export type TimeEntryRecord = TimeEntryRelationRecord & {
  id: string;
  minutes?: number | null;
  spentAt?: string | null;
  label?: string | null;
  taskTitle?: string | null;
};

export type ProjectTimeRollupRow = {
  taskId: string;
  taskTitle: string;
  totalMinutes: number;
  entryCount: number;
};

export type ProjectTimeRollup = {
  totalMinutes: number;
  rows: ProjectTimeRollupRow[];
};

export type TimeRollupByProject = {
  totalMinutes: number;
  rows: { projectId: string; totalMinutes: number; entryCount: number }[];
};

const normalizeId = (value: string | null | undefined): string | null =>
  value == null || value === '' ? null : value;

export const readTimeEntryTaskId = (
  record: TimeEntryRelationRecord | null | undefined,
): string | null => {
  if (record == null) {
    return null;
  }

  return normalizeId(record.task?.id ?? record.taskId ?? null);
};

export const readTimeEntryProjectId = (
  record: TimeEntryRelationRecord | null | undefined,
): string | null => {
  if (record == null) {
    return null;
  }

  return normalizeId(record.project?.id ?? record.projectId ?? null);
};

export const readTimeEntryTaskTitle = (
  record: TimeEntryRecord | null | undefined,
): string => {
  if (record == null) {
    return '';
  }

  return record.taskTitle ?? record.task?.title ?? '';
};

export const parseTimestamp = (
  value: string | null | undefined,
): number | null => {
  if (value == null || value === '') {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? null : timestamp;
};

// Whole minutes between a start instant and `now`, floored and never
// negative: a clock skew or an unparsable start reads as "just started",
// which the stop transition then floors at MINIMUM_LOGGED_MINUTES.
export const computeElapsedMinutes = (
  startedAt: string | null | undefined,
  now: Date,
): number => {
  const startedTimestamp = parseTimestamp(startedAt);

  if (startedTimestamp === null) {
    return 0;
  }

  const elapsedMilliseconds = now.getTime() - startedTimestamp;

  if (elapsedMilliseconds <= 0) {
    return 0;
  }

  return Math.floor(elapsedMilliseconds / 60_000);
};

export const formatDuration = (minutes: number | null | undefined): string => {
  const safeMinutes =
    minutes == null || !Number.isFinite(minutes) || minutes <= 0
      ? 0
      : Math.floor(minutes);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  return `${hours} h ${remainingMinutes.toString().padStart(2, '0')}`;
};

// Starting a second timer replaces the first: the tracker holds exactly one
// running session, so an accidental double-start cannot fork the state.
export const startTimer = (options: {
  taskId: string;
  projectId?: string | null;
  now: Date;
}): TimeTrackerTimer => {
  const taskId = normalizeId(options.taskId);

  if (taskId === null) {
    throw new Error('a timer cannot start without a task');
  }

  return {
    taskId,
    projectId: normalizeId(options.projectId ?? null),
    startedAt: options.now.toISOString(),
  };
};

export const isTimerRunningForTask = (
  timer: TimeTrackerTimer | null,
  taskId: string | null | undefined,
): boolean => timer !== null && timer.taskId === normalizeId(taskId);

export const stopTimer = (options: {
  timer: TimeTrackerTimer;
  now: Date;
  minimumMinutes?: number;
}): TimeEntryPayload => {
  const minimumMinutes = options.minimumMinutes ?? MINIMUM_LOGGED_MINUTES;
  const elapsedMinutes = computeElapsedMinutes(
    options.timer.startedAt,
    options.now,
  );
  const minutes = Math.max(minimumMinutes, elapsedMinutes);

  return {
    label: formatDuration(minutes),
    minutes,
    spentAt: options.now.toISOString(),
    taskId: options.timer.taskId,
    projectId: options.timer.projectId,
  };
};

export const serializeTimer = (timer: TimeTrackerTimer): string =>
  JSON.stringify(timer);

export const parseTimer = (
  serialized: string | null | undefined,
): TimeTrackerTimer | null => {
  if (serialized == null || serialized === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<TimeTrackerTimer>;
    const taskId = normalizeId(parsed.taskId);
    const startedAt = normalizeId(parsed.startedAt);

    if (taskId === null || startedAt === null) {
      return null;
    }

    return {
      taskId,
      projectId: normalizeId(parsed.projectId ?? null),
      startedAt,
    };
  } catch {
    return null;
  }
};

const readMinutes = (record: TimeEntryRecord): number => {
  const minutes = record.minutes;

  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) {
    return 0;
  }

  return Math.floor(minutes);
};

export const sumTimeEntryMinutes = (entries: TimeEntryRecord[]): number =>
  entries.reduce((total, entry) => total + readMinutes(entry), 0);

// Per-project rollup: the project's own entries grouped by task, biggest
// effort first so the widget reads as a leaderboard. Entries with no task
// (project-only logging) collapse under one explicit bucket instead of
// being dropped.
export const buildProjectTimeRollup = (
  entries: TimeEntryRecord[],
): ProjectTimeRollup => {
  const rowsByTaskId = new Map<string, ProjectTimeRollupRow>();

  for (const entry of entries) {
    const taskId = readTimeEntryTaskId(entry) ?? 'sans-tache';
    const existing = rowsByTaskId.get(taskId);

    if (existing === undefined) {
      rowsByTaskId.set(taskId, {
        taskId,
        taskTitle:
          taskId === 'sans-tache'
            ? 'Sans tâche'
            : readTimeEntryTaskTitle(entry) || taskId,
        totalMinutes: readMinutes(entry),
        entryCount: 1,
      });
    } else {
      existing.totalMinutes += readMinutes(entry);
      existing.entryCount += 1;
    }
  }

  const rows = [...rowsByTaskId.values()].sort(
    (left, right) =>
      right.totalMinutes - left.totalMinutes ||
      right.entryCount - left.entryCount ||
      left.taskId.localeCompare(right.taskId),
  );

  return { totalMinutes: sumTimeEntryMinutes(entries), rows };
};

// Workspace rollup by project, the P4 acceptance "time rollup" shape. Entries
// whose project was detached (SET_NULL) fall under one bucket keyed by id
// rather than vanishing.
export const buildTimeRollupByProject = (
  entries: TimeEntryRecord[],
): TimeRollupByProject => {
  const rowsByProjectId = new Map<
    string,
    { projectId: string; totalMinutes: number; entryCount: number }
  >();

  for (const entry of entries) {
    const projectId = readTimeEntryProjectId(entry) ?? 'sans-projet';
    const existing = rowsByProjectId.get(projectId);

    if (existing === undefined) {
      rowsByProjectId.set(projectId, {
        projectId,
        totalMinutes: readMinutes(entry),
        entryCount: 1,
      });
    } else {
      existing.totalMinutes += readMinutes(entry);
      existing.entryCount += 1;
    }
  }

  const rows = [...rowsByProjectId.values()].sort(
    (left, right) =>
      right.totalMinutes - left.totalMinutes ||
      left.projectId.localeCompare(right.projectId),
  );

  return { totalMinutes: sumTimeEntryMinutes(entries), rows };
};
