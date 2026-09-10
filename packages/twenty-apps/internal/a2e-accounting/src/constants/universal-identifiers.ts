// Universal identifiers for Bilan.
//
// Every declarable thing gets ONE identifier, committed forever (additive-only
// law). They follow a deterministic namespace so a reviewer can read them:
//
//   b11a{OO}00-{KK}00-4000-8000-0000000000{NN}
//          ^^     ^^                       ^^
//          |      |                        entity index inside the family
//          |      family: 0000 object · 0001 own field · 0002 relation field
//          |              0003 view · 0004 view field · 0005 select option
//          |              0008 page layout · 0009 tab · 000a widget · 000b index
//          object index (01 invoice … 0e aiCacheEntry, 00 = app-level)
//
// App-level families use OO = 00: 0010 nav item · 0011 command menu item ·
// 0012 logic function · 0013 front component · 0014 standalone page layout ·
// 0015 permission flag.
//
// Relation identifiers live here rather than in the object files so the objects
// never import each other: a relation is declared on both sides, and circular
// module imports would resolve to undefined at manifest build time.

export const OBJECT_IDS = {
  invoice: 'b11a0100-0000-4000-8000-000000000000',
  invoiceLine: 'b11a0200-0000-4000-8000-000000000000',
  quote: 'b11a0300-0000-4000-8000-000000000000',
  financeEntry: 'b11a0400-0000-4000-8000-000000000000',
  financeCategory: 'b11a0500-0000-4000-8000-000000000000',
  budget: 'b11a0600-0000-4000-8000-000000000000',
  bookSheet: 'b11a0700-0000-4000-8000-000000000000',
  bookEntry: 'b11a0800-0000-4000-8000-000000000000',
  fiche: 'b11a0900-0000-4000-8000-000000000000',
  orgProfile: 'b11a0a00-0000-4000-8000-000000000000',
  subvention: 'b11a0b00-0000-4000-8000-000000000000',
  savedSubvention: 'b11a0c00-0000-4000-8000-000000000000',
  subventionSource: 'b11a0d00-0000-4000-8000-000000000000',
  aiCacheEntry: 'b11a0e00-0000-4000-8000-000000000000',
} as const;

// Both sides of every relation, grouped by the record that owns the foreign key.
export const RELATION_IDS = {
  invoiceClient: 'b11a0100-0002-4000-8000-000000000001',
  companyInvoices: 'b11a0100-0002-4000-8000-000000000002',
  invoiceOpportunity: 'b11a0100-0002-4000-8000-000000000003',
  opportunityInvoices: 'b11a0100-0002-4000-8000-000000000004',
  invoiceLines: 'b11a0100-0002-4000-8000-000000000005',
  invoiceFinanceEntries: 'b11a0100-0002-4000-8000-000000000006',
  invoiceLedgerEntries: 'b11a0100-0002-4000-8000-000000000007',
  invoiceSourceQuotes: 'b11a0100-0002-4000-8000-000000000008',

  invoiceLineInvoice: 'b11a0200-0002-4000-8000-000000000001',
  invoiceLineQuote: 'b11a0200-0002-4000-8000-000000000002',

  quoteClient: 'b11a0300-0002-4000-8000-000000000001',
  companyQuotes: 'b11a0300-0002-4000-8000-000000000002',
  quoteLines: 'b11a0300-0002-4000-8000-000000000003',
  quoteConvertedInvoice: 'b11a0300-0002-4000-8000-000000000004',

  financeEntryCategory: 'b11a0400-0002-4000-8000-000000000001',
  financeCategoryEntries: 'b11a0400-0002-4000-8000-000000000002',
  financeEntryInvoice: 'b11a0400-0002-4000-8000-000000000003',
  financeEntrySavedSubvention: 'b11a0400-0002-4000-8000-000000000004',
  savedSubventionFinanceEntries: 'b11a0400-0002-4000-8000-000000000005',
  financeEntryLedgerEntries: 'b11a0400-0002-4000-8000-000000000006',

  budgetCategory: 'b11a0600-0002-4000-8000-000000000001',
  financeCategoryBudgets: 'b11a0600-0002-4000-8000-000000000002',

  bookSheetEntries: 'b11a0700-0002-4000-8000-000000000001',

  bookEntrySheet: 'b11a0800-0002-4000-8000-000000000001',
  bookEntryFinanceEntry: 'b11a0800-0002-4000-8000-000000000002',
  bookEntryInvoice: 'b11a0800-0002-4000-8000-000000000003',

  ficheSavedSubvention: 'b11a0900-0002-4000-8000-000000000001',
  savedSubventionFiches: 'b11a0900-0002-4000-8000-000000000002',

  savedSubventionSubvention: 'b11a0c00-0002-4000-8000-000000000001',
  subventionSavedRecords: 'b11a0c00-0002-4000-8000-000000000002',
} as const;

export const LABEL_IDENTIFIER_IDS = {
  invoiceNumber: 'b11a0100-0001-4000-8000-000000000001',
  invoiceLineLabel: 'b11a0200-0001-4000-8000-000000000001',
  quoteNumber: 'b11a0300-0001-4000-8000-000000000001',
  financeEntryLabel: 'b11a0400-0001-4000-8000-000000000001',
  financeCategoryName: 'b11a0500-0001-4000-8000-000000000001',
  budgetName: 'b11a0600-0001-4000-8000-000000000001',
  bookSheetName: 'b11a0700-0001-4000-8000-000000000001',
  bookEntryLabel: 'b11a0800-0001-4000-8000-000000000001',
  ficheTitle: 'b11a0900-0001-4000-8000-000000000001',
  orgProfileLegalName: 'b11a0a00-0001-4000-8000-000000000001',
  subventionTitle: 'b11a0b00-0001-4000-8000-000000000001',
  savedSubventionName: 'b11a0c00-0001-4000-8000-000000000001',
  subventionSourceName: 'b11a0d00-0001-4000-8000-000000000001',
  aiCacheEntryKey: 'b11a0e00-0001-4000-8000-000000000001',
} as const;

