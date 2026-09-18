# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Editor capability checks:** the document/note rich-text body is twenty-front's shared BlockNote schema at `packages/twenty-front/src/modules/blocknote-editor/blocks/Schema.ts` (defaultBlockSpecs + custom `callout`/`file` + inline `mention`) — NOT the TipTap `advanced-text-editor` (that one serves forms/AI/email). Any "new editor block" question starts there.
- **Advanced BlockNote adds are license-gated:** `@blocknote/{core,react,mantine}` are MPL-2.0, but `@blocknote/xl-docx-exporter`, `xl-pdf-exporter` and transitive `xl-multi-column` are "GPL-3.0 OR PROPRIETARY" already shipped in `twenty-front` (root AGPL-3.0). Check D07 before wiring more XL packages.
- **`@blocknote/core` cannot be imported under `twenty-front` jest:** its transitive `prosemirror-highlight` ships untransformed ESM and `transformIgnorePatterns` excludes it, so any editor-dependent util must inject the parser (dependency inversion) and keep the BlockNote adapter in a separate, untested module. Pure DOM sanitizers use `jsdom`'s `DOMParser` and are fully testable.
- **Chat realtime fan-out hangs off metadata database events, not a resolver:** app-owned chat CRUD (`chatChannel`/`chatMessage`/`chatReaction`/`chatReadCursor`) is metadata-engine-generated, so publishers attach via `@OnDatabaseBatchEvent('chatMessage', DatabaseEventAction.X)` in `modules/chat/listeners/` and call `RealtimePublisherService.publish(buildChatChannelTopic(...), payload)`. Relations surface as join columns on the raw event row. Subscribe-time ACL stays in `RealtimeTopicAccessService`; publishing is best-effort (never fail the write).
- **Chat relation columns are `${fieldName}Id`, NOT the SDK `joinColumnName`:** the metadata engine derives the workspace column from the relation field name (`chatMessage.channel` → `channelId`, `chatMessage.author` → `authorId`, `chatReadCursor.workspaceMember` → `workspaceMemberId`, `chatReaction.message` → `messageId`), ignoring `manyToOne('customName')` from the app. Server code reading raw DB-event rows or the workspace ORM must use the field-name form; the GraphQL scalar input/output is also `${fieldName}Id`. The committed `ChatRealtimePublisherService` still reads the SDK names (`readCursorChannelId`, `reactionMessageId`, …) and is broken — verified by integration introspection (P5.1-chat-attachments-tests).
- **Native pages for app features are `twenty-front` code, not app code:** an app cannot register a route (phase-04 boundary), so the chat page is a hard-coded route in `modules/app/routing/utils/createWorkspaceRouteObjects.tsx` + an additive `AppPath` member, with the feature module under `src/modules/<feature>/` and a thin `src/pages/<feature>/<Name>Page.tsx`. Channels/messages are app-owned **metadata objects**, so read them with `useFindManyRecords`/`useCreateOneRecord`/`useUpdateOneRecord` (relation scalars `${fieldName}Id`); the two server custom resolvers (`chatMessages`, `chatUnreadCounts`) are `@MetadataResolver()` and must be queried with `useApolloCoreClient()` / `client: apolloCoreClient`, not the default client.
- **oxlint `twenty/matching-state-variable` is strict:** the local binding must equal the state key (`selectedChatChannelIdState` → `selectedChatChannelId` / `setSelectedChatChannelId`), and `useRef` for state trips `twenty/no-state-useref`. Also `twenty-shared/utils` does **not** export `isNonEmptyString` (it is `@sniptt/guards`); only `isDefined` etc. live there.

---


## 2026-09-18 - P3.4-feasibility-spike
- Report-only native-primitive/license feasibility for the six advanced authoring blocks. No code, no package installs, no runtime.
- Findings recorded in `docs/plan/p3.4-advanced-authoring-feasibility.md` and summarized in `docs/plan/phases/phase-03-report.md`.
- License: `@blocknote/{core,react,mantine}` MPL-2.0; `xl-docx-exporter`/`xl-pdf-exporter`/`xl-multi-column` GPL-3.0 OR PROPRIETARY, already imported by `twenty-front` (AGPL-3.0); `xl-math` absent → escalate D07.
- Per-block: record views & charts Conditional GO; multi-column GO (already installed transitively); math, text review, font/page-layout NO-GO now; existing PDF/DOCX/MD export GO with DOCX/MD degradation caveat. ODT stays deferred.
- Files changed: `docs/plan/p3.4-advanced-authoring-feasibility.md` (new), `docs/scripts/check-docs.mjs`, `docs/README.md`, phase report, progress.md.
- **Learnings:**
  - The record-view/chart primitives are first-party but live in `twenty-front` page-layout modules, not `twenty-ui`; no `RECORD_PAGE` widget type and no editor embed block exist.
  - `a2e-print-editor` body class is added on PDF export but has no CSS rule (no-op).
  - `@blocknote/xl-multi-column` is already pulled in transitively by both XL exporters, so multi-column only needs schema wiring.
