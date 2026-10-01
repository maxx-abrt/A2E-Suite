# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Inline-content mention block (US-144, dateReminder):** a custom inline content is registered in `blocknote-editor/blocks/Schema.ts` `inlineContentSpecs` via `createReactInlineContentSpec` (`propSchema` + `content: 'none'`, plus `toExternalHTML` so Markdown/DOCX degrades to a label instead of a missing node). Unlike block-inserting slash items, an inline-content slash entry that needs hooks (record creation, snackbar, account resolution) ships as a hook called in `BlockEditor.tsx` (`useDateReminderSlashMenuItem(editor)`) and is appended to the `slashMenuItems()` array — the hook returns a `SuggestionItem` whose `onItemClick` uses `editor.insertInlineContent([{ type, props }, ' '])`. Keep the builder (`buildDateReminderMention`) pure and locale/timeZone-injected so it is Jest-loadable (the real `@blocknote/*` dist cannot be imported under Jest).
- **Host-side Syna recipe family (no app, US-143):** prompt/action recipes ship as a host `SynaRecipeDescriptor` registry in `twenty-front/src/modules/ai/` (`TemplateDescriptor` + `status`/`requiredToolName`/`prompt fr+en`/`deferral`/source), projected to the gallery via `HOST_TEMPLATE_DESCRIPTOR_GROUPS` as a synthetic `a2e-host-syna` group containing only READY recipes. Each AI recipe names its registry tool through `buildLogicFunctionToolName` and install-gates on the owning app's universal identifier; the P7 invoice recipe stays registry-only `DEFERRED`. Apply is confirm-first (`useSynaRecipeApply` stages the prompt as a Syna draft, writes nothing). A new gallery category must be added to the shared closed `TemplateDescriptorCategory` union, then `npx nx build twenty-shared --skip-nx-cache` (and twenty-sdk) before twenty-front tsgo.

---

## [2026-10-01] - US-143
- What was implemented: the M9c Syna prompt/action recipe family (8 recipes) as a host-side `SynaRecipeDescriptor` registry; a gallery host group `a2e-host-syna` (7 READY recipes); confirm-first apply (stage the Syna prompt draft); a family validator, trigger→preview and P7-gate execution resolvers; the `draft-invoice-from-time-entries` recipe registered `DEFERRED` behind P7 and never projected to the gallery.
- Files changed: `twenty-shared/src/application/templateDescriptorType.ts`; `twenty-front/src/modules/ai/{types/SynaRecipeDescriptor.ts,constants/SynaRecipeDescriptors.ts,hooks/useSynaRecipeApply.ts,utils/{findSynaRecipeDescriptor,buildSynaRecipePreview,resolveSynaRecipeExecution,validateSynaRecipeDescriptors}.ts}` + tests; `twenty-front/src/modules/template-gallery/{constants/HostTemplateDescriptorGroups.ts,constants/TemplateGalleryCategoryConfig.ts,hooks/useApplyTemplate.ts}` + test; phase report.
- **Learnings:**
  - `isTemplateDescriptor` is a type guard over a subtype: `if (!isTemplateDescriptor(descriptor))` narrows `SynaRecipeDescriptor` to `never` inside the branch. Read it into a `const` boolean (or cast to `unknown`) to keep the descriptor's own fields accessible.
  - `TemplateDescriptorCategory` is a closed union driving `TEMPLATE_GALLERY_CATEGORY_CONFIG` (`Record<union>`), so a new family category must be added in twenty-shared and rebuilt before twenty-front tsgo.
  - `isNonEmptyString` is NOT in `twenty-shared/utils`; import it from `@sniptt/guards` (as `TemplateGallery.tsx` does).
---


## [2026-10-01] - US-143 (verification resume)
- What was implemented: nothing new — the M9c Syna prompt/action recipe family was already implemented and committed at `953a7a89` by the 19:26 run. This iteration independently re-verified all Tier-0 gates green from HEAD and reported `done-for-review` with zero changes.
- Files changed: none (verification only; phase report + this progress note appended).
- **Learnings:**
  - Ralph can have overlapping iterations: this session was assigned US-143 while the 19:26 run was still mid-flight and had already committed it (a US-144 `CLAIMED` line follows in the phase report). Before doing any work, always re-check `git log` / `git status` and the report tail — the assigned task may already be committed. Never rebuild committed work.
  - The host-side Syna recipe family pattern is captured in the Codebase Patterns section above.
