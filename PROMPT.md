
You are implementing A2E Suite's all-in-one workspace roadmap.

Read, in this exact order, fully before writing any code:
1. PROMPT.md          (this file — the operating contract)
2. PLAN.md            (scope, phases, and the task checklist you will tick)
3. CLAUDE.md + AGENTS.md (house rules: style, i18n, icons, migrations)
4. docs/plan/01-codebase-map.md
5. docs/plan/02-reference-analysis.md
6. docs/plan/03-integration-blueprint.md
7. docs/plan/04-twenty-native-law.md  (BINDING — read fully; your work is
   rejected in review if it violates the concept→primitive mapping §1,
   the anatomy standards §2–§4, or skips the wiring checklist §5)
8. The latest entries of docs/plan/phases/phase-<N>-report.md for the
   CURRENT phase (find it in PLAN.md — the phase with [~] or the first
   unticked phase).

Then:
- Locate the first unticked task [ ] in the current phase of PLAN.md.
- Read the surrounding code for every file you intend to touch (adjacent
  files beat any written rule). Never edit blind.
- Implement ONLY that one task. Small commits. Tick the task in PLAN.md
  ([x]) in the same commit and append a dated entry to the phase report.
- Run the quality gates (PROMPT.md §3). If anything fails, fix it before
  moving on.
- Stop after the task or when context runs low; your phase-report entry is
  the handoff for the next agent.
```

## 2. Operating rules (binding, no exceptions)

1. **PLAN.md is the contract.** Do only the current task. If you believe the
   plan is wrong, STOP and write a "DEVIATION REQUEST" entry in the phase
   report instead of silently changing course. Never invent new systems —
   everything must fit [`docs/plan/03-integration-blueprint.md`](./docs/plan/03-integration-blueprint.md)
   and [`docs/plan/04-twenty-native-law.md`](./docs/plan/04-twenty-native-law.md):
   if Twenty has a primitive for it, you USE the primitive (views, page
   layouts, workflows, roles, nav items, command menu items) — no parallel
   frameworks, no hand-rolled replacements.
2. **Verify primitives before using them** (04-twenty-native-law §6):
   grep the real-estate app, twenty-sdk exports, and the module you extend
   to confirm the API exists before you code against it.
3. **One task = one focused change** = tick in PLAN.md + phase-report entry
   + green gates. A task is NOT done until its phase's acceptance criteria
   are unaffected and gates pass.
4. **Read before writing.** For every file you touch, read it and at least
   one adjacent sibling first. Match local naming, structure and patterns —
   `twenty-apps/internal/real-estate/` is the app-format reference;
   `twenty-server/src/modules/<domain>/` the server-module reference.
5. **Never break what works.** Additive only: no renames/removals of
   tables, columns, GraphQL fields, routes, exported symbols. New entity →
   generated migration + upgrade command under `2-39/` with a real epoch-ms
   timestamp strictly greater than every existing one in that dir, `up` +
   `down`. Never rewrite committed upgrade commands.
6. **House style** (from CLAUDE.md, enforced): named exports only; types
   over interfaces; no `any`; no abbreviations; `Props`-suffixed component
   prop types; `//` comments only for WHY; Linaria for styling; icons from
   `twenty-ui/icon` only (canonical names in
   `packages/twenty-ui/src/icon/icon-dictionary.md`); Lingui for ALL
   user-facing strings (fr + en); reuse `twenty-shared/utils` guards
   (`isDefined`, `isNonEmptyString`, …) — never reimplement helpers.
7. **Do not commit** i18n catalogs (`locales/*.po`, `locales/generated/*`)
   and never include AI attribution in commit messages (no
   `@anthropic.com`, no "Generated with …" lines) — CI rejects both.
