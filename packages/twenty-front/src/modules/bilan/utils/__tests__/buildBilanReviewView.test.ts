import {
  buildBilanReviewView,
  type BilanReviewScope,
} from '@/bilan/utils/buildBilanReviewView';
import { type View } from '@/views/types/View';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { mapViewFiltersToFilters } from '@/views/utils/mapViewFiltersToFilters';
import { mapViewFilterGroupsToRecordFilterGroups } from '@/views/utils/mapViewFilterGroupsToRecordFilterGroups';
import { isRecordMatchingFilter } from '@/object-record/record-filter/utils/isRecordMatchingFilter';
import { computeRecordGqlOperationFilter } from 'twenty-shared/utils';
import { FieldMetadataType } from 'twenty-shared/types';

const fields = [
  {
    id: 'label',
    name: 'label',
    label: 'Description',
    type: FieldMetadataType.TEXT,
  },
  {
    id: 'amount',
    name: 'amount',
    label: 'Amount',
    type: FieldMetadataType.CURRENCY,
  },
  {
    id: 'entryDate',
    name: 'entryDate',
    label: 'Date',
    type: FieldMetadataType.DATE_TIME,
  },
  {
    id: 'entryType',
    name: 'entryType',
    label: 'Type',
    type: FieldMetadataType.SELECT,
  },
  {
    id: 'receipts',
    name: 'receipts',
    label: 'Receipts',
    type: FieldMetadataType.FILES,
  },
  {
    id: 'category',
    name: 'category',
    label: 'Category',
    type: FieldMetadataType.RELATION,
  },
] as FieldMetadataItem[];
const view = {
  id: 'finance-view',
  viewFields: [],
  viewFilters: [],
  viewFilterGroups: [],
  viewSorts: [],
} as unknown as View;
const objectMetadataItem = {
  nameSingular: 'financeEntry',
  fields,
} as EnrichedObjectMetadataItem;
const review = (scope: BilanReviewScope, readableFields = fields) =>
  buildBilanReviewView({ view, scope, readableFields });
const matches = (scope: BilanReviewScope, record: Record<string, unknown>) => {
  const selectedView = review(scope);
  return isRecordMatchingFilter({
    record: {
      label: 'Transport',
      amount: { amountMicros: 25000000, currencyCode: 'EUR' },
      entryDate: '2026-10-25T12:00:00Z',
      entryType: 'EXPENSE',
      categoryId: 'transport',
      receipts: [{ fileId: 'receipt' }],
      deletedAt: null,
      ...record,
    },
    filter: computeRecordGqlOperationFilter({
      fieldMetadataItems: fields,
      recordFilters: mapViewFiltersToFilters(selectedView.viewFilters, fields),
      recordFilterGroups: mapViewFilterGroupsToRecordFilterGroups(
        selectedView.viewFilterGroups ?? [],
      ),
      filterValueDependencies: { timeZone: 'Europe/Paris' },
    }),
    objectMetadataItem,
    objectMetadataItems: [objectMetadataItem],
  });
};

describe('Bilan native transaction review', () => {
  it.each([
    [{ amount: null }, true],
    [{ amount: { amountMicros: null, currencyCode: 'EUR' } }, true],
    [{ entryDate: null }, true],
    [{ label: '' }, true],
    [{}, false],
    [{ amount: { amountMicros: 0, currencyCode: 'EUR' } }, false],
  ])('finds missing capture details (%j)', (record, expected) => {
    expect(matches('details', record)).toBe(expected);
  });
  it.each([
    [{ receipts: null }, true],
    [{ receipts: [] }, true],
    [{ receipts: [{ fileId: 'receipt' }] }, false],
    [{ receipts: [], entryType: 'INCOME' }, false],
  ])('requests receipts for expenses only (%j)', (record, expected) => {
    expect(matches('receipts', record)).toBe(expected);
  });
  it('finds uncategorized records through the native relation filter', () => {
    expect(matches('category', { categoryId: null })).toBe(true);
    expect(matches('category', { categoryId: 'transport' })).toBe(false);
  });
  it('exposes the readable Files column in the receipt queue without changing the saved layout', () => {
    expect(review('receipts').viewFields).toEqual([
      expect.objectContaining({ fieldMetadataId: 'receipts', isVisible: true }),
    ]);
    expect(view.viewFields).toEqual([]);
    expect(
      review(
        'receipts',
        fields.filter((field) => field.name !== 'receipts'),
      ).viewFields,
    ).toEqual([]);
  });
  it('does not keep hidden saved filters in the all-transactions view', () => {
    expect(
      matches('all', { receipts: [], amount: null, categoryId: null }),
    ).toBe(true);
  });
});
