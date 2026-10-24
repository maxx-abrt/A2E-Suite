# A2E product audit and differentiation — 2026-10-24

[Documentation home](README.md) · [Root delivery plan](../PLAN.md) ·
[Product contract](product-experience.md)

## Product judgment

The strongest opportunity is a calm operating workspace for small teams that
connects **knowledge → decisions → commitments → delivery → money**. Start with
one audience and prove that whole journey. Associations and small service teams
are promising candidates because Bureau, CRM and Bilan already supply pieces of
their work. This is a product hypothesis, not evidence of customer demand.

Trying to exceed every competitor's feature count would make navigation,
configuration and maintenance worse. A project manager should be able to answer
“What needs my attention, why, who owns it, and what happens next?” without
reconstructing context across documents, tasks, calendars and spreadsheets.

The advantages worth earning are low setup effort, reliable daily actions,
domain-specific workflows, traceable context and control of deployment/data/AI.
“All in one” and “AI included” alone are weak differentiation.

## Current competitive baseline

Primary vendor documentation was consulted on the audit date. This is a
capability comparison, not a hands-on speed benchmark or pricing comparison.

| Product | Existing baseline to respect | Implication for A2E |
| --- | --- | --- |
| Notion | Flexible pages/databases, connected enterprise search with citations; downloaded pages can work offline in desktop/mobile apps | Pages plus an assistant are insufficient. Portability, source-linked actions and trustworthy work execution matter. See [enterprise search](https://www.notion.com/help/enterprise-search) and [offline pages](https://www.notion.com/en-gb/help/use-pages-offline). |
| ClickUp | Tasks, relationships, docs, chat, automation, time tracking, planner and reporting; AI can extract action items from documents | Connected docs/tasks and AI extraction are already competitive basics. Differentiate through a simpler complete workflow and a specific audience. See [features](https://clickup.com/features) and [documentation AI](https://help.clickup.com/hc/en-us/articles/40676496321303-Use-AI-for-documentation). |
| Asana | Tasks/projects, multiple views, My Tasks, Inbox, custom fields, time tracking and status updates | Personal prioritization and clear ownership are essential. A task table alone does not establish delivery confidence. See [features](https://asana.com/features). |
| monday.com | Configurable boards, templates, forms, dashboards, contextual discussions, AI workflows and enterprise resource/portfolio management | Do not build a second configurable board engine. Finish useful native recipes and explain their results. See [work management guide](https://support.monday.com/hc/en-us/articles/115005305649-Get-started-with-monday-work-management). |
| Google Docs | Collaborative editing, comments and assigned actions, smart chips, granular sharing and restorable versions | Editing trust and collaborative review are baseline expectations. Do not advertise presence as equivalent to conflict-safe co-editing. See [Docs](https://workspace.google.com/products/docs/). |

## What the code actually gives us

These are source observations unless a check is recorded in the phase report.
Historical plan checkmarks are not deployment certification.

| Area | Existing foundation | Remaining product or acceptance gap |
| --- | --- | --- |
| Workspace | Twenty metadata, native views/layouts, permissions, commands, workflows and installed apps | One clear default experience across fresh install, upgrades and partial failures; complete persona content without flooding a workspace with examples |
| Bureau pages | Full-page editor, tree, favorites, search, import, templates and trash | Contextual actions must work from the full-page route; durable comments/history, simultaneous edits and real imports still need their documented acceptance matrix |
| Tasks/projects | Native task object, app project relation/status/priority/subtasks/dependencies, time entries, Gantt and retroplanning | Consistent creation across indexes, embedded lists and global commands; useful personal prioritization; complete negative-permission and large-workspace proof |
| Connected records | Optional `a2e-links` junction, native picker and Related app surface | Default Bureau setup does not install Links. Its declared endpoint set is currently document/task, not every entity. Complete bundle/lifecycle decisions before promising universal linking |
| Daily work | Bureau task sheet/progress, Home tasks/events, recent pages and pending Bilan widgets | Avoid two competing home experiences; converge toward one explainable attention queue rather than more independent dashboards |
| Automation/AI | Workflow recipes, read-only document task proposals, standup context, tool registry and BYOK groundwork | Reliable preview → authorize → execute → report → recover, with source citations and measurable token/operation budgets. No-key workflows must remain useful |
| Bilan | Invoices, books, budgets, funding/catalogue and project-related foundations | Transactional/replay/period-lock acceptance and domain review precede claims about dependable finance or compliance |
| Search | Installed-app federation with caller/workspace context | Bounded provider latency and result sizes; benchmark end-to-end search and report degradation rather than assuming all matches were searched |

Source entry points: [Bureau](../packages/twenty-front/src/modules/bureau/),
[Projects](../packages/twenty-apps/internal/a2e-projects/README.md),
[linking](../packages/twenty-front/src/modules/a2e-links/),
[quick create](../packages/twenty-front/src/modules/quick-create/),
[app search](../packages/twenty-server/src/engine/core-modules/search/services/app-search.service.ts),
[Bilan acceptance](bilan-experience.md).

The local reference's [task view](<../Inspiration apps (bureaubilan)/Texxel-main/apps/web/components/app/tasks-view.tsx>)
supports title-first input, quick subtask creation and contextual editing. Its
useful interaction ideas can be translated into the existing Twenty primitives.
Its backend, schemas and dependencies are not a compatible implementation to
copy. The [reference analysis](plan/02-reference-analysis.md) also identifies
retroplanning, funding dossiers and evidence collection as relevant workflows.

## Highest-value opportunities, in order

| Priority | Opportunity and concrete experience | Why it matters | Root-plan home |
| --- | --- | --- | --- |
| 1 | Reliable work loop: capture, tick/reopen, assign, schedule, find, recover; stable pinned titles and consistent keyboard behavior | Users repeat these actions daily. Failed saves, blank records and unexpected panels erase trust faster than new features add it | P4, M13, P10 |
| 2 | One complete sector pack: a small agency's client brief → quote → project → tasks/time → invoice, or an association's funding deadline → project → budget → proofs → report | A working outcome saves more setup and administration than another generic view. Validate one pack before building many | C1/C2/C5/C6, P1.6, P7, M9 |
| 3 | Commitment radar: overdue or blocked work, missing owners, approaching milestones and unpaid invoices, each with its source and one useful action | Turns stored information into decisions. Start with deterministic rules and existing permissions; add optional summaries later | M11b/M11e, P8, P9.3 |
| 4 | Context continuity: create/link a task while reading its source page; preserve the source and project; navigate back from the result | Reduces copying and forgotten context. A link is valuable only when users can follow it in both directions | M8d, M11a/M11c |
| 5 | Delivery confidence: milestones, dependency risks, capacity and budget/time evidence in one project review | Moves beyond checking boxes toward predicting and explaining outcomes. Start with existing task/project data before new forecasting systems | P4.2, P7.1c, M11 |
| 6 | Trusted knowledge: visible save/conflict state, durable comments/revisions, permission-safe sharing, usable import/export and recovery | Makes users willing to put important work into the product. Requires multi-session/storage acceptance, not only UI polish | P0, P3, M8 |
| 7 | Transparent assistance: evidence-linked suggestions, editable previews, reviewed writes, run history and cost visibility | AI becomes an accountable accelerator rather than an unpredictable second interface | M10, P9 |
| 8 | Mobile/offline capture: explicit local draft state, workspace-scoped replay and conflict recovery | Valuable for field work and associations; it is a storage/synchronization project, not a localStorage patch | P10, C4/C5 |

Choose the initial sector through observed interviews and paid/pilot use. A
useful first test is whether a team completes a real project cycle and returns
without help configuring it. Student/personal presets can stay supported;
they should not force simultaneous investment in unrelated domain workflows.

## Changes implemented from this audit

The phase report records the actual checks and limits for these increments.

- Native task title cells, including hover/focus overlays, render the same
  completion control. The tick remains inside the pinned title column;
  pointer events do not open record details or start table drag selection.
- Global task/project commands collect a title before writing, reuse the
  shared quick-entry form, keep failed input and avoid forced record details.
  Existing page-template and other object creation paths are retained.
- Global creation filters unavailable/read-only objects before generating the
  selectable command list. Bureau full-page documents can supply source
  context to the existing optional pre-link path.
- Bureau page headers expose the existing install-gated native Link picker.
  Pickers are isolated per source record and hidden for a read-only junction.
  Links installation and endpoint expansion were not added implicitly.
- Each installed-app search provider has a 750 ms response deadline, using
  the existing deadline helper; healthy results survive another provider
  stalling. Results are capped at five per provider. This bounds waiting for
  the provider, not its underlying execution or the whole search endpoint.

## Release and performance measures

Use a clean install and a populated upgrade, two workspaces and contrasting
roles. Exercise creation, retry, reload, completion, linking, restore and a
worker/realtime interruption. The [verification guide](verification.md) and
root plan already define these boundaries; keep one acceptance system.

Suggested product measures are time to first useful record, successful
capture/save rate, task completion without leaving context, setup abandonment,
weekly return and the percentage of work with clear owners and deadlines.
These are proposed measurements, not current telemetry results.

Measure interaction-to-feedback separately from durable server acknowledgment.
Benchmark realistic 1k/10k task workspaces, long documents and slow providers;
record p50/p95, query counts, payload size and error/recovery behavior. Existing
plan targets are acceptance goals, not measurements. Keep native virtualization
and CSS sticky columns; avoid scroll-time React updates or another task cache.

Do not prioritize more dashboards, decorative motion, a new shell, a new
storage engine, unreviewed AI writes or another copied backend. Finish the
connected workflow and its recovery path before widening the surface area.
