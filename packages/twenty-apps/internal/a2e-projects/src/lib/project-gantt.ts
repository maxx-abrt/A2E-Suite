// Pure timeline math behind the project Gantt front component.
//
// The component is a thin renderer over this module: it feeds tasks plus the
// viewport, and this file decides the time range, the bars, the dependency
// links and which rows/day columns are actually mounted. Keeping it free of
// React and twenty-sdk is what lets node:test exercise the rendering and
// virtualization rules without a DOM or a running server.
//
// The native task object exposes only `dueAt` (end) plus `createdAt`, so a bar
// spans createdAt ➜ dueAt; a task with a single known date collapses to a
// one-day bar or a milestone marker. Dependencies are the app's `parentTask`
// self-relation drawn parent ➜ child — the same edge the subtask list uses.

import { readTaskParentId } from './task-tree.ts';

export const GANTT_DAY_MS = 24 * 60 * 60 * 1000;

export const GANTT_DEFAULT_ROW_HEIGHT = 32;
export const GANTT_DEFAULT_DAY_WIDTH = 36;
export const GANTT_DEFAULT_OVERSCAN = 4;
export const GANTT_PADDING_DAYS = 2;
export const GANTT_MINIMUM_DAY_COUNT = 14;

// Task-extension shape the widget projects from the Core API. `parentTaskId`
// is accepted alongside the relation so an event projection can reuse the
// same layout.
export type GanttTaskRecord = {
  id: string;
  title?: string | null;
  dueAt?: string | null;
  createdAt?: string | null;
  projectStatus?: string | null;
  parentTask?: { id?: string | null } | null;
  parentTaskId?: string | null;
};

export type GanttTaskBounds = {
  startMs: number;
  endMs: number;
  isMilestone: boolean;
};

export type GanttRange = {
  startMs: number;
  endMs: number;
  dayCount: number;
};

export type GanttBar = {
  taskId: string;
  title: string;
  status: string | null;
  parentTaskId: string | null;
  startMs: number;
  endMs: number;
  startDay: number;
  daySpan: number;
  isMilestone: boolean;
};

export type GanttDependencyLink = {
  fromTaskId: string;
  toTaskId: string;
};

export type GanttRow = GanttBar & { rowIndex: number };

export type GanttRowWindow = {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
};

export type GanttDayWindow = {
  startDay: number;
  endDay: number;
  offsetX: number;
  totalWidth: number;
};

export type GanttModel = {
  range: GanttRange;
  bars: GanttBar[];
  links: GanttDependencyLink[];
  rows: GanttRow[];
  rowWindow: GanttRowWindow;
  dayWindow: GanttDayWindow;
  dayTicks: number[];
  totalWidth: number;
  totalHeight: number;
};

// The three pipeline phases of `task-project-status.field.ts`; the widget
// falls back to gray for an unset or unknown status.
const GANTT_STATUS_COLORS: Record<string, string> = {
  TODO: 'var(--t-color-gray)',
  IN_PROGRESS: 'var(--t-color-blue)',
  DONE: 'var(--t-color-green)',
};

export const getGanttStatusColor = (status: string | null): string =>
  (status === null ? undefined : GANTT_STATUS_COLORS[status]) ??
  'var(--t-color-gray)';

