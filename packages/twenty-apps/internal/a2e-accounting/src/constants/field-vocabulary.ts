import { FieldType, RelationType } from 'twenty-sdk/define';

// Shared field vocabulary. Options are DATA, so the same select renders the same
// colors and labels on an invoice, a quote and a ledger row — and a new surface
// never invents a second wording for the same concept.

export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;

export const QUOTE_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REFUSED: 'REFUSED',
  EXPIRED: 'EXPIRED',
  CONVERTED: 'CONVERTED',
} as const;

export const TAX_MODE = {
  EXCLUSIVE: 'EXCLUSIVE',
  INCLUSIVE: 'INCLUSIVE',
  EXEMPT: 'EXEMPT',
  REVERSE_CHARGE: 'REVERSE_CHARGE',
} as const;

export const RECURRENCE = {
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
} as const;

export const ENTRY_TYPE = { EXPENSE: 'EXPENSE', INCOME: 'INCOME' } as const;

export const PAYMENT_METHOD = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  CARD: 'CARD',
  CASH: 'CASH',
  CHECK: 'CHECK',
  DIRECT_DEBIT: 'DIRECT_DEBIT',
  OTHER: 'OTHER',
} as const;

export const LEDGER_SOURCE_KIND = {
  FINANCE_ENTRY: 'FINANCE_ENTRY',
  INVOICE: 'INVOICE',
  SUBVENTION: 'SUBVENTION',
  MANUAL: 'MANUAL',
} as const;

export const SAVED_SUBVENTION_STATUS = {
  SHORTLISTED: 'SHORTLISTED',
  PREPARING: 'PREPARING',
  SUBMITTED: 'SUBMITTED',
  GRANTED: 'GRANTED',
  REJECTED: 'REJECTED',
  ABANDONED: 'ABANDONED',
} as const;

// Matches twenty-shared TagColor, which the SDK keeps un-exported: typing the
// union here keeps option literals assignable to FieldMetadataComplexOption.
type OptionColor =
  | 'red'
  | 'ruby'
  | 'crimson'
  | 'tomato'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'grass'
  | 'green'
  | 'jade'
  | 'mint'
  | 'turquoise'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'iris'
  | 'violet'
  | 'purple'
  | 'plum'
  | 'pink'
  | 'bronze'
  | 'gold'
  | 'brown'
  | 'gray';

const option = (
  suffix: string,
  value: string,
  label: string,
  position: number,
  color: OptionColor,
  objectIndex: string,
) => ({
  id: `b11a${objectIndex}00-0005-4000-8000-0000000000${suffix}`,
  value,
  label,
  position,
  color,
});

export const invoiceStatusOptions = [
  option('01', INVOICE_STATUS.DRAFT, 'Brouillon', 0, 'gray', '01'),
  option('02', INVOICE_STATUS.SENT, 'Envoyée', 1, 'blue', '01'),
  option(
    '03',
    INVOICE_STATUS.PARTIALLY_PAID,
    'Partiellement payée',
    2,
    'yellow',
    '01',
  ),
  option('04', INVOICE_STATUS.PAID, 'Payée', 3, 'green', '01'),
  option('05', INVOICE_STATUS.OVERDUE, 'En retard', 4, 'red', '01'),
  option('06', INVOICE_STATUS.CANCELLED, 'Annulée', 5, 'gray', '01'),
];

export const quoteStatusOptions = [
  option('01', QUOTE_STATUS.DRAFT, 'Brouillon', 0, 'gray', '03'),
  option('02', QUOTE_STATUS.SENT, 'Envoyé', 1, 'blue', '03'),
  option('03', QUOTE_STATUS.ACCEPTED, 'Accepté', 2, 'green', '03'),
  option('04', QUOTE_STATUS.REFUSED, 'Refusé', 3, 'red', '03'),
  option('05', QUOTE_STATUS.EXPIRED, 'Expiré', 4, 'orange', '03'),
  option(
    '06',
    QUOTE_STATUS.CONVERTED,
    'Transformé en facture',
    5,
    'purple',
    '03',
  ),
];

export const taxModeOptions = (objectIndex: string) => [
  option('11', TAX_MODE.EXCLUSIVE, 'HT — TVA en sus', 0, 'blue', objectIndex),
  option(
    '12',
    TAX_MODE.INCLUSIVE,
    'TTC — TVA incluse',
    1,
    'purple',
    objectIndex,
  ),
  option(
    '13',
    TAX_MODE.EXEMPT,
    'Exonéré (art. 261-7 CGI)',
    2,
    'gray',
    objectIndex,
  ),
  option(
    '14',
    TAX_MODE.REVERSE_CHARGE,
    'Autoliquidation (art. 283-2 CGI)',
    3,
    'orange',
    objectIndex,
  ),
];

export const recurrenceOptions = (objectIndex: string) => [
  option('21', RECURRENCE.WEEKLY, 'Hebdomadaire', 0, 'sky', objectIndex),
  option('22', RECURRENCE.MONTHLY, 'Mensuelle', 1, 'blue', objectIndex),
  option('23', RECURRENCE.QUARTERLY, 'Trimestrielle', 2, 'purple', objectIndex),
  option('24', RECURRENCE.YEARLY, 'Annuelle', 3, 'green', objectIndex),
];

export const entryTypeOptions = (objectIndex: string) => [
  option('31', ENTRY_TYPE.EXPENSE, 'Dépense', 0, 'red', objectIndex),
  option('32', ENTRY_TYPE.INCOME, 'Recette', 1, 'green', objectIndex),
];

export const paymentMethodOptions = (objectIndex: string) => [
  option(
    '41',
    PAYMENT_METHOD.BANK_TRANSFER,
    'Virement',
    0,
    'blue',
    objectIndex,
  ),
  option('42', PAYMENT_METHOD.CARD, 'Carte bancaire', 1, 'purple', objectIndex),
  option('43', PAYMENT_METHOD.CASH, 'Espèces', 2, 'green', objectIndex),
  option('44', PAYMENT_METHOD.CHECK, 'Chèque', 3, 'orange', objectIndex),
  option(
    '45',
    PAYMENT_METHOD.DIRECT_DEBIT,
    'Prélèvement',
    4,
    'sky',
    objectIndex,
  ),
  option('46', PAYMENT_METHOD.OTHER, 'Autre', 5, 'gray', objectIndex),
];

export const oneToMany = {
  relationType: RelationType.ONE_TO_MANY,
} as const;

export const manyToOne = (joinColumnName: string) =>
  ({ relationType: RelationType.MANY_TO_ONE, joinColumnName }) as const;

export const RELATION = FieldType.RELATION;
