// Retroplanning engine (P4.2).
//
// A *recipe* is a reusable project plan: a set of tasks with durations, an
// intra-recipe dependency graph (`dependsOn`), optional subtask nesting
// (`parentKey`) and optional assignee roles. The engine schedules the recipe
// backwards from a single project deadline in a named timezone, previews every
// task/subtask date plus overlap and past-date warnings, and mints a stable
// provenance key per task so generation is idempotent and replanning can tell
// its own tasks from human edits.
//
// Everything here is pure and clock/timezone injectable: the planner never
// reads the system clock, so `node:test` pins the calendar math and the app
// manifest builder never touches a live client. Persistence (Core API calls)
// lives in `logic-functions/handlers/apply-retroplanning-handler.ts`; this
// module is the C1 payload-construction half of the template contract — fresh
// content identities are minted here, the caller owns the write.

export type RetroplanningProjectStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type RetroplanningRecipeTask = {
  key: string;
  title: string;
  // Whole calendar days the task spans, inclusive of its start day.
  durationDays: number;
  // Earlier recipe tasks that must finish before this one starts.
  dependsOn?: string[];
  // Parent recipe task key; the generated record becomes a subtask.
  parentKey?: string;
  // Logical owner slot ("lead", "team", …); the caller maps it to a member id.
  assigneeRole?: string;
  projectStatus?: RetroplanningProjectStatus;
};

export type RetroplanningRecipe = {
  key: string;
  version: number;
  label: string;
  description: string;
  tasks: RetroplanningRecipeTask[];
};

export const DEFAULT_RETROPLANNING_TIME = '18:00';

// Two ready recipes mirror the starter projects (starter-projects.ts): the
// delivery cadence and the event countdown. They are planning recipes — they
// carry durations/dependencies/subtasks the flat starter task list does not.
export const RETROPLANNING_RECIPES: RetroplanningRecipe[] = [
  {
    key: 'delivery',
    version: 1,
    label: 'Livraison de projet',
    description:
      'Cadence standard : cadrage, construction, recette, mise en production.',
    tasks: [
      {
        key: 'scope',
        title: 'Cadrer le périmètre',
        durationDays: 3,
        assigneeRole: 'lead',
        projectStatus: 'DONE',
      },
      {
        key: 'brief',
        title: 'Rédiger le brief projet',
        durationDays: 2,
        dependsOn: ['scope'],
        assigneeRole: 'lead',
      },
      {
        key: 'build-api',
        title: 'Développer l’API',
        durationDays: 3,
        dependsOn: ['brief'],
        parentKey: 'build',
        assigneeRole: 'team',
      },
      {
        key: 'build-ui',
        title: 'Développer l’interface',
        durationDays: 4,
        dependsOn: ['build-api'],
        parentKey: 'build',
        assigneeRole: 'team',
      },
      {
        key: 'build',
        title: 'Construire les livrables',
        durationDays: 9,
        dependsOn: ['build-ui'],
        assigneeRole: 'team',
      },
      {
        key: 'review',
        title: 'Recette interne',
        durationDays: 3,
        dependsOn: ['build'],
        assigneeRole: 'quality',
      },
      {
        key: 'release',
        title: 'Mise en production',
        durationDays: 1,
        dependsOn: ['review'],
        assigneeRole: 'lead',
      },
    ],
  },
  {
    key: 'event',
    version: 1,
    label: 'Rétroplanning d’événement',
    description:
      'Compte à rebours d’un événement : logistique, communication et coordination jour J.',
    tasks: [
      {
        key: 'venue',
        title: 'Réserver le lieu',
        durationDays: 5,
        assigneeRole: 'logistics',
      },
      {
        key: 'invites',
        title: 'Envoyer les invitations',
        durationDays: 3,
        dependsOn: ['venue'],
        assigneeRole: 'communication',
      },
      {
        key: 'slides',
        title: 'Préparer les supports',
        durationDays: 4,
        dependsOn: ['invites'],
        assigneeRole: 'team',
      },
      {
        key: 'speakers',
        title: 'Coordonner les intervenants',
        durationDays: 2,
        dependsOn: ['invites'],
        assigneeRole: 'communication',
      },
      {
        key: 'briefing',
        title: 'Brief de l’équipe le jour J',
        durationDays: 1,
        dependsOn: ['slides', 'speakers'],
        assigneeRole: 'lead',
      },
    ],
  },
];

