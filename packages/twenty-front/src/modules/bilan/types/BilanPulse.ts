export type BilanMoneyValue = {
  amountMicros?: number | string | null;
  currencyCode?: string | null;
} | null;

export type BilanBookEntryRecord = {
  id: string;
  label?: string | null;
  entryDate?: string | null;
  entryType?: string | null;
  amount?: BilanMoneyValue;
  sourceKind?: string | null;
};

export type BilanFinanceEntryRecord = {
  id: string;
  label?: string | null;
  entryDate?: string | null;
  entryType?: string | null;
  amount?: BilanMoneyValue;
  category?: {
    id: string;
    name?: string | null;
  } | null;
};

export type BilanInvoiceRecord = {
  id: string;
  number?: string | null;
  clientName?: string | null;
  status?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  paidDate?: string | null;
  amountTotal?: BilanMoneyValue;
  amountPaid?: BilanMoneyValue;
};

export type BilanBudgetRecord = {
  id: string;
  name?: string | null;
  amount?: BilanMoneyValue;
  spentAmount?: BilanMoneyValue;
  spentPercent?: number | null;
  alertLevel?: string | null;
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  lastRollupAt?: string | null;
};

export type BilanSavedSubventionRecord = {
  id: string;
  name?: string | null;
  status?: string | null;
  deadline?: string | null;
  amountRequested?: BilanMoneyValue;
  amountGranted?: BilanMoneyValue;
};

export type BilanPulseMonth = {
  key: string;
  monthStart: string;
  incomeMicros: number;
  expenseMicros: number;
  netMicros: number;
};

export type BilanCashFlowSummary = {
  currencyCode: string;
  months: BilanPulseMonth[];
  currentMonthIncomeMicros: number;
  currentMonthExpenseMicros: number;
  currentMonthNetMicros: number;
  previousMonthNetMicros: number;
  entryCount: number;
};

export type BilanOpenInvoice = {
  id: string;
  number: string | null;
  clientName: string | null;
  status: string | null;
  dueDate: string | null;
  outstandingMicros: number;
  isOverdue: boolean;
};

export type BilanReceivablesSummary = {
  currencyCode: string;
  openCount: number;
  openTotalMicros: number;
  openPaidMicros: number;
  openOutstandingMicros: number;
  overdueCount: number;
  overdueOutstandingMicros: number;
  dueLaterOutstandingMicros: number;
  paidThisMonthMicros: number;
  billedThisMonthMicros: number;
  openInvoices: BilanOpenInvoice[];
};

export type BilanSpendingCategory = {
  id: string;
  name: string | null;
  amountMicros: number;
  entryCount: number;
};

export type BilanSpendingSummary = {
  currencyCode: string;
  currentMonthExpenseMicros: number;
  previousMonthExpenseMicros: number;
  uncategorizedMicros: number;
  uncategorizedCount: number;
  expenseCount: number;
  categories: BilanSpendingCategory[];
};

export type BilanBudgetRow = {
  id: string;
  name: string | null;
  budgetMicros: number;
  spentMicros: number;
  consumedPercent: number;
  alertLevel: string | null;
};

export type BilanBudgetsSummary = {
  currencyCode: string;
  totalBudgetMicros: number;
  totalSpentMicros: number;
  consumedPercent: number;
  overBudgetCount: number;
  warningCount: number;
  onTrackCount: number;
  lastRollupAt: string | null;
  rows: BilanBudgetRow[];
};

export type BilanFundingStage = {
  status: string;
  count: number;
  requestedMicros: number;
};

export type BilanFundingDeadline = {
  id: string;
  name: string | null;
  status: string | null;
  deadline: string | null;
  requestedMicros: number;
  isOverdue: boolean;
};

export type BilanFundingSummary = {
  currencyCode: string;
  activeCount: number;
  activeRequestedMicros: number;
  activeGrantedMicros: number;
  nextDeadline: string | null;
  stages: BilanFundingStage[];
  deadlines: BilanFundingDeadline[];
};