---

## 2026-09-18 - P3.4-import-portability
- Implemented the pure HTML-import pipeline for document bodies under `packages/twenty-front/src/modules/blocknote-editor/import/`: `sanitizeImportedHtml` (shares `isBlockedUrl` with the TipTap preview sanitizer, removes scripts/unsafe embeds/active content + strips `on*`/`srcdoc`/unsafe URLs), `collectHtmlImportWarnings` + `hasUnsafeHtmlImportMarkup` (machine-readable unsupported/unsafe warnings, precise residue check), `mapImportedAttachmentsAndLinks` (attachment/link resolvers, fail-closed drop/flatten), `runHtmlImportWithRetry` (linear backoff, injectable sleep), `validateHtmlImportForCreate` (empty/no-blocks/unsafe-residue gate), and `importHtmlToDocument` (sanitize → retry-parse → map → validate orchestrator with progress). `adapters/parseHtmlWithBlockNote` reuses BlockNote's own `tryParseHTMLToBlocks`.
- Files changed: the 7 new source files + 6 specs above; one-line additive export of `isBlockedUrl` in `advanced-text-editor/utils/sanitizeHtmlPreview.ts`; phase-03 report + this file.
- **Learnings:**
  - Acceptance bullet 3's "compose P1.6e/P3.2, do not duplicate" applies to the *searchable-templates* leg; the HTML sanitizer is genuinely missing, so a dedicated import sanitizer is warranted (wider tag set + warning output) as long as it shares the URL policy.
  - `isNonEmptyString` comes from `@sniptt/guards` in this area; `isDefined`/`isPlainObject` from `twenty-shared/utils` — `isPlainObject` is the right structural guard for BlockNote `unknown` blocks.
  - The UI wiring (file input → parse → create) is a separate, browser-Tier-2 slice; this lib deliberately never creates a record itself.
---

## 2026-09-18 - P5.1-chat-realtime-publish
- Published durable chat writes over the repaired realtime gateway: a `chatMessage`/`chatReaction`/`chatReadCursor` database-event listener fans out `chat.message.created|updated|deleted`, `chat.reaction.created|deleted` and `chat.read.updated` on `workspace:<id>:chat:<channelId>` (typing already shipped via `ChatTypingService`).
- `chat.read.updated` carries an aggregated unread count (messages after the read position, excluding own and soft-deleted), so the durable `chatReadCursor` — not a per-socket seq — remains the replay cursor.
- Files changed: `packages/twenty-server/src/modules/chat/listeners/chat-realtime.listener.ts` (new), `services/chat-realtime-publisher.service.ts` (new), `utils/chat-realtime-event.util.ts` (new), `utils/chat-unread-count.util.ts` (new), 3 new specs, `chat.module.ts` (providers).
- Checks: jest `src/modules/chat src/engine/core-modules/realtime-gateway` 13 suites / 90 tests green; tsgo exit 0; oxlint --type-aware + oxfmt --check clean on the 8 touched files; nx lint:diff-with-main "No changed files." (uncommitted).
- **Learnings:**
  - App-owned object DB events are keyed by `nameSingular` (`chatMessage.created`), and raw event `properties.after/before` carry join columns (`channelId`, `reactionMessageId`, `readCursorChannelId`) — same seam the subscribe ACL reads.
  - Reaction events need a `chatMessage` lookup to resolve the channel; read events need a `chatMessage` query to aggregate unread. Both run under `buildSystemAuthContext(workspaceId)` + `{ shouldBypassPermissionChecks: true }`; publishing is wrapped best-effort so fan-out can never fail the write.
  - Listener providers live in `ChatModule`; `EventEmitterModule.forRoot({ wildcard: true })` is already global in `CoreEngineModule`.
---

## 2026-09-18 - P5.1-chat-mentions-skeleton
- Chat @mentions now reach the one P8.1 notification service: a second `chatMessage.created` database-event listener (`ChatMentionListener`) calls `ChatMentionService.notifyMessageMentions`, which extracts mention ids from the Markdown-lite body, resolves workspaceMember→user through a system-context `workspaceMember` lookup, and calls `NotificationService.requestNotifications` with one `MENTION` request per mentioned user (payload `{ kind: 'chat.mention', channelId, messageId, authorId, mentionedWorkspaceMemberIds }`). No chat-local notification storage; P8.2 owns the shared parser/context snippets.
- Files changed: `packages/twenty-server/src/modules/chat/utils/chat-mention.util.ts` (new), `services/chat-mention.service.ts` (new), `listeners/chat-mention.listener.ts` (new), 3 new specs, `chat.module.ts` (imports NotificationModule + 2 providers).
- Checks: jest `src/modules/chat src/engine/core-modules/notification` 15 suites / 70 tests green; tsgo exit 0; oxlint --type-aware + oxfmt --check clean on the 7 touched files; nx lint:diff-with-main "No changed files." (uncommitted).
- **Learnings:**
  - Mention wire format is shared with the a2e-chat composer: `@[label](workspaceMemberId)` (app `src/lib/message-body.ts`). The server skeleton only needs the ids; P8.2 replaces this with the shared docs/chat/comments parser + snippets.
  - Notification requests are per-`User` (`userId`), while chat mentions carry `workspaceMember` ids — one member→user hop (select `id, userId` off `workspaceMember`) is required; removed members drop out.
  - Multiple `@OnDatabaseBatchEvent` listeners can share one object/action pair (`chatMessage.created` is handled by both `ChatRealtimeListener` and `ChatMentionListener`) — no coordination needed.