---


## [2026-10-01] - US-144 (blocked — live competing executor)
- What was implemented: nothing. Stopped at contract §1.3 + §3: an unexpired `CLAIMED — US-144/date-reminder-mention` (phase-13-report.md:647, 19:38:50Z) exists and a competing executor is actively writing the slice right now (7 new/changed `twenty-front/src/modules/blocknote-editor/` files, mtimes 19:43:57–19:44:34). Zero source edits made.
- Files changed: none (only this progress note + the phase-13 report entry).
- **Learnings:**
  - `[parallel] mode = "never"` in `.ralph-tui/config.toml` is NOT enforced across separate `ralph-tui run` invocations: `ps aux` showed three live processes (PIDs 24782/74194/68648) on the same checkout. A clean `git status` can turn dirty mid-session while you are only reading — always re-check `git status` + target-file mtimes right before editing, not just at session start.
  - To detect a live writer, compare `git status --porcelain` and `stat` mtimes across two reads a few minutes apart; a task that looked unclaimed can be mid-flight.
  - Do not append `CLAIMED` or resume when a same-slice claim is unexpired and files are actively changing — report `blocked — already claimed` with the file/mtime evidence and stop.
---

## [2026-10-01] - US-144
- What was implemented: the M8a-3 date/reminder mention. A `dateReminder` inline content chip (`DateReminderInlineContent`) backed by a real Agenda `calendarEvent`; a pure `buildDateReminderMention` (next half-hour slot, no guest invitations, localized label that doubles as the event title) + `getDateReminderMentionExportText`; a `useDateReminderSlashMenuItem` hook that resolves a calendar-capable connected account, creates the event through the existing `useCreateCalendarEvent` composer primitive, then inserts the chip — and degrades with a warning snackbar + no inserted node when no account exists.
- Files changed: `twenty-front/src/modules/blocknote-editor/blocks/{DateReminderInlineContent.tsx,Schema.ts}`; `.../hooks/{useDateReminderSlashMenuItem.ts,__tests__/useDateReminderSlashMenuItem.test.tsx}`; `.../utils/{buildDateReminderMention.ts,getDateReminderMentionExportText.ts,__tests__/...}`; `.../components/BlockEditor.tsx`; phase report.
- **Learnings:**
  - `useCreateCalendarEvent` (provider mutation, requires `connectedAccountId`) is the "Agenda reminder" primitive; `isCalendarCreationEnabledForAccount` is the readiness gate (provider + enabled calendar channel). The local `useCalendarEventMutations` path needs no account, so it does not satisfy the AC's connected-account gate.
  - `oxlint`'s `consistent-type-imports` flags `import { Temporal }` when only used as a type (use `import type`) — but keep the value import where `Temporal.Now`/`Temporal.Instant.from` run.
  - zsh does not word-split unquoted `$FILES`; pass lint file lists explicitly (or `${=FILES}`) or oxlint sees one non-existent filename and reports "0 files".
  - Reusable pattern added to the Codebase Patterns section above.
---

## [2026-10-01] - US-145 (blocked — already claimed)
- What was implemented: nothing. Stopped at contract §1.3: `phase-13-report.md:682` holds an unexpired `CLAIMED — US-145/provider-free-stories` (2026-10-01T17:47:00Z, base `bf9acfc0`), ~72s old with no follow-up. Zero source edits made.
- Files changed: none (only this progress note + the phase-13 report entry).
- **Learnings:**
  - The claim was not this iteration's: `git log -S "US-145/provider-free-stories"` shows it entered HEAD `0d9ede12` (iter-17/US-144 engine commit at 17:47:54Z) while its declared base `bf9acfc0` predates that commit — a concurrent live session racing the same report file appended it just before the US-144 report; both appends landed in one engine commit.
  - Distinguish a real competing claim from a stale one by comparing the claim's declared `base` to current HEAD: a base that predates the last engine commit that *introduced the line* means another session wrote it after you started, not your own prior iteration.
  - Never append a second `CLAIMED` when one is already unexpired for your exact slice — that only deepens the race. Report `blocked — already claimed` and let the orchestrator adjudicate.
---
