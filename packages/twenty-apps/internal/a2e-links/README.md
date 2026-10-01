# A2E Links (`a2e-links`)

Generic cross-app link junction (roadmap `M11a`, decision `D-M11A-LINK`).

**Status: source present, not release-certified.** The `a2eLink` object, its two
native `MORPH_RELATION` groups and the inverse O2M fields on the first consumer
targets exist in this repository; the live install and the browser journeys are
not proven by their presence.

## What it adds

- `a2eLink`, an app-owned junction row with two polymorphic endpoints:
  `source` (the record whose page fired "Link…") and `target` (the picked
  record). Each endpoint is a morph group — one `MORPH_RELATION` leg per
  declared linkable object, all sharing a `morphId`, per the native
  `attachment` / `taskTarget` pattern.
- The inverse `ONE_TO_MANY` relation fields on the first consumer targets:
  `document` (owned by A2E Documents) and the standard `task` object. A2E Links
  owns both sides of every relation (consumer-owns-both-sides), so a record page
  reads links and backlinks through native relation queries instead of a
  read-time scan.
- App-owned link metadata: `linkKey` (unique `${sourceObject}:${sourceId}:${targetObject}:${targetId}`
  dedup key), `label`, and `linkType` (`USER_LINK` vs a mention-derived link).

The "Link…" picker (US-148) is the host-side universal linker in
`twenty-front` (`modules/a2e-links`): a record-page action gated on this app's
universal identifier. It searches the declared linkable set through the core
`search` federation (`SingleRecordPicker` → `useObjectRecordSearchRecords`) and
writes one `a2eLink` row per pair through the record-create primitive, using
`linkKey` as the duplicate guard. The "Related" tab (US-149) is the remaining
follow-up increment.

## Install order

There is no manifest-level app-dependency field, so the caller owns the order:
**every app owning a declared linkable object must be installed before A2E
Links**, because an unresolved morph target aborts the whole install
atomically. Today that means **A2E Documents before A2E Links** (the `task`
target is a standard object and is always present).

## Uninstall

Uninstalling a provider (A2E Documents) while A2E Links is installed is refused
by the C3 uninstall-preflight, because a link morph leg targets the provider's
object. Uninstall A2E Links first; its contributed inverse fields are removed
with it.

## Development

```sh
yarn install
yarn typecheck
yarn lint
yarn test:unit
npx twenty dev:build .
```
