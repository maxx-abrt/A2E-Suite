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
  buildGanttModel,
  GANTT_DAY_MS,
  getGanttStatusColor,
  type GanttBar,
  type GanttModel,
  type GanttRow,
  type GanttTaskRecord,
} from '../lib/project-gantt.ts';

// LE GANTT DU PROJET.
//
// The native task record page / project page cannot draw a time axis, so the
// app owns the genuinely novel layout: project tasks placed on a day scale,
// with the `parentTask` relation drawn as a dependency arrow. The rendering is
// a thin layer over lib/project-gantt.ts, which owns the range, the bars and
// the virtualized windows — so 1k tasks mount only the visible rows/columns.
// No animation library: bars and links are plain positioned elements.

const TASK_PAGE_SIZE = 100;
const LABEL_WIDTH = 220;
const AXIS_HEIGHT = 28;
const ROW_HEIGHT = 32;
const DAY_WIDTH = 36;
const VIEWPORT_HEIGHT = 420;
const VIEWPORT_WIDTH_FALLBACK = 960;

type GanttTasksPage = {
  nodes: GanttTaskRecord[];
  endCursor: string | null;
  hasNextPage: boolean;
};

type GanttTasksQueryResult = {
  tasks?: {
    edges?: { node: GanttTaskRecord }[];
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
  };
};

const appTheme = {
  font: 'var(--t-font-family)',
  text: 'var(--t-font-color-primary)',
  textSecondary: 'var(--t-font-color-secondary)',
  border: 'var(--t-border-color-light)',
  background: 'var(--t-background-color-primary)',
  surface: 'var(--t-background-color-secondary)',
  radius: 'var(--t-border-radius-sm)',
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
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

const formatDayLabel = (dayTimestampMs: number): string =>
  new Date(dayTimestampMs).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });

const fetchTaskPage = async (options: {
  projectId: string;
  after: string | null;
}): Promise<GanttTasksPage> => {
  const client = new CoreApiClient();

  // A project's tasks are filtered through the relation target id, not the
  // join column key (`project { id }`, not `projectId`).
  const result = (await client.query({
    tasks: {
      __args: {
        filter: { project: { id: { eq: options.projectId } } },
        orderBy: [
          { dueAt: 'AscNullsFirst' },
          { createdAt: 'Asc' },
          { id: 'Asc' },
        ],
        first: TASK_PAGE_SIZE,
        ...(options.after === null ? {} : { after: options.after }),
      },
      edges: {
        node: {
          id: true,
          title: true,
          dueAt: true,
          createdAt: true,
          projectStatus: true,
          parentTask: { id: true },
        },
      },
      pageInfo: { hasNextPage: true, endCursor: true },
    },
  } as never)) as GanttTasksQueryResult;

  return {
    nodes: result?.tasks?.edges?.map((edge) => edge.node) ?? [],
    hasNextPage: result?.tasks?.pageInfo?.hasNextPage ?? false,
    endCursor: result?.tasks?.pageInfo?.endCursor ?? null,
  };
};

const mergeTasks = (
  loaded: GanttTaskRecord[],
  page: GanttTaskRecord[],
): GanttTaskRecord[] => {
  const knownIds = new Set(loaded.map((task) => task.id));
  const merged = [...loaded];

  for (const task of page) {
    if (!knownIds.has(task.id)) {
      knownIds.add(task.id);
      merged.push(task);
    }
  }

  return merged;
};

