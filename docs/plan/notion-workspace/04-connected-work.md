# 04 — Connected daily work

[Program overview](../../NOTION_WORKSPACE_PLAN.md) · [Execution guide](execution.md)

**Status:** planned; NW-00 and scheduling required. Extend root-plan C2/C3/C5/C6,
P4/P4C/P7/P9 and M7/M10/M11. Preserve one native task/event/document/file and
the confirm-before-write contract.

## Source landmarks

- Scheduling: [Gantt model](../../../packages/twenty-apps/internal/a2e-projects/src/lib/project-gantt.ts)
  and [recurring generator](../../../packages/twenty-apps/internal/a2e-projects/src/lib/recurring-task-generator.ts).
- Linking: [endpoint map](../../../packages/twenty-apps/internal/a2e-links/src/lib/related-links-targets.ts).
- Meetings: [existing notes recipe](../../../packages/twenty-apps/internal/a2e-projects/src/lib/meeting-notes-recipe.ts).
- Focus: [Pomodoro content](../../../packages/twenty-front/src/modules/home-dashboard/components/PomodoroWidgetContent.tsx).
- Finance: [Bilan capture/review contract](../../bilan-experience.md).
- Installation, dependencies and packaging: [applications runbook](../../applications.md).

## Task contracts

| ID | Depends on | Deliverable / boundary | Acceptance and negative case |
| --- | --- | --- | --- |
| D1 — One Bureau bundle | — | Audit current presets/install groups, then improve the existing composite installation/setup entry; no package merger | One Bureau choice installs only the declared required apps, previews dependencies and reports partial failures/retry; stable universal IDs, independent upgrades/uninstall preflight and existing data preserved; app absence is not inferred from source presence |
| D2 — Task recurrence scopes | — | First define series/occurrence identities and “this occurrence / future occurrences / whole series” rules; pin persistence, generation and scope UI separately | Existing generator keys survive replay; overrides, completed/past tasks, deletions and month-end/DST behavior defined; edit does not regenerate duplicates or mutate unrelated events; reuse P4C recurrence helpers where compatible |
| D3 — Scheduling semantics | — | Design-only mapping of planned start/end, due date, duration, task dependencies and native calendar links | Parent/subtask hierarchy remains distinct from `blockedBy` dependency edges; `createdAt` stays immutable history; cycles, all-day/timezone/DST, locked/completed tasks and mixed permissions specified; schema changes planned with migrations |
| D4 — Gantt reschedule | D3 accepted | Pin single-task date edit first, then dependency-aware shift preview and apply | Pointer and keyboard reschedule same records; preview lists every affected task, rejects cycles/denied edits and requires confirmation for dependent shifts; stale versions/failure never leave an unexplained partial schedule; reload agrees with task/calendar |
| D5 — Plan my day | D3 accepted | Deterministic proposal from priority/estimate/working hours and existing calendar availability; separate preview from apply | User can edit/reject suggested slots, then confirm native task/event links; due date is not overwritten by a time block; no overlap/duplicate events on retry; timezone and provider read-only capability honored; no AI required |
| D6 — Link endpoint expansion | A2 | Design allowed endpoint/ownership matrix, then add one object family per brief to the existing morph junction/picker | Finance/file/project/event support added only with declared legs and metadata migrations; both directions, dedupe, unreadable/deleted targets and missing-app degradation tested; do not claim universal linking before endpoint coverage exists |
| D7 — Meeting → notes → tasks | A8, D6 | Extend the existing event-to-notes workflow with event context, reviewed task extraction and optional scheduling | Replay returns the same notes/tasks via correlation identities; user confirms writes; source event/page links remain navigable; no unsolicited provider invitations or duplicated events; usable manual non-AI path |
| D8 — Receipt → reviewed expense | — | First define ingestion/retry identity and draft/review/post boundary, then split capture, optional OCR proposal and reviewed posting | Keep original file; OCR/category/date are reviewable suggestions; use existing expense/receipt/book primitives, exact numeric semantics and period locks; no automatic ledger write on capture; retries cannot duplicate expense/posting; denied/failed upload retains recovery |
| D9 — Smart links, graph and ambient Syna | A1, D6 | Pin three independent contracts: deterministic link suggestions, permission-filtered graph, Cmd+K contextual read/propose-write | No automatic attachment/link/write; proposals cite readable source records and show exact effects; confirm rechecks permissions/staleness; graph has bounded paging and accessible list; zero-AI mode remains useful; answers have source snippets, not invented citations |
| D10 — Pomodoro time entries | — | Explicit task selection and reviewable completion-to-time-entry action using existing tracker | Session completion/reload/retry produces at most one native entry; task switch/pause/cancel cannot charge wrong task; actual elapsed time defined; denied entry keeps reviewable local state; no time log merely from opening a page |

## Decisions and release constraints

D4/D5 must use the native calendar ownership/capability contract; a provider that
cannot write is presented as read-only. A multi-record schedule apply needs a
transactional boundary or an explicit resumable operation with visible partial
state and repair; a client loop that can silently stop halfway is insufficient.

D8's OCR adapter is optional and follows the existing provider/AI configuration
and data-handling choices. Location is **opt-in** at capture with a usable denied
permission path, not inferred as a required finance property. This plan does not
settle accounting policy or certify legal compliance; existing Bilan release
gates still apply. Automatic categorization remains a proposal until reviewed.

D9's graph reuses stored links/mentions and their permissions, never another
index of unfiltered content. Attachment search and Syna answer snippets depend
on A6/A7 plus E11's extraction/authorization contract when attachment text is
involved. Adding AI does not bypass these dependencies.

## Verification

Pure schedule/recurrence/idempotency fixtures precede mutations. Include replay,
lost acknowledgment, two users, closed/read-only records, missing app and
populated upgrades. Pin actual package-local test commands after reading its
manifest; Projects currently uses Node tests, not a presumed Jest app config.

Orchestrators run the end-to-end event→notes→tasks→calendar journey, date agreement
after reload, Bureau install/upgrade/retry, reciprocal cross-app links and the
receipt→review→single-book-entry journey with worker logs. Extend E07/E14/E16/E17
instead of introducing a separate release certification system.