export const findRetroplanningRecipe = (
  recipeKey: string,
): RetroplanningRecipe | undefined =>
  RETROPLANNING_RECIPES.find((recipe) => recipe.key === recipeKey);

export type RetroplanningDeadline = {
  // Local calendar date `YYYY-MM-DD` in `timezone`.
  date: string;
  // Local wall-clock time the deadline lands on; defaults to 18:00.
  time?: string;
  // IANA timezone name (e.g. `Europe/Paris`).
  timezone: string;
};

export type RetroplanningPlannedTask = {
  key: string;
  title: string;
  durationDays: number;
  dependsOn: string[];
  projectStatus: RetroplanningProjectStatus;
  startAt: string;
  dueAt: string;
  provenance: string;
  assigneeRole?: string;
  parentKey?: string;
};

export type RetroplanningWarningCode = 'PAST_DATE' | 'ASSIGNEE_OVERLAP';

export type RetroplanningWarning = {
  code: RetroplanningWarningCode;
  message: string;
  taskKeys: string[];
};

export type RetroplanningPreview = {
  recipeKey: string;
  recipeVersion: number;
  projectDeadlineAt: string;
  timezone: string;
  tasks: RetroplanningPlannedTask[];
  warnings: RetroplanningWarning[];
};

export type RetroplanningReconcileMode = 'APPEND' | 'REPLACE';

export type RetroplanningExistingTask = {
  id: string;
  title: string;
  dueAt: string | null;
  projectStatus: string | null;
  provenance: string | null;
};

export type RetroplanningTaskUpdate = {
  id: string;
  key: string;
  provenance: string;
  dueAt?: string;
  title?: string;
};

export type RetroplanningProtectedTask = {
  id: string;
  key: string;
  reason: 'MANUALLY_EDITED' | 'COMPLETED';
};

