# A2E Suite README screenshots

These images replace the root README’s upstream product screenshots.
They show A2E’s existing interactive public-site preview, using its supplied
identity, native preview components, themes and fictional sample records.
They are browser captures, not generated interface illustrations.

## Capture record

- Captured on **2026-10-28** with Playwright Chromium, using the existing
  isolated static public-site preview build from that day.
- Source: [`PublicWorkspacePreview.tsx`](../../../packages/twenty-front/src/modules/public-site/PublicWorkspacePreview.tsx)
  and its [`preview` components](../../../packages/twenty-front/src/modules/public-site/preview/).
- Browser viewport: **1440 × 1100 CSS pixels**, device scale factor **2**,
  reduced motion enabled. Waited for document fonts to finish loading.
- Captured only the region labeled **Interactive example workspace**.
- `projects-light.png` / `projects-dark.png`: Bureau → Projects → Board,
  with the preview’s own light/dark control.
- `bureau.png`: Bureau → Pages, showing the sample team handbook.
- `bilan.png`: Bilan’s sample sales documents.
- `agenda.png`: Agenda’s sample week with events and a task deadline.

To refresh, render the current public site in an isolated local build or
open its public preview, then repeat the selections above and capture that
region at the same viewport and scale. Keep the sample-data footer visible.
Do not capture an authenticated customer workspace. Check both theme images
and the README’s collapsed/expanded gallery after replacing files.

These captures illustrate the public preview. They do not verify installed
applications, persisted records, payment connections or multi-user behavior.
No account, database or live customer records were used for capture.

## Rights

These screenshots contain A2E identity and presentation materials. See the
[A2E rights notice](../../../COPYRIGHT.md) for the reuse boundary and permission
contact. Source code and third-party components retain their applicable
licenses; the screenshots do not relicense those components.
