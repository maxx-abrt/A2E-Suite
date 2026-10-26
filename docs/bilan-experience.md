# Bilan: capture, review and connected books

[Documentation home](README.md) · [Application installation](applications.md)

## What this delivery changes

The host recognizes Bilan's existing native dashboard by its manifest identity.
Opening Bilan keeps the application's focused sidebar through tables and full
record pages. The Home shortcut opens that same dashboard. Its introductory
cards lead to invoices, quotes, transactions, budgets, financial plans, funding
applications, the book and the installed funding explorer. Missing or unreadable
objects do not become dead action links. Native dashboard charts, tabs and
customization remain underneath the overview, in the same scroll area.

This host change accompanies **a2e-accounting 0.1.9**. Build, publish and upgrade
the application as described in the installation guide; updating host source
alone does not update installed logic functions. No core database schema or
object identity changes are required by this delivery.

The dashboard includes a compact native transaction review table with personal
Missing details, Missing receipts, Uncategorized and All transactions filters.
Missing receipts exposes the existing attachment column. Add transaction opens
the installed quick-entry component; incomplete receipt captures remain outside
the cash book. An unconfigured financial profile links directly to its existing
native record. Upgrades rerun idempotent starter preparation, preserving real
settings and adding no demonstration financial transactions. See the
[Qonto comparison and remaining finance gaps](bilan-qonto-audit-2026-10-25.md).

## Upload an invoice

1. Choose **Upload invoice** on Bilan's dashboard and select a PDF or image.
2. Bilan creates a native **expense transaction** with its original filename,
   attaches the file through the native `receipts` Files field and opens the
   same transaction in the shared record side panel.
3. Review the description, amount, currency, actual payment date and category.
   A capture without a valid amount and date does not create a cash-book row.
4. Native transaction events synchronize the book after those details are
   present. The row retains its transaction relation and attachment filenames.
   Open the source transaction to view its protected Files field. Adding a
   receipt updates the existing source key rather than making another posting.

This capture does not infer an amount, payment or tax treatment from a file.
Sales invoices remain separate native records; their collected amount is posted
only in the existing paid/partially-paid flow. This is the app's cash-accounting
model, not an accrual accounting or bank-reconciliation implementation.

If attachment upload fails after capture, the same expense opens for recovery.
Add the attachment there instead of creating another expense. Account/workspace
checks stop a pending upload from attaching to or opening a record in a newly
selected workspace. A response lost after server persistence still requires
checking Transactions; this is not a general idempotent ingestion service.

The existing quick-entry command now uses native `createFinanceEntries`, accepts
reviewed gross EUR amounts and derives included VAT with Bilan's shared VAT
calculation. It offers a direct link to the created record and its receipts.

## Funding catalogue

The explorer reads workspace-owned native records in pages of 30 with **Load
more**, live/open-deadline filters, debounced search, stale-response guards and
an explicit retry state. It does not report a failed read as an empty catalogue.
Native record tables remain available for historical entries.

Refresh ingests the key-free curated schemes before external portals. Source
failures remain independent. Carenews reads have request deadlines;
Aides-territoires has request/overall deadlines, same-origin pagination checks
and rejects incomplete or looping traversals before retiring stored entries.
Its authenticated source still requires the application variable
`AIDES_TERRITOIRES_KEY`; configure `BILAN_SUBVENTION_SOURCES` to select sources.
See the [official API listing](https://www.data.gouv.fr/dataservices/api-aides-territoires).

A live read on 2026-10-23 normalized **20 Carenews items from its first page**.
That verifies the adapter against that response, not ingestion into a deployed
workspace. Stored catalogue rows, application installation and scheduled worker
execution still need verification on the target deployment.

## Language foundation

The interface starts in English until an explicit saved or URL language is
available. Twenty's existing member language setting and Lingui catalogs remain
the preference and translation systems. Saving a language must succeed before
the picker changes the interface or browser preference; failed saves are visible.
Late loads from a previous choice/account cannot override the current choice.
English is bundled as the fallback, including messages absent from another
language bundle. The new host messages include English and French catalogs.
Document language/direction and shared deadline labels follow the selected
language; Brazilian Portuguese uses its own date catalog.

This does not complete translations for every app-owned field, template,
dashboard title or SDK front component. Existing French metadata/content remains
French. New app UI should use the native SDK translation helpers and its locale
catalog pipeline; host UI uses Lingui. RTL document direction is initialized,
but a complete RTL layout and keyboard audit remains outstanding.

## Accounting release gates

These changes improve correctness; they are not legal certification:

- Imported numbered invoices keep their original number. Allocation and
  stamping are still separate writes, so crashes/concurrent replays require a
  transactional issuance design. French official guidance requires a unique,
  chronological, continuous sequence; see
  [invoice requirements](https://entreprendre.service-public.gouv.fr/vosdroits/F31808).
- Ledger writes/recovery reread period locks; source deletion preserves a
  closed-period row. These separate API reads/writes are not an atomic database
  invariant, nor protection against all direct record mutations.
- Before production accounting, verify handling of a payment represented both
  by invoice collections and a linked transaction, grant decisions versus cash
  receipts, multiple currencies, correction entries, exports and least-privilege
  finance roles. Existing independent automations do not settle those policies.
- Preservation, audit trails and electronic-invoicing obligations require a
  dedicated release review. Relevant official references include
  [Code de commerce L123-22](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006219327)
  and [electronic invoicing guidance](https://entreprendre.service-public.gouv.fr/vosdroits/F23208).

Acceptance still requires a scratch-workspace app upgrade, real upload-to-worker
journey, reload, role denials, simultaneous users, light/dark/mobile and keyboard
checks. A successful local build does not establish those runtime guarantees.