export const parseGanttTimestamp = (value?: string | null): number | null => {
  if (value == null || value === '') {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
};

export const startOfGanttDay = (timestamp: number): number =>
  Math.floor(timestamp / GANTT_DAY_MS) * GANTT_DAY_MS;

export const readGanttParentId = (task: GanttTaskRecord): string | null =>
  readTaskParentId(task);

// A task with no parsable date cannot be placed on the axis; the caller drops
// it from the layout rather than inventing a position. Both dates present →
// the earlier is the start (a dueAt before createdAt is still a valid span).
export const resolveGanttTaskBounds = (
  task: GanttTaskRecord,
): GanttTaskBounds | null => {
  const dueAt = parseGanttTimestamp(task.dueAt);
  const createdAt = parseGanttTimestamp(task.createdAt);

  if (dueAt === null && createdAt === null) {
    return null;
  }

  if (dueAt === null || createdAt === null) {
    const onlyDate = dueAt ?? createdAt;

    return onlyDate === null
      ? null
      : { startMs: onlyDate, endMs: onlyDate, isMilestone: true };
  }

  return {
    startMs: Math.min(createdAt, dueAt),
    endMs: Math.max(createdAt, dueAt),
    isMilestone: false,
  };
};

// The axis always covers every placed task plus a padding day on each side;
// the minimum span keeps a sparse project from rendering a single-column
// chart. With no placed task the window falls back to `nowMs`.
export const collectGanttRange = (
  tasks: GanttTaskRecord[],
  options?: {
    nowMs?: number;
    paddingDays?: number;
    minimumDayCount?: number;
  },
): GanttRange => {
  const paddingDays = options?.paddingDays ?? GANTT_PADDING_DAYS;
  const minimumDayCount = options?.minimumDayCount ?? GANTT_MINIMUM_DAY_COUNT;
  const fallbackMs = options?.nowMs ?? Date.now();
  let minTimestamp = fallbackMs;
  let maxTimestamp = fallbackMs;
  let hasPlacedTask = false;

  for (const task of tasks) {
    const bounds = resolveGanttTaskBounds(task);

    if (bounds === null) {
      continue;
    }

    if (!hasPlacedTask || bounds.startMs < minTimestamp) {
      minTimestamp = bounds.startMs;
    }

    if (!hasPlacedTask || bounds.endMs > maxTimestamp) {
      maxTimestamp = bounds.endMs;
    }

    hasPlacedTask = true;
  }

  const startMs = startOfGanttDay(minTimestamp - paddingDays * GANTT_DAY_MS);
  const paddedEndMs = startOfGanttDay(maxTimestamp) + GANTT_DAY_MS;
  const endMs = Math.max(paddedEndMs, startMs + minimumDayCount * GANTT_DAY_MS);

  return {
    startMs,
    endMs,
    dayCount: Math.round((endMs - startMs) / GANTT_DAY_MS),
  };
};

export const buildGanttBars = (
  tasks: GanttTaskRecord[],
  range: GanttRange,
): GanttBar[] => {
  const bars: GanttBar[] = [];

  for (const task of tasks) {
    const bounds = resolveGanttTaskBounds(task);

    if (bounds === null) {
      continue;
    }

    const clampedStartMs = Math.max(bounds.startMs, range.startMs);
    const clampedEndMs = Math.min(bounds.endMs, range.endMs);
    const startDay = Math.floor(
      (clampedStartMs - range.startMs) / GANTT_DAY_MS,
    );
    const endDay = Math.ceil((clampedEndMs - range.startMs) / GANTT_DAY_MS);

    bars.push({
      taskId: task.id,
      title: task.title?.trim() || task.id,
      status: task.projectStatus ?? null,
      parentTaskId: readGanttParentId(task),
      startMs: bounds.startMs,
      endMs: bounds.endMs,
      startDay,
      daySpan: Math.max(1, endDay - startDay),
      isMilestone: bounds.isMilestone,
    });
  }

  // Deterministic order: the renderer must not reshuffle on every page merge.
  bars.sort(
    (left, right) =>
      left.startMs - right.startMs ||
      left.endMs - right.endMs ||
      left.title.localeCompare(right.title) ||
      left.taskId.localeCompare(right.taskId),
  );

  return bars;
};

// A link is only drawable when both endpoints are placed on the axis.
export const buildGanttDependencyLinks = (
  tasks: GanttTaskRecord[],
  placedTaskIds: Set<string>,
): GanttDependencyLink[] => {
  const links: GanttDependencyLink[] = [];

  for (const task of tasks) {
    const parentId = readGanttParentId(task);

    if (
      parentId === null ||
      !placedTaskIds.has(parentId) ||
      !placedTaskIds.has(task.id)
    ) {
      continue;
    }

    links.push({ fromTaskId: parentId, toTaskId: task.id });
  }

  return links;
};

export const computeGanttRowWindow = (options: {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  rowCount: number;
  overscan?: number;
}): GanttRowWindow => {
  const overscan = options?.overscan ?? GANTT_DEFAULT_OVERSCAN;
  const totalHeight = options.rowCount * options.rowHeight;
  const maxScrollTop = Math.max(0, totalHeight - options.viewportHeight);
  const scrollTop = Math.max(0, Math.min(options.scrollTop, maxScrollTop));
  const firstVisibleIndex = Math.floor(scrollTop / options.rowHeight);
  const visibleRowCount = Math.ceil(options.viewportHeight / options.rowHeight);
  const startIndex = Math.max(0, firstVisibleIndex - overscan);
  const endIndex = Math.min(
    options.rowCount,
    firstVisibleIndex + visibleRowCount + overscan,
  );

  return {
    startIndex,
    endIndex,
    offsetY: startIndex * options.rowHeight,
    totalHeight,
  };
};

export const computeGanttDayWindow = (options: {
  scrollLeft: number;
  viewportWidth: number;
  dayWidth: number;
  dayCount: number;
  overscan?: number;
}): GanttDayWindow => {
  const overscan = options?.overscan ?? GANTT_DEFAULT_OVERSCAN;
  const totalWidth = options.dayCount * options.dayWidth;
  const maxScrollLeft = Math.max(0, totalWidth - options.viewportWidth);
  const scrollLeft = Math.max(0, Math.min(options.scrollLeft, maxScrollLeft));
  const firstVisibleDay = Math.floor(scrollLeft / options.dayWidth);
  const visibleDayCount = Math.ceil(options.viewportWidth / options.dayWidth);
  const startDay = Math.max(0, firstVisibleDay - overscan);
  const endDay = Math.min(
    options.dayCount,
    firstVisibleDay + visibleDayCount + overscan,
  );

  return {
    startDay,
    endDay,
    offsetX: startDay * options.dayWidth,
    totalWidth,
  };
};

export const buildGanttModel = (
  tasks: GanttTaskRecord[],
  options: {
    viewportHeight: number;
    viewportWidth: number;
    scrollTop: number;
    scrollLeft: number;
    rowHeight?: number;
    dayWidth?: number;
    overscan?: number;
    nowMs?: number;
  },
): GanttModel => {
  const rowHeight = options.rowHeight ?? GANTT_DEFAULT_ROW_HEIGHT;
  const dayWidth = options.dayWidth ?? GANTT_DEFAULT_DAY_WIDTH;
  const overscan = options.overscan ?? GANTT_DEFAULT_OVERSCAN;
  const range = collectGanttRange(tasks, { nowMs: options.nowMs });
  const bars = buildGanttBars(tasks, range);
  const placedTaskIds = new Set(bars.map((bar) => bar.taskId));
  const links = buildGanttDependencyLinks(tasks, placedTaskIds);
  const rowWindow = computeGanttRowWindow({
    scrollTop: options.scrollTop,
    viewportHeight: options.viewportHeight,
    rowHeight,
    rowCount: bars.length,
    overscan,
  });
  const rows = bars
    .slice(rowWindow.startIndex, rowWindow.endIndex)
    .map((bar, index) => ({ ...bar, rowIndex: rowWindow.startIndex + index }));
  const dayWindow = computeGanttDayWindow({
    scrollLeft: options.scrollLeft,
    viewportWidth: options.viewportWidth,
    dayWidth,
    dayCount: range.dayCount,
    overscan,
  });
  const dayTicks: number[] = [];

  for (let day = dayWindow.startDay; day < dayWindow.endDay; day += 1) {
    dayTicks.push(day);
  }

  return {
    range,
    bars,
    links,
    rows,
    rowWindow,
    dayWindow,
    dayTicks,
    totalWidth: dayWindow.totalWidth,
    totalHeight: rowWindow.totalHeight,
  };
};
