# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Editor capability checks:** the document/note rich-text body is twenty-front's shared BlockNote schema at `packages/twenty-front/src/modules/blocknote-editor/blocks/Schema.ts` (defaultBlockSpecs + custom `callout`/`file` + inline `mention`) — NOT the TipTap `advanced-text-editor` (that one serves forms/AI/email). Any "new editor block" question starts there.
- **Advanced BlockNote adds are license-gated:** `@blocknote/{core,react,mantine}` are MPL-2.0, but `@blocknote/xl-docx-exporter`, `xl-pdf-exporter` and transitive `xl-multi-column` are "GPL-3.0 OR PROPRIETARY" already shipped in `twenty-front` (root AGPL-3.0). Check D07 before wiring more XL packages.

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