const ProjectGantt = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const projectId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [tasks, setTasks] = useState<GanttTaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(VIEWPORT_WIDTH_FALLBACK);
  const [viewportHeight, setViewportHeight] = useState(VIEWPORT_HEIGHT);

  // The first page reloads only when the scoped project changes: keying it on
  // the cursor would reset the list after every "load more".
  useEffect(() => {
    setTasks([]);
    setEndCursor(null);
    setHasNextPage(false);

    if (projectId === null) {
      return;
    }

    let isCancelled = false;

    setIsLoading(true);
    void fetchTaskPage({ projectId, after: null }).then((page) => {
      if (isCancelled) {
        return;
      }

      setTasks(page.nodes);
      setHasNextPage(page.hasNextPage);
      setEndCursor(page.endCursor);
      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [projectId]);

  const loadMore = useCallback(async () => {
    if (projectId === null || endCursor === null) {
      return;
    }

    setIsLoading(true);

    try {
      const page = await fetchTaskPage({ projectId, after: endCursor });

      setTasks((current) => mergeTasks(current, page.nodes));
      setHasNextPage(page.hasNextPage);
      setEndCursor(page.endCursor);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, endCursor]);

  // Remote-DOM measurement can be unavailable; fall back to the declared size
  // so the virtual windows still bound the mounted rows/columns.
  useEffect(() => {
    const element = scrollContainerRef.current;

    if (element === null) {
      return;
    }

    const nextWidth = element.clientWidth;

    if (nextWidth > 0) {
      setViewportWidth(nextWidth);
    }

    const nextHeight = element.clientHeight;

    if (nextHeight > 0) {
      setViewportHeight(nextHeight);
    }
  }, []);

  const model: GanttModel = useMemo(
    () =>
      buildGanttModel(tasks, {
        viewportHeight,
        viewportWidth,
        scrollTop,
        scrollLeft,
        rowHeight: ROW_HEIGHT,
        dayWidth: DAY_WIDTH,
      }),
    [tasks, viewportHeight, viewportWidth, scrollTop, scrollLeft],
  );

  const barByTaskId = useMemo(
    () => new Map(model.bars.map((bar) => [bar.taskId, bar])),
    [model.bars],
  );

  const rowIndexByTaskId = useMemo(
    () => new Map(model.bars.map((bar, index) => [bar.taskId, index])),
    [model.bars],
  );

  const visibleTaskIds = useMemo(
    () => new Set(model.rows.map((row) => row.taskId)),
    [model.rows],
  );

  const visibleLinks = useMemo(
    () =>
      model.links.filter(
        (link) =>
          visibleTaskIds.has(link.fromTaskId) &&
          visibleTaskIds.has(link.toTaskId),
      ),
    [model.links, visibleTaskIds],
  );

  if (projectId === null) {
    return null;
  }

  if (isLoading && tasks.length === 0) {
    return <span style={{ color: appTheme.textSecondary }}>Chargement…</span>;
  }

  if (tasks.length === 0) {
    return (
      <span style={{ color: appTheme.textSecondary }}>
        Aucune tâche à afficher.
      </span>
    );
  }

  const rowsHeight = model.rows.length * ROW_HEIGHT;

  return (
    <div
      style={{
        fontFamily: appTheme.font,
        color: appTheme.text,
        display: 'flex',
        flexDirection: 'column',
        gap: appTheme.spacing1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: appTheme.spacing2,
        }}
      >
        <strong>Gantt</strong>
        <span style={{ color: appTheme.textSecondary }}>
          {model.bars.length} tâche{model.bars.length > 1 ? 's' : ''} ·{' '}
          {model.range.dayCount} jours
        </span>
      </div>
      <div
        ref={scrollContainerRef}
        onScroll={(event) => {
          setScrollTop(event.currentTarget.scrollTop);
          setScrollLeft(event.currentTarget.scrollLeft);

          if (event.currentTarget.clientWidth > 0) {
            setViewportWidth(event.currentTarget.clientWidth);
          }

          if (event.currentTarget.clientHeight > 0) {
            setViewportHeight(event.currentTarget.clientHeight);
          }
        }}
        style={{
          overflow: 'auto',
          height: VIEWPORT_HEIGHT,
          border: `1px solid ${appTheme.border}`,
          borderRadius: appTheme.radius,
          background: appTheme.background,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: LABEL_WIDTH + model.totalWidth,
            minHeight: model.totalHeight + AXIS_HEIGHT,
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 3,
              display: 'flex',
              height: AXIS_HEIGHT,
              background: appTheme.surface,
            }}
          >
            <div
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 1,
                width: LABEL_WIDTH,
                flexShrink: 0,
                background: appTheme.surface,
                color: appTheme.textSecondary,
                lineHeight: `${AXIS_HEIGHT}px`,
                paddingLeft: appTheme.spacing1,
              }}
            >
              Tâche
            </div>
            <div style={{ position: 'relative', width: model.totalWidth }}>
              {model.dayTicks.map((day) => (
                <span
                  key={day}
                  style={{
                    position: 'absolute',
                    left: day * DAY_WIDTH,
                    width: DAY_WIDTH,
                    textAlign: 'center',
                    lineHeight: `${AXIS_HEIGHT}px`,
                    color: appTheme.textSecondary,
                    fontSize: 11,
                    borderLeft: `1px solid ${appTheme.border}`,
                  }}
                >
                  {formatDayLabel(model.range.startMs + day * GANTT_DAY_MS)}
                </span>
              ))}
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: AXIS_HEIGHT,
              left: LABEL_WIDTH,
              width: model.totalWidth,
              height: model.totalHeight,
            }}
          >
            {model.dayTicks.map((day) => (
              <div
                key={day}
                style={{
                  position: 'absolute',
                  left: day * DAY_WIDTH,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: appTheme.border,
                }}
              />
            ))}
          </div>

          <div
            style={{
              position: 'absolute',
              top: AXIS_HEIGHT + model.rowWindow.offsetY,
              left: 0,
              right: 0,
              height: rowsHeight,
            }}
          >
            {model.rows.map((row) => (
              <GanttRowView key={row.taskId} row={row} />
            ))}

            <svg
              width={model.totalWidth}
              height={rowsHeight}
              style={{
                position: 'absolute',
                top: 0,
                left: LABEL_WIDTH,
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              {visibleLinks.map((link) => {
                const fromBar = barByTaskId.get(link.fromTaskId);
                const toBar = barByTaskId.get(link.toTaskId);
                const fromRowIndex = rowIndexByTaskId.get(link.fromTaskId);
                const toRowIndex = rowIndexByTaskId.get(link.toTaskId);

                if (
                  fromBar === undefined ||
                  toBar === undefined ||
                  fromRowIndex === undefined ||
                  toRowIndex === undefined
                ) {
                  return null;
                }

                const fromX = (fromBar.startDay + fromBar.daySpan) * DAY_WIDTH;
                const toX = toBar.startDay * DAY_WIDTH;
                const fromY =
                  (fromRowIndex - model.rowWindow.startIndex) * ROW_HEIGHT +
                  ROW_HEIGHT / 2;
                const toY =
                  (toRowIndex - model.rowWindow.startIndex) * ROW_HEIGHT +
                  ROW_HEIGHT / 2;
                const elbowX = Math.max(fromX + 6, toX - 10);

                return (
                  <path
                    key={`${link.fromTaskId}-${link.toTaskId}`}
                    d={`M ${fromX} ${fromY} H ${elbowX} V ${toY} H ${toX}`}
                    fill="none"
                    stroke="var(--t-color-gray)"
                    strokeWidth={1}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
      {hasNextPage && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={isLoading}
          style={ghostButtonStyle}
        >
          {isLoading ? 'Chargement…' : 'Charger plus de tâches'}
        </button>
      )}
    </div>
  );
};

type GanttRowViewProps = {
  row: GanttRow;
};

const GanttRowView = ({ row }: GanttRowViewProps) => (
  <div style={{ display: 'flex', height: ROW_HEIGHT }}>
    <div
      style={{
        position: 'sticky',
        left: 0,
        zIndex: 1,
        width: LABEL_WIDTH,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--t-background-color-primary)',
        paddingLeft: 'var(--t-spacing-1)',
      }}
    >
      <button
        type="button"
        onClick={() => openTask(row.taskId)}
        title={row.title}
        style={{
          ...ghostButtonStyle,
          color: 'var(--t-font-color-primary)',
          width: '100%',
          textAlign: 'left',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {row.title}
      </button>
    </div>
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: ROW_HEIGHT,
      }}
    >
      <GanttBarView bar={row} />
    </div>
  </div>
);

type GanttBarViewProps = {
  bar: GanttBar;
};

const GanttBarView = ({ bar }: GanttBarViewProps) => {
  const left = bar.startDay * DAY_WIDTH;
  const color = getGanttStatusColor(bar.status);

  if (bar.isMilestone) {
    return (
      <div
        title={bar.title}
        style={{
          position: 'absolute',
          left: left + DAY_WIDTH / 2 - 6,
          top: ROW_HEIGHT / 2 - 6,
          width: 12,
          height: 12,
          background: color,
          transform: 'rotate(45deg)',
        }}
      />
    );
  }

  return (
    <div
      title={bar.title}
      style={{
        position: 'absolute',
        left,
        top: 6,
        width: Math.max(bar.daySpan * DAY_WIDTH, 4),
        height: ROW_HEIGHT - 12,
        background: color,
        borderRadius: 'var(--t-border-radius-sm)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        color: 'var(--t-font-color-inverted-primary)',
        fontSize: 11,
        lineHeight: `${ROW_HEIGHT - 12}px`,
        paddingLeft: 6,
      }}
    >
      {bar.title}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.projectGantt,
  name: 'project-gantt',
  description:
    'Gantt du projet : tâches placées sur un axe temporel, dépendances parent → enfant, lignes virtualisées.',
  component: ProjectGantt,
});
