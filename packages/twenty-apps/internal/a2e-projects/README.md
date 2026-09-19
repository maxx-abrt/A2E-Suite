# A2E Projects — projects, tasks, milestones and time

A2E Projects turns Twenty's native task engine into a project workspace:
projects with health and budget, milestones, a Kanban board, a calendar, a
Gantt view, time tracking, labels and human-readable task IDs. It is one of
the parts that compose the intended **Bureau** work experience. See the
[feature guide](../../../../docs/features.md) for how Projects sits next to
Documents, Bilan, Drive and Discussions.

## Status and installation

**Status: source present, not release-certified.** The metadata, views and
front components described below exist in this package; installation and every
journey are not proven by their presence.

To register, publish and install it on a disposable workspace, follow the
[applications runbook](../../../../docs/applications.md). The app pins an
older SDK than the workspace; check compatibility before promising an
installation. Projects is not listed in the current workspace presets.

## Where users find it

- Sidebar entry **Projects** opens the `allProjects` view.
- Sidebar folder **Mes tâches** groups **Assignées à moi**, **Créées par moi**
  and **En retard**.
- Command menu (Cmd+K): **Créer un projet**, **Créer une tâche**,
  **Aller aux projets**, **Sous-tâches**, **Chronomètre**.
- The project record page has tabs **Accueil**, **Timeline** (tasks,
  milestones, labels, notes, Gantt), **Tâches**, **Tableau**, **Fichiers**,
  **Documents** and **Discussions**
  ([project.page-layout.ts](./src/page-layouts/project.page-layout.ts)).

## What it does

### Projects

The `project` object ([project.object.ts](./src/objects/project.object.ts))
carries `name`, a task-ID prefix `key`, a task `taskCounter`, `status`
(`PLANNING` / `ACTIVE` / `ON_HOLD` / `COMPLETED`), `health` (`ON_TRACK` /
`AT_RISK` / `OFF_TRACK`), `startsAt` / `dueAt`, `color`, rich-text
`description`, `budget` / `spent`, and `archivedAt`. It relates to a lead
(workspace member), a company and — when A2E Documents is installed — its
documents.

### Tasks on the native engine

Tasks are the standard task object; this app pins extra fields on it (project,
`projectStatus`, `priority`, `estimate` / `estimateLabel`, blocker note,
milestone, parent/subtasks, labels, `humanId`, retroplanning provenance, time
entries). `task-human-id` allocates IDs of the form `KEY-n` with a
compare-and-swap counter. Views include a Kanban board on `projectStatus`, a
monthly calendar on `dueAt`, project-scoped task lists, and the three
**Mes tâches** variants.

### Milestones, labels, members, time

- `milestone` — dated checkpoints with `doneAt`, linked to a project.
- `label` + `taskLabel` — coloured labels, many-to-many with tasks.
- `projectMember` — project membership with a `MEMBER` / `LEAD` / `GUEST` role.
- `timeEntry` — minutes spent, linked to a task and/or project and a member.
  The time-tracker front component starts/stops a timer (localStorage state,
  minimum one minute) and writes entries.

### Automation and views

- `post-install` seeds two idempotent starter projects with tasks and
  milestones: **Livraison de projet** (`LIV`) and **Rétroplanning
  d'événement** (`EVT`) ([starter-projects.ts](./src/lib/starter-projects.ts)).
- `recurring-task-generator` is a workflow recipe (native CRON trigger +
  logic-function step) shipped as app source; a builder materializes it in the
  workflow engine.
- `retroplanning` previews and applies a dated task plan for a project from a
  recipe, with idempotent provenance and explicit confirmation for destructive
  replace.
- A daily cron purges archived projects, milestones, time entries and labels
  after the 7-day trash retention.
- `extract-tasks-from-document` is an AI tool that reads a document by id
  under the caller's authorization and deterministically proposes candidate
  tasks from its to-do blocks plus a conservative heading/imperative
  heuristic. It is read-only: no task is created — the proposals are a draft
  to review, and creation is a separate confirmed action.
- Front components provide the project overview, time rollup, Gantt
  (virtualized bars with dependency arrows) and the subtask forest.

## Development

From this directory, after installing a compatible Node/SDK:

```sh
yarn typecheck
yarn lint
yarn test:unit
yarn twenty dev:build .
```

The unit tests cover view definitions, command wiring and the pure lib
engines; they do not prove an installed workspace or a browser journey. Record
real results with the [verification guide](../../../../docs/verification.md).