8. **Commands** (from repo root; details in 01-codebase-map.md §6):

   ```bash
   npx jest <file.spec.ts> --config=packages/<pkg>/jest.config.mjs   # one test file
   npx nx test <pkg>                                                  # package tests
   npx nx lint:diff-with-main <pkg>                                   # lint
   cd packages/<pkg> && npx tsgo -p tsconfig.json --noEmit             # typecheck (trust this over nx cache)
   npx nx build twenty-shared --skip-nx-cache                          # after touching twenty-shared
   npx nx run twenty-server:database:migrate:generate --name <n> --type fast|slow
   node packages/twenty-sdk/dist/cli.cjs app:publish --private && node packages/twenty-sdk/dist/cli.cjs app:install   # publish an app to a local server
   ```

   Gotchas: `twenty-shared/dist` is per-branch state — rebuild before
   trusting dependent typechecks/tests. Nx can serve a stale pass — verify
   fixes with in-package `tsgo`.

## 3. Quality gates (run before ticking ANY task)

Adapt to what the task touched; when in doubt run all:

- [ ] Unit tests for new/changed server services and front hooks/components
- [ ] Integration test added for server modules with DB behavior
- [ ] `npx nx lint:diff-with-main <pkg>` clean for touched packages
- [ ] In-package `npx tsgo -p tsconfig.json --noEmit` clean
- [ ] `twenty-shared` touched → rebuilt with `--skip-nx-cache`
- [ ] GraphQL schema changed → `npx nx run twenty-front:graphql:generate`
- [ ] Entity changed → migration generated + upgrade command (rules §2.4)
- [ ] UI: works light+dark, mobile-responsive, Lingui fr+en keys complete
- [ ] e2e updated/added for user-visible flows
- [ ] PLAN.md ticked + phase report appended (same commit)

## 4. Resume protocol (where did the last agent leave off?)

Determine state in this order, WITHOUT asking the user:

1. `PLAN.md` — find the phase containing `[~]` (in progress) or the first
   phase with unticked tasks. That is the current phase.
2. `docs/plan/phases/phase-<N>-report.md` — read the LAST dated entries:
   they say exactly what was finished, what remains, known issues.
3. `git status` + `git log --oneline -15` — uncommitted work exists?
   - Clean tree → continue from the first unticked task.
   - Dirty tree → read the diff, run the gates on it; either complete the
     half-done task (tick + report) or revert it (and say so in the
     report). Never pile new work on top of unexplained changes.
4. Trust the reports over your assumptions. If reality contradicts a
   report (tick without code, code without tick), fix the discrepancy and
   log it as "STATE REPAIR" in the phase report.

Then proceed with the kickoff protocol (§1) from the correct task.

## 5. Phase-report format (append, never rewrite)

File: `docs/plan/phases/phase-<N>-report.md` (create on first entry; N is
two digits, e.g. `phase-01-report.md`).

```markdown
## YYYY-MM-DD HH:MM UTC — <Agent>
**Task(s):** P<N>.<M> <task title> (PLAN.md lines if useful)
**Status:** done | partial (what remains) | blocked (blocker)
**What I did:** bullet list of changes w/ file paths
**Decisions & trade-offs:** any call made and why (spike outcomes here)
**Verification:** gates run + results (paste key output lines)
**For the next agent:** exact next step, gotchas, unresolved questions
```

Rules: entries are append-only; corrections get their own entry; keep it
factual and terse; no code dumps (reference file paths).

## 6. Anti-hallucination checklist (before you claim done)

- Every file path you mention exists (you opened it this session).
- Every API/SDK symbol you used was seen in real code (grep it; e.g.
  `defineObject`, `FieldType.FILES` — verified patterns live in
  `packages/twenty-apps/examples/media-notes/`).
- Every command you say passed, you actually ran this session.
- Every ticked task maps to code that exists in the diff.
- You did NOT touch: `locales/**` catalogs, committed upgrade commands,
  `twenty-docker` defaults, billing logic, auth guards semantics.

## 7. When stuck (in order)

1. Re-read the blueprint section for your phase + one real example in the
   codebase doing the same thing.
2. Write a "BLOCKED" entry in the phase report with the exact error/output
   and your analysis; leave the workspace clean.
3. Only then ask the user — with the smallest possible question.