export type RetroplanningChangeSet = {
  create: RetroplanningPlannedTask[];
  update: RetroplanningTaskUpdate[];
  remove: string[];
  protected: RetroplanningProtectedTask[];
  requiresDestructiveConfirmation: boolean;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const parseDeadlineDate = (
  date: string,
): { year: number; month: number; day: number } => {
  const match = DATE_PATTERN.exec(date);

  if (match === null) {
    throw new Error(
      `Date d’échéance invalide : « ${date} » (attendu AAAA-MM-JJ).`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`Date d’échéance inexistante : « ${date} ».`);
  }

  return { year, month, day };
};

const parseDeadlineTime = (time: string): { hour: number; minute: number } => {
  const match = TIME_PATTERN.exec(time);

  if (match === null) {
    throw new Error(`Heure d’échéance invalide : « ${time} » (attendu HH:MM).`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) {
    throw new Error(`Heure d’échéance invalide : « ${time} ».`);
  }

  return { hour, minute };
};

const resolveDeadlineWallClock = (
  deadline: RetroplanningDeadline,
): WallClock => {
  const date = parseDeadlineDate(deadline.date);
  const time = parseDeadlineTime(deadline.time ?? DEFAULT_RETROPLANNING_TIME);

  return { ...date, ...time };
};

// The timezone's offset east of UTC at a given instant. Derived from the
// platform's IANA database via Intl, so a named zone (not a fixed offset)
// decides DST for the plan. Seconds are pinned so the offset has no sub-second
// residue from the millisecond input.
const computeTimezoneOffsetMilliseconds = (
  timestamp: number,
  timezone: string,
): number => {
  const secondsTimestamp = Math.floor(timestamp / 1000) * 1000;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(new Date(secondsTimestamp));
  const readPart = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  const asIfUtc = Date.UTC(
    readPart('year'),
    readPart('month') - 1,
    readPart('day'),
    readPart('hour'),
    readPart('minute'),
    readPart('second'),
  );

  return asIfUtc - secondsTimestamp;
};

// A wall-clock in a named zone resolves to one instant. The offset is looked
// up twice because the offset at the naive guess can differ from the offset at
// the resolved instant across a DST boundary.
const wallClockToInstant = (wallClock: WallClock, timezone: string): number => {
  const asIfUtc = Date.UTC(
    wallClock.year,
    wallClock.month - 1,
    wallClock.day,
    wallClock.hour,
    wallClock.minute,
  );
  const firstGuess =
    asIfUtc - computeTimezoneOffsetMilliseconds(asIfUtc, timezone);
  const refined =
    asIfUtc - computeTimezoneOffsetMilliseconds(firstGuess, timezone);

  return refined;
};

// Calendar-day ordinal, so day arithmetic never drifts across DST: the wall
// fields are treated as UTC purely to count days.
const wallClockDayOrdinal = (wallClock: WallClock): number =>
  Math.round(
    Date.UTC(wallClock.year, wallClock.month - 1, wallClock.day) /
      MILLISECONDS_PER_DAY,
  );

const toIsoInstant = (wallClock: WallClock, timezone: string): string =>
  new Date(wallClockToInstant(wallClock, timezone)).toISOString();

export const computeRetroplanningProvenance = (
  recipe: RetroplanningRecipe,
  taskKey: string,
): string => `${recipe.key}@v${recipe.version}:${taskKey}`;

// The persisted value carries the generated due date so a later replan can
// distinguish "still ours" from "a human moved it".
export const buildRetroplanningProvenanceValue = (
  provenance: string,
  generatedDueAt: string,
): string => `${provenance}#${generatedDueAt}`;

export const parseRetroplanningProvenanceValue = (
  value: string,
): { provenance: string; generatedDueAt: string } | undefined => {
  const separatorIndex = value.lastIndexOf('#');

  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return undefined;
  }

  const provenance = value.slice(0, separatorIndex);
  const generatedDueAt = value.slice(separatorIndex + 1);

  if (Number.isNaN(new Date(generatedDueAt).getTime())) {
    return undefined;
  }

  return { provenance, generatedDueAt };
};

export const readRetroplanningTaskKey = (
  provenance: string,
): string | undefined => {
  const separatorIndex = provenance.lastIndexOf(':');

  if (separatorIndex <= 0 || separatorIndex === provenance.length - 1) {
    return undefined;
  }

  return provenance.slice(separatorIndex + 1);
};

const normalizeDependencies = (task: RetroplanningRecipeTask): string[] => [
  ...new Set(task.dependsOn ?? []),
];

// Kahn topological sort over the dependency graph, dependencies first. A node
// left with unresolved in-edges is part of a cycle and cannot be scheduled.
const sortRecipeTasksTopologically = (
  tasks: RetroplanningRecipeTask[],
): RetroplanningRecipeTask[] => {
  const taskByKey = new Map<string, RetroplanningRecipeTask>(
    tasks.map((task): [string, RetroplanningRecipeTask] => [task.key, task]),
  );
  const remainingDependencies = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const task of tasks) {
    remainingDependencies.set(task.key, task.dependsOn?.length ?? 0);
  }

  for (const task of tasks) {
    for (const dependency of task.dependsOn ?? []) {
      const list = dependents.get(dependency) ?? [];

      list.push(task.key);
      dependents.set(dependency, list);
    }
  }

  const queue = tasks
    .filter((task) => (task.dependsOn?.length ?? 0) === 0)
    .map((task) => task.key);
  const sorted: RetroplanningRecipeTask[] = [];

  while (queue.length > 0) {
    const key = queue.shift() as string;
    const task = taskByKey.get(key) as RetroplanningRecipeTask;

    sorted.push(task);

    for (const dependentKey of dependents.get(key) ?? []) {
      const remaining = (remainingDependencies.get(dependentKey) ?? 0) - 1;

      remainingDependencies.set(dependentKey, remaining);

      if (remaining === 0) {
        queue.push(dependentKey);
      }
    }
  }

  if (sorted.length !== tasks.length) {
    const cyclicKeys = tasks
      .filter((task) => !sorted.includes(task))
      .map((task) => task.key);

    throw new Error(
      `Recette invalide : dépendances cycliques entre ${cyclicKeys.join(', ')}.`,
    );
  }

  return sorted;
};

