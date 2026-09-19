# A2E Chat — workspace discussions

A2E Chat adds native workspace discussions on top of the realtime gateway:
workspace, project and on-demand channels, threaded replies, reactions,
mentions, typing presence and read cursors. It is the collaboration part of
the intended **Bureau** experience. See the [feature guide](../../../../docs/features.md)
for how Discussions sits next to Documents, Projects, Bilan and Drive, and
[DEPLOY.md](../../../../DEPLOY.md) for the WebSocket/Redis requirements the
live updates depend on.

## Status and installation

**Status: source present, not release-certified.** The metadata, the
Discussions page and the realtime topics described below exist in this
repository; installation and every collaborative journey are not proven by
their presence. Chat is not currently listed in the A2E section allowlist or
the workspace presets.

Follow the [applications runbook](../../../../docs/applications.md) to
register, publish and install the app on a disposable workspace.

## Where users find it

- Sidebar entry **Discussions** → `allChannels`
  ([channels.navigation-menu-item.ts](./src/navigation-menu-items/channels.navigation-menu-item.ts)).
- Native page at route `/discussions` (`AppPath.Discussions`,
  [ChatPage.tsx](../../../twenty-front/src/pages/chat/ChatPage.tsx)).
- Command menu: **Create a channel**
  ([create-channel.command-menu-item.ts](./src/command-menu-items/create-channel.command-menu-item.ts)).
- A **Discussions** tab on company and project record pages opens that
  record's channels in the side panel
  ([company-discussions.page-layout-tab.ts](./src/page-layout-tabs/company-discussions.page-layout-tab.ts)).

## What it does

### Channels and messages

- `chatChannel` — `name`, `kind` (`WORKSPACE` / `PROJECT` / `CUSTOM`),
  `visibility` (`PUBLIC` / `PRIVATE`), `topic`, posting-role rules, and links
  to a project or company.
- `chatChannelMember` — membership with an `OWNER` / `MEMBER` role.
- `chatMessage` — Markdown-lite body with `@[label](id)` mentions (max 4000
  characters), thread replies via `threadParent`, and reactions.
- `chatReaction` and `chatReadCursor` — emoji reactions and per-member
  last-read state.

### Realtime

Live updates use the realtime gateway topic
`workspace:<id>:chat:<channelId>` (`buildChatChannelTopic`), carrying
`chat.message.created` / `updated` / `deleted`, `chat.typing`,
`chat.read.updated` and `chat.reaction.created` / `deleted` events. Presence
and typing are ephemeral; messages and read cursors are durable records that a
client refetches. The gateway requires Redis for cross-instance fan-out — see
[DEPLOY.md](../../../../DEPLOY.md).

### Starter channels

`post-install` idempotently seeds two workspace channels, **Général** and
**Annonces**, both public
([starter-channels.ts](./src/lib/starter-channels.ts)).

### Inbox

Mentions and assignments surface through the separate native **Inbox** at
`/inbox`, not through the Chat app. Inbox notifications are core-schema rows
with their own topic (`workspace:<id>:inbox:<userId>`); see the
[feature guide](../../../../docs/features.md).

## Development

From this directory, after installing a compatible Node/SDK:

```sh
yarn typecheck
yarn lint
yarn test:unit
yarn twenty dev:build .
```

The unit tests cover channel membership and message-body helpers; they do not
prove an installed workspace or a two-session browser journey. Record real
results with the [verification guide](../../../../docs/verification.md).
