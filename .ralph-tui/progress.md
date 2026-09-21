# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Recurring calendar edits/deletes go through pure dispatchers first.** `applyCalendarEventEdit` / `applyCalendarEventDelete` in `packages/twenty-front/src/modules/calendar/utils/` own the this-occurrence/whole-series semantics; `planCalendarSeriesMutations.ts` rebuilds the series state from stored rows (`buildCalendarRecurrenceSeriesStateFromEvents`) and only serializes the dispatcher output to record writes. Never re-implement the skip/detach math — add a planner that calls the dispatcher.
- **Recurrence is stored on the standard `calendarEvent` as 5 nullable TEXT columns** (`recurrenceRule`, `recurrenceTimezone`, `recurrenceSeriesId`, `recurrenceOccurrenceDay`, `recurrenceSkippedOccurrenceDays` = JSON day array). Occurrence id = `<seriesId>@<day>`, series id = `calendar-series#<anchorId>`. Add any new field to `CalendarEventRecord` **and** the `recordGqlFields` of both `useCalendarEvents` and `useCalendarEventMutations`, and update the 4 calendar test fixtures.
- **A `sendChatMessage` option threads `resolver @Args → AgentChatStreamingService.streamAgentChat → StreamAgentChatJobData → StreamAgentChatJob → ChatExecutionService.streamChat`.** Every hop has an explicit field name; the queued-message branch intentionally drops the option. Forced-tool control is `ChatExecutionService`'s `toolChoice` seam (~line 531): validate a named tool against the caller-scoped `toolCatalog` from `buildToolIndex`, hydrate it with `getToolsByName`, then pass `{ type: 'tool', toolName }`. Read-only = `ToolCategory.LOGIC_FUNCTION` (mirror of the front's `isReadOnlyTool`); a non-read-only name is never forced. Adding an `AiExceptionCode` also requires a case in `ai-graphql-api-exception-handler.util.ts` (`assertUnreachable` is exhaustive).
- **No published npm `twenty-sdk` (≤2.41.0) carries the workspace-only `AppPath` members** (`Discussions`, `Drive`, `Inbox`, `Calendar`, `Home`…). Internal apps are standalone (own `yarn.lock`, npm-pinned SDK) and a front component bundles the app's pinned SDK, so a native route is pinned as a literal constant and unit-asserted — `a2e-drive/src/lib/drive-file-search.ts` `DRIVE_APP_PATH = '/drive'`, and `a2e-documents`' spec is named after the host `AppPath` member but asserts the literal. Only `packages/twenty-shared/src/types/AppPath.ts` (and the root `node_modules/twenty-sdk` symlink to workspace `packages/twenty-sdk`) has them.
- **App navigation menu items cannot target a bespoke route.** `NavigationMenuItemType.LINK` is external-only: `navigation-menu-item/display/link/utils/getLinkNavigationMenuItemComputedLink.ts` prefixes `https://` to any non-http link and `NavigationDrawerItem.tsx:297` renders it as an `href`/new tab. VIEW→record index, OBJECT→`/objects/:plural`, RECORD→record show, PAGE_LAYOUT→`/page/:id`, FOLDER. Native pages (`/drive`, `/discussions`) are reached by deep link/command, not a sidebar link.

---

## [2026-09-21] - US-068
- Wired the this-occurrence-vs-whole-series scope dialog into `/calendar`: new `CalendarSeriesScopeDialog`, `shouldPromptCalendarSeriesScope`/`isCalendarRecurringEvent`/`isCalendarLocalEditSurface`, and `planCalendarSeriesMutations` (4 planners) routing through the existing `applyCalendarEventEdit`/`applyCalendarEventDelete`.
- Extended `CalendarEventRecord`/`CalendarEventInput` with the 5 recurrence columns; `useCalendarEvents`/`useCalendarEventMutations` now select them; added `deleteCalendarEvents` for whole-series deletion.
- Day/agenda details + composer offer the dialog; month/week details now show a read-only hint (interpretation of "week/month stay read-only, no new edit paths").
- Files changed: calendar module types/hooks/components/utils (+9 new utils, 1 new component, 1 new spec) and `pages/calendar/CalendarPage.tsx`.
- **Learnings:**
  - The front does not render expanded occurrences yet (stored rows only) — a series shows as its anchor plus detached siblings; occurrence-level expansion is a separate slice.
  - `applyCalendarEventDelete` returns `CalendarRecurrenceSeriesState | null` for the union, so a this-occurrence call still needs a null-guard for tsgo.
  - `isNonEmptyString` comes from `@sniptt/guards`, not `twenty-shared/utils`.
---

## [2026-09-21] - US-069
- Threaded an additive nullable `directToolInvocation` arg through `sendChatMessage` → `AgentChatStreamingService` → `StreamAgentChatJobData` → `StreamAgentChatJob` → `ChatExecutionService`, which forces `toolChoice: { type: 'tool', toolName }` for the turn.
- Fail-closed validation against the caller-scoped catalogue: unknown/uninstalled/restricted/cross-workspace names throw a new `DIRECT_TOOL_INVOCATION_NOT_AVAILABLE` (ForbiddenError) before any provider call; a non-read-only (`!= LOGIC_FUNCTION`) name is never forced (tool not loaded, `toolChoice` stays `'auto'`).
- Files changed: `ai.exception.ts`, `ai-graphql-api-exception-handler.util.ts`, new `ai-chat/utils/resolve-direct-tool-invocation.util.ts` (+spec), `ai-chat/services/chat-execution.service.ts` (+spec), `agent-chat.resolver.ts`, `agent-chat-streaming.service.ts`, `stream-agent-chat-job.types.ts`, `stream-agent-chat.job.ts`.
- **Learnings:**
  - The forced tool is not preloaded, so it must be hydrated with `getToolsByName` and merged into `directTools`/`activeTools`, else the SDK can't call it.
  - The `toolChoice` object must carry `type: 'tool' as const` for the AI SDK v6 `ToolChoice<ToolSet>` type.
  - "Mutating still stages the PREFILL draft" is a front-only behavior (US-067); the server's enforceable half is "never auto-executed".
  - `source: 'tool'` args only; no GraphQL codegen — the checked-in schema predates the arg.
---

## [2026-09-21] - US-070
- Repointed the a2e-chat Cmd+K "go-to-chat" command from the chatChannels record index to the dedicated `/discussions` chat page: new `CHAT_DISCUSSIONS_PATH = '/discussions'` in `src/lib/chat-navigation.ts`, consumed by `go-to-chat.front-component.tsx` (+ description "Ouvre la page des discussions.").
- Added `src/lib/__tests__/chat-navigation.test.ts` (2 tests; app suite 56→58).
- Deliberately left `channels.navigation-menu-item.ts` untouched: no host nav primitive can target `/discussions` (see the pattern above), and a relative `LINK` would render `https:///discussions`.
- Files changed: `src/lib/chat-navigation.ts` (new), `src/lib/__tests__/chat-navigation.test.ts` (new), `src/front-components/go-to-chat.front-component.tsx`.
- **Learnings:**
  - `AppPath.Discussions` is in NO published npm twenty-sdk (2.31.0/2.39.0/2.40.0/2.41.0 all checked); only the workspace SDK has it. A 2.39.0 bump was trialled then reverted (no benefit).
  - The stalled 17:37Z claim of this slice was resumed (Ralph session.json iteration 3 `taskCompleted:false`, zero files touched).
  - Remaining host gap for the nav bullet: `getLinkNavigationMenuItemComputedLink` needs to pass a leading `/` through as an internal react-router link.
---