const validateRecipe = (recipe: RetroplanningRecipe): void => {
  const keys = new Set<string>();

  for (const task of recipe.tasks) {
    if (task.key.trim() === '') {
      throw new Error('Recette invalide : une tâche sans clé.');
    }

    if (keys.has(task.key)) {
      throw new Error(
        `Recette invalide : clé de tâche dupliquée « ${task.key} ».`,
      );
    }

    keys.add(task.key);
  }

  for (const task of recipe.tasks) {
    if (!Number.isInteger(task.durationDays) || task.durationDays < 1) {
      throw new Error(
        `Recette invalide : durée non entière ou nulle pour « ${task.key} ».`,
      );
    }

    for (const dependency of task.dependsOn ?? []) {
      if (dependency === task.key) {
        throw new Error(
          `Recette invalide : « ${task.key} » dépend d’elle-même.`,
        );
      }

      if (!keys.has(dependency)) {
        throw new Error(
          `Recette invalide : « ${task.key} » dépend de « ${dependency} » qui n’existe pas.`,
        );
      }
    }

    if (task.parentKey !== undefined && !keys.has(task.parentKey)) {
      throw new Error(
        `Recette invalide : la tâche parente « ${task.parentKey} » de « ${task.key} » n’existe pas.`,
      );
    }
  }

  const normalized = recipe.tasks.map((task) => ({
    ...task,
    dependsOn: normalizeDependencies(task),
  }));

  sortRecipeTasksTopologically(normalized);
};

// Backward schedule: a terminal task is due on the deadline; every other task
// must end the day before its earliest successor starts. `start = due -
// (duration - 1)` so a one-day task starts and ends the same day.
export const buildRetroplanningPreview = (
  recipe: RetroplanningRecipe,
  deadline: RetroplanningDeadline,
  now: Date,
): RetroplanningPreview => {
  validateRecipe(recipe);

  const deadlineWallClock = resolveDeadlineWallClock(deadline);
  const timezone = deadline.timezone;
  const orderedTasks = sortRecipeTasksTopologically(
    recipe.tasks.map((task) => ({
      ...task,
      dependsOn: normalizeDependencies(task),
    })),
  );
  const successorsByKey = new Map<string, string[]>();

  for (const task of orderedTasks) {
    for (const dependency of task.dependsOn ?? []) {
      const list = successorsByKey.get(dependency) ?? [];

      list.push(task.key);
      successorsByKey.set(dependency, list);
    }
  }

  const dueOrdinalByKey = new Map<string, number>();
  const startOrdinalByKey = new Map<string, number>();

  // Reverse topological order ⇒ a task's successors are scheduled first.
  for (const task of [...orderedTasks].reverse()) {
    const successorKeys = successorsByKey.get(task.key) ?? [];
    const dueOrdinal =
      successorKeys.length === 0
        ? wallClockDayOrdinal(deadlineWallClock)
        : Math.min(
            ...successorKeys.map(
              (successorKey) =>
                (startOrdinalByKey.get(successorKey) as number) - 1,
            ),
          );

    dueOrdinalByKey.set(task.key, dueOrdinal);
    startOrdinalByKey.set(task.key, dueOrdinal - (task.durationDays - 1));
  }

  const provenanceByKey = new Map<string, string>(
    orderedTasks.map((task): [string, string] => [
      task.key,
      computeRetroplanningProvenance(recipe, task.key),
    ]),
  );
  const ordinalToWallClock = (ordinal: number): WallClock => {
    const date = new Date(ordinal * MILLISECONDS_PER_DAY);

    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: deadlineWallClock.hour,
      minute: deadlineWallClock.minute,
    };
  };

  const plannedTasks: RetroplanningPlannedTask[] = orderedTasks.map((task) => {
    const provenance = provenanceByKey.get(task.key) as string;

    return {
      key: task.key,
      title: task.title,
      durationDays: task.durationDays,
      dependsOn: task.dependsOn ?? [],
      projectStatus: task.projectStatus ?? 'TODO',
      startAt: toIsoInstant(
        ordinalToWallClock(startOrdinalByKey.get(task.key) as number),
        timezone,
      ),
      dueAt: toIsoInstant(
        ordinalToWallClock(dueOrdinalByKey.get(task.key) as number),
        timezone,
      ),
      provenance,
      ...(task.assigneeRole === undefined
        ? {}
        : { assigneeRole: task.assigneeRole }),
      ...(task.parentKey === undefined ? {} : { parentKey: task.parentKey }),
    };
  });

  const warnings = buildRetroplanningWarnings(
    plannedTasks,
    startOrdinalByKey,
    dueOrdinalByKey,
    now,
  );

  return {
    recipeKey: recipe.key,
    recipeVersion: recipe.version,
    projectDeadlineAt: toIsoInstant(deadlineWallClock, timezone),
    timezone,
    tasks: plannedTasks,
    warnings,
  };
};

