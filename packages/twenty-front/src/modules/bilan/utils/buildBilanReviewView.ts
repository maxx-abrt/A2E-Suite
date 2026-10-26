import { type View } from '@/views/types/View';
import { type ViewFilter } from '@/views/types/ViewFilter';
import { ViewFilterOperand } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { ViewFilterGroupLogicalOperator } from '~/generated-metadata/graphql';
import { v5 as uuidv5 } from 'uuid';

export type BilanReviewScope = 'details' | 'receipts' | 'category' | 'all';

export const buildBilanReviewView = ({
  view,
  scope,
  readableFields,
}: {
  view: View;
  scope: BilanReviewScope;
  readableFields: { id: string; name: string }[];
}): View => {
  const groupId = uuidv5(`${view.id}:bilan-review:${scope}`, uuidv5.URL);
  const filters: ViewFilter[] = [];
  const addFilter = (
    name: string,
    operand = ViewFilterOperand.IS_EMPTY,
    value = '',
  ) => {
    const field = readableFields.find((candidate) => candidate.name === name);
    if (!isDefined(field)) return;
    filters.push({
      id: uuidv5(`${groupId}:${name}`, uuidv5.URL),
      viewId: view.id,
      fieldMetadataId: field.id,
      operand,
      value,
      viewFilterGroupId: groupId,
      positionInViewFilterGroup: filters.length,
    });
  };
  if (scope === 'details') {
    addFilter('label');
    addFilter('amount');
    addFilter('entryDate');
  }
  if (scope === 'receipts') {
    addFilter('entryType', ViewFilterOperand.IS, JSON.stringify(['EXPENSE']));
    addFilter('receipts');
  }
  if (scope === 'category') addFilter('category');
  const receiptsField = readableFields.find(
    (field) => field.name === 'receipts',
  );
  const reviewFields = view.viewFields.map((field) =>
    scope === 'receipts' && field.fieldMetadataId === receiptsField?.id
      ? { ...field, isVisible: true }
      : field,
  );
  if (
    scope === 'receipts' &&
    isDefined(receiptsField) &&
    !reviewFields.some((field) => field.fieldMetadataId === receiptsField.id)
  )
    reviewFields.push({
      id: uuidv5(`${view.id}:bilan-receipts-field`, uuidv5.URL),
      viewId: view.id,
      fieldMetadataId: receiptsField.id,
      position:
        Math.max(-1, ...reviewFields.map((field) => field.position)) + 1,
      isActive: true,
      isVisible: true,
      size: 180,
    });
  return {
    ...view,
    viewFields: reviewFields,
    viewFilters: filters,
    viewFilterGroups:
      filters.length === 0
        ? []
        : [
            {
              id: groupId,
              viewId: view.id,
              logicalOperator:
                scope === 'details'
                  ? ViewFilterGroupLogicalOperator.OR
                  : ViewFilterGroupLogicalOperator.AND,
            },
          ],
    anyFieldFilterValue: null,
    mainGroupByFieldMetadataId: null,
    viewGroups: [],
  };
};
