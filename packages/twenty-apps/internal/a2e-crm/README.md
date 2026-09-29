# Syna CRM — review-first AI actions for the native CRM

Syna CRM (`a2e-crm`) adds two read-only assistant actions on top of Twenty's
native CRM records: an **email reply draft** for a message thread and a
**record enrichment assist** for a company or person. It owns no object, view
or sidebar entry — it only registers tools on the native AI registry
(`toolTriggerSettings`, P1.5), so the assistant can offer them in context.
See the [feature guide](../../../../docs/features.md) for how it sits next to
Bureau, Projets, Bilan, Discussions and Archive.

## Status and installation

**Status: source present, not release-certified.** The two tools, their
read-only role and unit specs exist in this repository; the live assistant
dispatch (including a restricted member's denied record failing closed) is
not proven by their presence.

Syna CRM is one of the six bundled A2E apps: the production image builds its
tarball and `app:provision-bundled` registers it at boot, it appears in
**Settings → Applications → A2E Suite**, and it can be selected in the
onboarding app list. It is not part of any workspace preset. To install it
by hand on a disposable workspace, follow the
[applications runbook](../../../../docs/applications.md).

## What it does

| Tool | Input | Returns | Never does |
| --- | --- | --- | --- |
| `draft-email-reply` | `messageThreadId`, optional `tone`, `language`, `maxWords` (1–2000) | The caller-readable thread plus the validated drafting options, so the assistant writes a reply for review | Send, store a draft message or write any record |
| `assist-record-enrichment` | `personId` or `companyId` | The caller-readable record fields and which ones are empty, so the assistant can suggest values | Write the suggested values — applying them is a separate, human-confirmed edit |

Both tools run under the **caller's** auth context: a thread or record the
member cannot read is refused with a typed not-found, exactly like a missing
one, so no cross-member or cross-workspace data leaks through the assistant.
The client they use is structurally read-only (`Pick<CoreApiClient, 'query'>`).

## Where users find it

- The assistant (side panel or full page) offers the tools when the current
  context is a company, a person or an email thread.
- Nothing is added to the sidebar or to record pages.

## Developing

```bash
cd packages/twenty-apps/internal/a2e-crm
yarn install --immutable
yarn typecheck
yarn lint
yarn test:unit
npx twenty dev:build .
```

Universal identifiers live in
[src/constants/universal-identifiers.ts](./src/constants/universal-identifiers.ts)
(`c31e*` block). They are permanent: never regenerate them.