const buildRetroplanningWarnings = (
  plannedTasks: RetroplanningPlannedTask[],
  startOrdinalByKey: Map<string, number>,
  dueOrdinalByKey: Map<string, number>,
  now: Date,
): RetroplanningWarning[] => {
  const warnings: RetroplanningWarning[] = [];
  const nowMilliseconds = now.getTime();

  for (const task of plannedTasks) {
    // A task anchored before `now` cannot be delivered as planned — surface it
    // rather than silently generating a task already in the past.
    if (new Date(task.startAt).getTime() < nowMilliseconds) {
      warnings.push({
        code: 'PAST_DATE',
        message: `« ${task.title} » commence dans le passé : l’échéance est trop proche.`,
        taskKeys: [task.key],
      });
    }
  }

  const tasksByRole = new Map<string, RetroplanningPlannedTask[]>();

  for (const task of plannedTasks) {
    if (task.assigneeRole === undefined || task.assigneeRole.trim() === '') {
      continue;
    }

    const list = tasksByRole.get(task.assigneeRole) ?? [];

    list.push(task);
    tasksByRole.set(task.assigneeRole, list);
  }

  for (const [assigneeRole, roleTasks] of tasksByRole) {
    for (let firstIndex = 0; firstIndex < roleTasks.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < roleTasks.length;
        secondIndex += 1
      ) {
        const first = roleTasks[firstIndex] as RetroplanningPlannedTask;
        const second = roleTasks[secondIndex] as RetroplanningPlannedTask;
        const firstStart = startOrdinalByKey.get(first.key) as number;
        const firstDue = dueOrdinalByKey.get(first.key) as number;
        const secondStart = startOrdinalByKey.get(second.key) as number;
        const secondDue = dueOrdinalByKey.get(second.key) as number;

        if (firstStart <= secondDue && secondStart <= firstDue) {
          warnings.push({
            code: 'ASSIGNEE_OVERLAP',
            message: `« ${first.title} » et « ${second.title} » se chevauchent pour le rôle « ${assigneeRole} ».`,
            taskKeys: [first.key, second.key],
          });
        }
      }
    }
  }

  return warnings;
};

const isFromRecipe = (provenance: string, recipeIdentity: string): boolean =>
  provenance.startsWith(`${recipeIdentity}:`);