---

## 2026-09-18 - P5.1-chat-attachments-tests
- Finished the P5.1 bullets 5–6 slice (resumed the 19:35 run of the same task): `chatUnreadCounts` GraphQL query + service, and a real-manifest integration spec proving keyset pagination, channel isolation, cross-workspace isolation, unread counts and message attachments over the shared `attachment`/file-storage primitives.
- Files changed: `packages/twenty-server/src/modules/chat/services/chat-unread-count.service.ts` (new), `.../dtos/chat-unread-count.dto.ts` (new), `.../services/__tests__/chat-unread-count.service.spec.ts` (new), `.../resolvers/chat.resolver.ts`, `.../chat/chat.module.ts`, `test/integration/graphql/suites/chat/chat.integration-spec.ts` (new).
- Checks: `npx jest src/modules/chat` 47 tests green; `npx tsgo -p tsconfig.json --noEmit` exit 0; single-spec `NODE_ENV=test ... jest --config jest-integration.config.ts test/integration/graphql/suites/chat --runInBand` 6/6 green on a clean workspace (after `npx nx database:reset twenty-server`); oxlint --type-aware + oxfmt --check clean on the 6 files; nx lint:diff-with-main "No changed files."
- **Learnings:**
  - Every manifest-sync spec must call `jest.useRealTimers()` AFTER `setupApplicationForSync` and BEFORE `uploadApplicationFile`; setup leaves fake timers on, and uploads under fake timers return an empty body (looks like "no data, no errors").
  - `database:reset` truncates metadata rows and flushes the `integration-tests:*` cache, but does not drop orphan app DDL: a crashed/incomplete a2e-chat install leaves `_chat*` tables and `targetChat*` columns on the standard tables, and the next install then fails with `column "targetChatXxxId" ... already exists` / `type "_chatXxx_enum" already exists`. The spec's `afterAll` cleanup only deletes metadata (raw SQL) so it also leaves DDL; single-spec runs are only clean under `with-db-reset` (or after manually dropping the orphans + deleting `integration-tests:*` cache keys).
  - App-object CRUD GraphQL scalars are named after the relation field (`channelId`, `workspaceMemberId`), not the SDK joinColumnName — the attachments relation is auto-provisioned by the engine (`attachment.targetChatMessage` + `chatMessage.attachments`, column `targetChatMessageId`) even though the app manifest declares no attachment fields.
---

## 2026-09-18 - P5.2-chat-page
- Built the native chat page front core (P5.2 bullets 1–3): a `twenty-front` feature module `src/modules/chat/` + `src/pages/chat/ChatPage.tsx` + a `AppPath.Discussions` route. Sidebar groups channels into workspace/project/custom sections with bold+unread badges; the conversation pane renders top-level messages with an unread divider, inline expandable threads with reply counts, and a dedicated `ChatThreadView` pane; the composer has attach, emoji picker and `@`-mention autocomplete over the app's `@[label](workspaceMemberId)` wire format; mark-read writes the durable `chatReadCursor`.
- Files changed: 35 new files under `packages/twenty-front/src/modules/chat/**` and `packages/twenty-front/src/pages/chat/**`; edited `modules/app/routing/utils/createWorkspaceRouteObjects.tsx` and `packages/twenty-shared/src/types/AppPath.ts`.
- Checks: `npx jest src/modules/chat` 9 suites / 42 tests green; related-routing suites 2/41 green; `npx tsgo` clean on every touched file (the 6 remaining errors are pre-existing `modules/front-components` AppPath nominal-mismatch, reproduced on the clean base tree); oxlint --type-aware + oxfmt --check clean; `nx lint:diff-with-main twenty-front` "No changed files."; `nx build twenty-shared --skip-nx-cache` success.
- **Learnings:**
  - Apps cannot register routes, so a feature page is native `twenty-front` code; app-owned objects still go through the object-record hooks, while the two `@MetadataResolver` custom queries need `useApolloCoreClient()`.
  - `.at(-1)` / array `index` keys were avoided; `ChatMessageList` computes top-level vs replies purely so the thread/read-state transitions are unit-testable without Apollo. A read-cursor `loading` flag replaced a `useRef` guard to satisfy `twenty/no-state-useref`.
  - twenty-ui has no emoji set, so the composer/reactions use a curated `CHAT_EMOJI_PALETTE` constant rendered with twenty-ui buttons.
---