export const LOGIC_FUNCTION_IDS = {
  postInstall: 'b11a0000-0012-4000-8000-000000000001',
  syncFinanceEntryToLedger: 'b11a0000-0012-4000-8000-000000000002',
  syncInvoiceToLedger: 'b11a0000-0012-4000-8000-000000000003',
  sweepOverdueInvoices: 'b11a0000-0012-4000-8000-000000000004',
  generateRecurringDocuments: 'b11a0000-0012-4000-8000-000000000005',
  rollupBudgets: 'b11a0000-0012-4000-8000-000000000006',
  refreshSubventions: 'b11a0000-0012-4000-8000-000000000007',
  grantSubventionIncome: 'b11a0000-0012-4000-8000-000000000008',
  refreshSubventionsNow: 'b11a0000-0012-4000-8000-000000000009',
  scoreSubventions: 'b11a0000-0012-4000-8000-00000000000a',
  renderFiche: 'b11a0000-0012-4000-8000-00000000000b',
} as const;

export const FRONT_COMPONENT_IDS = {
  dashboard: 'b11a0000-0013-4000-8000-000000000001',
  invoiceBuilder: 'b11a0000-0013-4000-8000-000000000002',
  ficheEditor: 'b11a0000-0013-4000-8000-000000000003',
  subventionExplorer: 'b11a0000-0013-4000-8000-000000000004',
  cerfaHelper: 'b11a0000-0013-4000-8000-000000000005',
  quickEntry: 'b11a0000-0013-4000-8000-000000000006',
} as const;

export const COMMAND_MENU_ITEM_IDS = {
  openDashboard: 'b11a0000-0011-4000-8000-000000000001',
  quickEntry: 'b11a0000-0011-4000-8000-000000000002',
  buildInvoice: 'b11a0000-0011-4000-8000-000000000003',
  editFiche: 'b11a0000-0011-4000-8000-000000000004',
  findSubventions: 'b11a0000-0011-4000-8000-000000000005',
  fillCerfa: 'b11a0000-0011-4000-8000-000000000006',
} as const;

export const PAGE_LAYOUT_IDS = {
  dashboard: 'b11a0000-0014-4000-8000-000000000001',
  dashboardTabOverview: 'b11a0000-0009-4000-8000-000000000001',
  dashboardTabTools: 'b11a0000-0009-4000-8000-000000000002',
  subventionExplorer: 'b11a0000-0014-4000-8000-000000000002',
  subventionExplorerTab: 'b11a0000-0009-4000-8000-000000000003',
} as const;

export const NAVIGATION_MENU_ITEM_IDS = {
  folder: 'b11a0000-0010-4000-8000-000000000001',
  dashboard: 'b11a0000-0010-4000-8000-000000000002',
  invoices: 'b11a0000-0010-4000-8000-000000000003',
  quotes: 'b11a0000-0010-4000-8000-000000000004',
  financeEntries: 'b11a0000-0010-4000-8000-000000000005',
  book: 'b11a0000-0010-4000-8000-000000000006',
  budgets: 'b11a0000-0010-4000-8000-000000000007',
  fiches: 'b11a0000-0010-4000-8000-000000000008',
  subventions: 'b11a0000-0010-4000-8000-000000000009',
  savedSubventions: 'b11a0000-0010-4000-8000-00000000000a',
  categories: 'b11a0000-0010-4000-8000-00000000000b',
  orgProfile: 'b11a0000-0010-4000-8000-00000000000c',
  sources: 'b11a0000-0010-4000-8000-00000000000d',
  books: 'b11a0000-0010-4000-8000-00000000000e',
  explorer: 'b11a0000-0010-4000-8000-00000000000f',
} as const;

export const PERMISSION_FLAG_IDS = {
  manageFinanceSettings: 'b11a0000-0015-4000-8000-000000000001',
} as const;

// One list view per object the user actually navigates to. Family 0003.
export const VIEW_IDS = {
  invoices: 'b11a0100-0003-4000-8000-000000000001',
  quotes: 'b11a0300-0003-4000-8000-000000000001',
  financeEntries: 'b11a0400-0003-4000-8000-000000000001',
  financeCategories: 'b11a0500-0003-4000-8000-000000000001',
  budgets: 'b11a0600-0003-4000-8000-000000000001',
  bookSheets: 'b11a0700-0003-4000-8000-000000000001',
  bookEntries: 'b11a0800-0003-4000-8000-000000000001',
  fiches: 'b11a0900-0003-4000-8000-000000000001',
  orgProfiles: 'b11a0a00-0003-4000-8000-000000000001',
  subventions: 'b11a0b00-0003-4000-8000-000000000001',
  savedSubventions: 'b11a0c00-0003-4000-8000-000000000001',
  subventionSources: 'b11a0d00-0003-4000-8000-000000000001',
} as const;

// View fields are positional, so their identifiers are derived rather than
// listed: `objectIndex` keeps them inside the object's namespace, `viewIndex`
// leaves room for a second view on the same object later.
export const viewFieldId = (
  objectIndex: string,
  viewIndex: number,
  position: number,
): string =>
  `b11a${objectIndex}00-0004-4000-8000-${viewIndex
    .toString(16)
    .padStart(2, '0')}${position.toString(16).padStart(10, '0')}`;