// Replanning: match planned tasks to their own existing rows by provenance.
// Only rows this recipe generated are ever touched (`isFromRecipe`); a row
// whose stored generated date no longer matches its current date was edited by
// a human, and a DONE row is finished work — both are protected. `REPLACE`
// additionally candidates stale recipe slots for removal, gated behind an
// explicit destructive confirmation (E06): without it the removals stay in the
// draft and the change set flags them.
export const reconcileRetroplanningDraft = (
  recipe: RetroplanningRecipe,
  plannedTasks: RetroplanningPlannedTask[],
  existingTasks: RetroplanningExistingTask[],
  options: {
    mode: RetroplanningReconcileMode;
    confirmedDestructiveChange: boolean;
  },
): RetroplanningChangeSet => {
  const recipeIdentity = `${recipe.key}@v${recipe.version}`;
  const existingByProvenance = new Map<string, RetroplanningExistingTask>();

  for (const task of existingTasks) {
    if (task.provenance === null || task.provenance === undefined) {
      continue;
    }

    const parsed = parseRetroplanningProvenanceValue(task.provenance);

    if (
      parsed === undefined ||
      !isFromRecipe(parsed.provenance, recipeIdentity)
    ) {
      continue;
    }

    if (!existingByProvenance.has(parsed.provenance)) {
      existingByProvenance.set(parsed.provenance, task);
    }
  }

  const plannedProvenances = new Set(
    plannedTasks.map((task) => task.provenance),
  );
  const changeSet: RetroplanningChangeSet = {
    create: [],
    update: [],
    remove: [],
    protected: [],
    requiresDestructiveConfirmation: false,
  };

  for (const planned of plannedTasks) {
    const existing = existingByProvenance.get(planned.provenance);

    if (existing === undefined) {
      changeSet.create.push(planned);
      continue;
    }

    const parsed = parseRetroplanningProvenanceValue(
      existing.provenance as string,
    );
    const generatedDueAt = parsed?.generatedDueAt;

    if (existing.projectStatus === 'DONE') {
      changeSet.protected.push({
        id: existing.id,
        key: planned.key,
        reason: 'COMPLETED',
      });
      continue;
    }

    if (generatedDueAt === undefined || existing.dueAt !== generatedDueAt) {
      changeSet.protected.push({
        id: existing.id,
        key: planned.key,
        reason: 'MANUALLY_EDITED',
      });
      continue;
    }

    const update: RetroplanningTaskUpdate = {
      id: existing.id,
      key: planned.key,
      provenance: buildRetroplanningProvenanceValue(
        planned.provenance,
        planned.dueAt,
      ),
    };

    if (existing.dueAt !== planned.dueAt) {
      update.dueAt = planned.dueAt;
    }

    if (existing.title !== planned.title) {
      update.title = planned.title;
    }

    if (update.dueAt !== undefined || update.title !== undefined) {
      changeSet.update.push(update);
    }
  }

  const staleTasks: string[] = [];

  for (const [provenance, existing] of existingByProvenance) {
    if (plannedProvenances.has(provenance)) {
      continue;
    }

    const key = readRetroplanningTaskKey(provenance) ?? provenance;
    const parsed = parseRetroplanningProvenanceValue(
      existing.provenance as string,
    );

    if (existing.projectStatus === 'DONE') {
      changeSet.protected.push({ id: existing.id, key, reason: 'COMPLETED' });
      continue;
    }

    if (parsed === undefined || existing.dueAt !== parsed.generatedDueAt) {
      changeSet.protected.push({
        id: existing.id,
        key,
        reason: 'MANUALLY_EDITED',
      });
      continue;
    }

    staleTasks.push(existing.id);
  }

  if (options.mode === 'REPLACE' && staleTasks.length > 0) {
    if (options.confirmedDestructiveChange) {
      changeSet.remove = staleTasks;
    } else {
      changeSet.requiresDestructiveConfirmation = true;
    }
  }

  return changeSet;
};

// Subtasks need their parent's created id, so parents are written first.
export const orderRetroplanningTasksByParentDepth = <
  TTask extends { key: string; parentKey?: string },
>(
  tasks: TTask[],
): TTask[] => {
  const taskByKey = new Map<string, TTask>(
    tasks.map((task): [string, TTask] => [task.key, task]),
  );
  const depthOf = (task: TTask): number => {
    let depth = 0;
    let current = task;
    const visited = new Set<string>();

    while (current.parentKey !== undefined) {
      if (visited.has(current.key)) {
        return depth;
      }

      visited.add(current.key);

      const parent = taskByKey.get(current.parentKey);

      if (parent === undefined) {
        return depth;
      }

      depth += 1;
      current = parent;
    }

    return depth;
  };

  return [...tasks].sort((first, second) => depthOf(first) - depthOf(second));
};
