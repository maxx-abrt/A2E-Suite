# Bilan experience and shared language foundation

## 2026-10-23 07:31 UTC — Codex [executor]

**Task:** User-pinned connected-app/Bilan experience · **Slice:** native Bilan home, capture-to-book integration, catalogue resilience and shared language foundation · **Claim:** partial, implementation ready for runtime review.
**Changed:** Host Bilan overview/actions/native navigation, Home link, permission-gated pending widget, native page-layout intro slot; a2e-accounting 0.1.7 native quick-entry mutation, receipt propagation/booking guards, numbering and ledger recovery/locks, catalogue pagination and source safeguards; host locale persistence, English fallback and 28 English/French messages; shared locale validation.
**Verified so far:** Frontend 19 focused suites / 105 tests; Bilan 13 selected domain/handler files / 96 tests; shared locale tests 5/5. App SDK build 34 files; frontend production Vite build 26.58s; frontend/app typechecks passed. Live Carenews first-page adapter: 20 normalized items, HTTPS links.
**Verification notes:** Nx shared build stalled in unchanged barrel generation; its direct Vite/declaration/alias build completed uncached instead. Locale compilation initially touched all generated catalogs; only intended English/French changes were retained. Final lint/diff/docs checks are recorded below when complete.
**Missing for tick:** Installed-app upgrade, live browser/upload/worker/persistence/negative-permission checks, Aides-territoires key and deployed catalogue refresh. Full translations/RTL, atomic gap-free issuance and closed-period enforcement, reconciliation and accounting certification remain open.
**Do not redo:** No parallel backend, financial object, auth, ledger store or navigation registry was introduced. Native records, Files fields, app metadata and logic functions own writes.
**Next:** Run the release journeys in [the Bilan guide](../../bilan-experience.md) on a scratch workspace with both the host and app upgrade; do not mark accounting compliant from unit tests.

### Final verification

- **Host:** 108 distinct focused tests passed (19 regression suites / 105 tests, plus 3 navigation-hook tests); final affected subset 28/28. Direct frontend `tsgo` passed; type-aware lint passed on 34 changed source/test files. The final production Vite build passed.
- **Bilan:** 96 selected domain/handler tests passed; direct `tsc --noEmit` passed; touched-file lint passed without warnings. SDK `dev:build` passed again with 34 bundled files. Source package version is 0.1.7; no publish/install was attempted.
- **Shared:** locale regression tests 5/5, direct typecheck and lint passed; uncached direct Vite/declaration/alias build passed after the unrelated barrel-generator stall. Runtime package check rejects inherited locale names.
- **Translations:** semantic audit of both compiled catalogs: exactly 28 added keys, zero removed keys, zero existing translations changed. Other generated locale files have no diff.
- **Repository:** documentation checker passed (26 maintained documents / 228 links); `git diff --check` passed. No database reset, deployment, commit, secret-file edit or production data write was performed.
- **Runtime boundary:** localhost frontend probe returned no running app. Live browser, persisted upload/worker journey and target deployment verification remain unverified. Only the public Carenews adapter was exercised against a live source (20 first-page items).

The implementation is ready for review and deployment acceptance, with the accounting and multilingual limitations in the linked guide still open. PLAN.md was not changed.
