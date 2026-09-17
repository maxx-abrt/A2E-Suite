import { useCallback, useEffect, useMemo, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import {
  computeElapsedMinutes,
  formatDuration,
  parseTimer,
  serializeTimer,
  startTimer,
  stopTimer,
  TIMER_STORAGE_KEY,
  type TimeEntryRecord,
  type TimeTrackerTimer,
} from '../lib/time-tracker.ts';

// LE CHRONOMÈTRE DE TÂCHE.
//
// Start/stop scoped to the selected task, the task's entry list, and nothing
// else: the storage unit stays the pre-existing `timeEntry` object and the
// surface mounts through the app's command-menu/side-panel pattern
// (presence-adjacent), so no second presence system or time object appears.
// The running timer is one link persisted in localStorage so a remount or a
// record switch resumes the same session instead of starting a second one.

const ENTRIES_PAGE_SIZE = 50;

type TaskScope = {
  id: string;
  title: string;
  projectId: string | null;
};

type TaskQueryResult = {
  task?: {
    id: string;
    title: string | null;
    project?: { id?: string | null } | null;
  } | null;
};

type TimeEntriesQueryResult = {
  timeEntries?: { edges?: { node: TimeEntryRecord }[] };
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

const readStore = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const readStoredTimer = (): TimeTrackerTimer | null => {
  const store = readStore();

  try {
    return parseTimer(store?.getItem(TIMER_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
};

const writeStoredTimer = (timer: TimeTrackerTimer | null): void => {
  const store = readStore();

  try {
    if (timer === null) {
      store?.removeItem(TIMER_STORAGE_KEY);
    } else {
      store?.setItem(TIMER_STORAGE_KEY, serializeTimer(timer));
    }
  } catch {
    // A read-only sandbox loses persistence, not the in-memory timer.
  }
};

const fetchTaskScope = async (taskId: string): Promise<TaskScope | null> => {
  const client = new CoreApiClient();

  const result = (await client.query({
    task: {
      __args: { id: taskId },
      id: true,
      title: true,
      project: { id: true },
    },
  } as never)) as TaskQueryResult;

  const task = result?.task;

  if (task == null) {
    return null;
  }

  return {
    id: task.id,
    title: task.title ?? 'Tâche',
    projectId: task.project?.id ?? null,
  };
};

const fetchTaskEntries = async (taskId: string): Promise<TimeEntryRecord[]> => {
  const client = new CoreApiClient();

  const result = (await client.query({
    timeEntries: {
      __args: {
        filter: { task: { id: { eq: taskId } } },
        orderBy: [{ spentAt: 'DescNullsLast' }, { createdAt: 'DescNullsLast' }],
        first: ENTRIES_PAGE_SIZE,
      },
      edges: {
        node: { id: true, minutes: true, spentAt: true, label: true },
      },
    },
  } as never)) as TimeEntriesQueryResult;

  return result?.timeEntries?.edges?.map((edge) => edge.node) ?? [];
};

const createTimeEntry = async (payload: {
  label: string;
  minutes: number;
  spentAt: string;
  taskId: string;
  projectId: string | null;
}): Promise<void> => {
  const client = new CoreApiClient();

  await client.mutation({
    createTimeEntries: {
      __args: {
        data: [
          {
            label: payload.label,
            minutes: payload.minutes,
            spentAt: payload.spentAt,
            taskId: payload.taskId,
            ...(payload.projectId === null
              ? {}
              : { projectId: payload.projectId }),
          },
        ],
      },
      id: true,
    },
  } as never);
};

const deleteTimeEntry = async (entryId: string): Promise<void> => {
  const client = new CoreApiClient();

  await client.mutation({
    deleteTimeEntry: {
      __args: { id: entryId },
      id: true,
    },
  } as never);
};

const formatSpentAt = (spentAt: string | null | undefined): string => {
  if (spentAt == null || spentAt === '') {
    return '';
  }

  const parsed = new Date(spentAt);

  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString('fr-FR');
};

const TimeTracker = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const taskId = selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const [task, setTask] = useState<TaskScope | null>(null);
  const [entries, setEntries] = useState<TimeEntryRecord[]>([]);
  const [timer, setTimer] = useState<TimeTrackerTimer | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadEntries = useCallback(async (scopeTaskId: string) => {
    setEntries(await fetchTaskEntries(scopeTaskId));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      if (taskId === null) {
        setTask(null);
        setEntries([]);
        return;
      }

      const scope = await fetchTaskScope(taskId);

      if (isCancelled) {
        return;
      }

      setTask(scope);
      setTimer(readStoredTimer());
      await loadEntries(taskId);
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [taskId, loadEntries]);

  // The elapsed label needs a heartbeat, but only while a timer runs.
  useEffect(() => {
    if (timer === null) {
      return;
    }

    const interval = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const elapsedMinutes = useMemo(
    () => (timer === null ? 0 : computeElapsedMinutes(timer.startedAt, now)),
    [timer, now],
  );

  const start = useCallback(() => {
    if (task === null) {
      return;
    }

    const nextTimer = startTimer({
      taskId: task.id,
      projectId: task.projectId,
      now: new Date(),
    });

    writeStoredTimer(nextTimer);
    setTimer(nextTimer);
    setNow(new Date());
    setErrorMessage(null);
  }, [task]);

  const stop = useCallback(async () => {
    if (timer === null) {
      return;
    }

    const payload = stopTimer({ timer, now: new Date() });

    try {
      await createTimeEntry(payload);
      writeStoredTimer(null);
      setTimer(null);
      setErrorMessage(null);
      await loadEntries(payload.taskId);
    } catch {
      // Keep the timer running: the session is not lost when the write fails.
      setErrorMessage("L'enregistrement a échoué, le chronomètre continue.");
    }
  }, [timer, loadEntries]);

  const removeEntry = useCallback(
    async (entryId: string) => {
      if (taskId === null) {
        return;
      }

      await deleteTimeEntry(entryId);
      await loadEntries(taskId);
    },
    [taskId, loadEntries],
  );

  if (taskId === null) {
    return (
      <div style={{ fontFamily: appTheme.font, color: appTheme.textSecondary }}>
        Sélectionnez une tâche pour suivre le temps.
      </div>
    );
  }

  const totalMinutes = entries.reduce(
    (total, entry) => total + (entry.minutes ?? 0),
    0,
  );

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
      <strong>Chronomètre</strong>
      <span style={{ color: appTheme.textSecondary }}>
        {task?.title ?? 'Tâche'}
      </span>
      {errorMessage !== null && (
        <span style={{ color: appTheme.danger }} role="alert">
          {errorMessage}
        </span>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: appTheme.spacing2,
        }}
      >
        {timer === null ? (
          <button type="button" onClick={start} style={ghostButtonStyle}>
            Démarrer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stop()}
            style={{ ...ghostButtonStyle, color: appTheme.danger }}
          >
            Arrêter
          </button>
        )}
        <span>
          {timer === null
            ? `${formatDuration(totalMinutes)} au total`
            : formatDuration(elapsedMinutes)}
        </span>
      </div>
      <strong>Temps enregistré</strong>
      {entries.length === 0 ? (
        <span style={{ color: appTheme.textSecondary }}>Aucune entrée</span>
      ) : (
        <ul
          style={{
            margin: 0,
            paddingLeft: appTheme.spacing2,
            listStyle: 'none',
          }}
        >
          {entries.map((entry) => (
            <li
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: appTheme.spacing1,
                borderBottom: `1px solid ${appTheme.border}`,
                padding: appTheme.spacing1,
              }}
            >
              <span>{entry.label ?? formatDuration(entry.minutes)}</span>
              <span style={{ color: appTheme.textSecondary }}>
                {formatSpentAt(entry.spentAt)}
              </span>
              <button
                type="button"
                onClick={() => void removeEntry(entry.id)}
                style={{ ...ghostButtonStyle, color: appTheme.danger }}
              >
                supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.timeTracker,
  name: 'time-tracker',
  description:
    'Chronomètre de tâche : démarrer/arrêter, liste des entrées et total.',
  component: TimeTracker,
});
