# Bilan product review — 2026-10-25

[Documentation home](README.md) · [Bilan experience](bilan-experience.md) ·
[Product audit](product-strategy-2026-10-24.md) · [Root plan](../PLAN.md)

## Product direction

Borrow Qonto’s clarity around collecting documents, reviewing outstanding work
and following money. A2E’s advantage to build is the context behind the money:
a client request, a project, a funding application and the supporting evidence
in the same permission-aware workspace. This is a product direction to validate,
not a claim of competitive superiority or demonstrated customer demand.

Qonto is also an account/payment platform. Bilan currently models user-recorded
finances and cash-book automation. An attractive dashboard cannot supply bank
balances, reconciliation, payment execution or reliable forecasting by itself.

## Competitor evidence

Primary product/help pages reviewed on the date above:

| Qonto pattern | Useful implication for Bilan |
| --- | --- |
| A supplier-invoice inbox leaves only items requiring attention after matching/payment; missing details, due dates and duplicates are practical filters | Prioritize a clear review queue and actionable records. See [supplier invoices](https://support-it.qonto.com/hc/en-us/articles/23949920163473-How-does-the-Supplier-invoices-section-work). |
| Receipt capture combines imports, extraction and transaction matching, with manual recovery for unmatched documents | Separate file capture, extraction suggestions, review and reconciliation states. See [receipt processing](https://support-de.qonto.com/hc/en-us/articles/23949228399505-How-to-automate-the-import-and-matching-of-invoices-and-receipts-and-keep-them-organized-in-Qonto). |
| Dashboard views distinguish balances, inflows/outflows, invoices to collect/pay, periods and accounts; preferences belong to each member/organization | Use explicit data origins, periods and currency boundaries. Retain personal focus without changing shared views. See [dashboard basics](https://support-fr.qonto.com/hc/en-us/articles/23947593373585-What-are-the-basics-for-managing-my-dashboard). |
| Expense capture and approval form a connected process, while cash-flow tools project upcoming money | Finish an auditable workflow rather than displaying isolated totals. See [finance management](https://qonto.com/en/finance-management). |

These are capability observations, not pricing, speed or financial/legal advice.

## Code-backed gaps and priority

| Priority | Observed foundation | Missing outcome / next implementation | Root-plan home |
| --- | --- | --- | --- |
| 1 | `financeEntry` has amount, date, category and native receipts; the host captures a document | Review incomplete captures and upload receipts in context; distinguish incomplete data from a failed load | P1.6, M13, P10 |
| 2 | Post-install seeds categories, a financial profile, template sheets and fiches using idempotent helpers | Upgrades must also backfill missing defaults without replacing real settings or injecting demonstration transactions | P1.6, M9, C1/C2 |
| 3 | Invoices hold total/collected amounts and an existing partial-payment cash-book flow | A reviewed invoice lifecycle with remaining amount, due-date attention and issuance/replay acceptance | P1.6, C5/C6 |
| 4 | Cash-book rows keep native source relations; CSV **export** has unit coverage | Bank statement import with preview, duplicate detection, account/currency mapping, persisted import batches and recovery; bank feeds require a real connector | P1.6, C5/C6 |
| 5 | Receipts are protected Files fields; capture deliberately extracts no amount | OCR suggestions with confidence/provenance and user review, followed by receipt-to-transaction matching; never silently post an inferred payment | P1.6, M10, P9 |
| 6 | Native roles/workflows exist; a fiche can have an APPROVED status | Actual expense approval requests with approver scope, immutable review evidence and authorization checks. A status field alone is insufficient | P1.6, P7/P8, C6 |
| 7 | Dashboard widgets sum recorded currency fields; budgets have rollups | Verified period/account/currency-aware cash summaries and dated forecasts with assumptions; distinguish recorded cash from synchronized bank data | P1.6, M11, P7 |
| 8 | Invoice relations cover CRM client/opportunity and source quotes; finance entries relate to funding applications | Source continuity from project/task/evidence to finance without duplicating objects; universal linking remains a separate lifecycle decision | M8d, M11, P4/P7 |

Source entry points: [host Bilan](../packages/twenty-front/src/modules/bilan/),
[finance transaction object](../packages/twenty-apps/internal/a2e-accounting/src/objects/finance-entry.object.ts),
[invoice object](../packages/twenty-apps/internal/a2e-accounting/src/objects/invoice.object.ts),
[financial profile](../packages/twenty-apps/internal/a2e-accounting/src/objects/org-profile.object.ts),
[starter seeding](../packages/twenty-apps/internal/a2e-accounting/src/logic-functions/handlers/seed-starter-content.ts),
[cash-book helpers](../packages/twenty-apps/internal/a2e-accounting/src/lib/ledger.ts)
and [native dashboard](../packages/twenty-apps/internal/a2e-accounting/src/page-layouts/dashboard.page-layout.ts).
No dedicated bank account/feed, statement import, transaction reconciliation,
OCR extraction or expense-approval domain was found in the accounting app’s
objects/helpers. The release gates in the Bilan guide still apply.

## Implemented in this increment

- A transaction review table on the existing Bilan dashboard: Missing details
  (description, amount or payment date), Missing receipts (expenses only),
  Uncategorized and All transactions. It reuses the native table, record
  updates, object/field permissions and saved layout. Its personal filter
  choice is kept per workspace object/member.
- Receipt review exposes the existing native Files column so uploading a receipt
  does not require another transaction or a separate custom document system.
  The embedded review table disables blank creation; Add transaction opens the
  existing installed Bilan quick-entry component, and Upload invoice is kept.
- Empty Files filtering includes both SQL null and empty arrays. Currency
  matching accepts incomplete composite values. Live server event matching
  handles ORM Date objects and Files fields.
- Bilan 0.1.9 reruns the idempotent post-install preparation on version upgrades.
  Categories, profile defaults and starter templates are backfilled; existing
  helper behavior preserves the user’s financial profile. No sample invoices,
  expenses, payments or artificial balance are added by this increment.
- An organization setup prompt opens the existing seeded financial profile;
  configured organizations keep their own name. Permission and load failures
  retain the native access rules and a retry path.
- Standalone Bilan layout links use the native standalone-layout query, rather
  than the record-page-only metadata selector. Add transaction references the
  installed front component identifier, with a cross-package drift guard.
- Self-contained Bureau, Projects and Bilan templates no longer request the
  privileged applications catalogue. Document template copies use the native
  `last` position value. Native and AI chat queries have distinct schema names.

Validation and deployment limits are recorded in the dated phase report. This
increment does not implement bank connectivity, payment execution, OCR,
reconciliation, approval workflows or accounting certification.
