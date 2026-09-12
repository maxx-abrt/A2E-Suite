# Task brief template

[Documentation home](../README.md) · [Handoff template](handoff.md)

Copy the sections below into an issue/MR or a focused design note. Replace
placeholders with real paths and criteria; do not copy this as a new global
prompt or infer approval for unrelated work.

## Outcome and scope

- Issue / owner / baseline revision:
- User and workspace context (individual, team, restricted member, guest):
- User-visible outcome:
- In scope:
- Explicitly out of scope:
- Delivery dependency / known audit finding:

## Evidence and approach

- Reproduction: starting state → action → actual result → expected result.
- Relevant source paths and existing tests:
- Root cause (observed facts separated from hypotheses):
- Native Twenty primitive to reuse:
- Alternatives considered; why the simplest complete approach wins:
- Product decision requiring confirmation, if any:

## Data and lifecycle

- Objects/fields/relations, universal IDs and app ownership:
- Tenant/role/field/record permissions, including search and share paths:
- Files, retention, archive/purge and uninstall/dependency effects:
- Retry/idempotency/concurrency and failure reporting:
- Fresh install, populated upgrade, compatibility and rollback/forward repair:

## Experience and templates

- Entry point, first action, sidebar/search/side-panel integration:
- Loading, empty, error, unavailable and permission-denied states:
- Locale, light/dark, keyboard and narrow-screen behavior:
- Starter content/workflow recipes: prerequisites, version, provenance,
  preview, optional samples and repeated-apply behavior:

## Acceptance and verification

- [ ] Happy path through the real UI/API boundary, with persisted results
- [ ] Negative permissions and a second workspace
- [ ] Relevant retries, concurrency, pagination and lifecycle edge cases
- [ ] Surrounding CRM/native interaction remains usable
- [ ] Commands, required services and expected artifacts identified
- [ ] Current-state docs and handoff updated with actual results

Record tests before implementation where practical. A criterion that cannot be
run remains blocked/unverified, not checked because code was written.
