import { type BureauTaskScope } from '@/bureau/types/BureauTaskScope';
import { type View } from '@/views/types/View';
import { type ViewFilter } from '@/views/types/ViewFilter';
import { type ViewFilterGroup } from '@/views/types/ViewFilterGroup';
import { type Temporal } from 'temporal-polyfill';
import { ViewFilterOperand } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import {
  ViewFilterGroupLogicalOperator,
  ViewSortDirection,
} from '~/generated-metadata/graphql';
import { v5 as uuidv5 } from 'uuid';

type BuildBureauTaskFocusViewParams = {
  view: View;
  scope: BureauTaskScope;
  readableFields: { id: string; name: string }[];
  workspaceMemberId?: string;
  today: Temporal.ZonedDateTime;
  showCompleted: boolean;
};

export const buildBureauTaskFocusView = ({
  view,
  scope,
  readableFields,
  workspaceMemberId,
  today,
  showCompleted,
}: BuildBureauTaskFocusViewParams): View => {
  if (scope === 'view') return view;
  const identifier = (key: string) =>
    uuidv5(`${view.id}:bureau-focus:${key}`, uuidv5.URL);
  const rootId = identifier('root');
  const filters: ViewFilter[] = [];
  const groups: ViewFilterGroup[] = [
    {
      id: rootId,
      viewId: view.id,
      logicalOperator: ViewFilterGroupLogicalOperator.AND,
    },
  ];
  const addGroup = (
    key: string,
    logicalOperator: ViewFilterGroupLogicalOperator,
    parentViewFilterGroupId = rootId,
  ) => {
    const id = identifier(key);
    groups.push({
      id,
      viewId: view.id,
      logicalOperator,
      parentViewFilterGroupId,
      positionInViewFilterGroup: groups.length,
    });
    return id;
  };
  const addFilter = (
    fieldName: string,
    operand: ViewFilterOperand,
    value = '',
    groupId = rootId,
  ) => {
    const field = readableFields.find(
      (candidate) => candidate.name === fieldName,
    );
    if (!isDefined(field)) return;
    filters.push({
      id: identifier(`${fieldName}:${operand}:${filters.length}`),
      viewId: view.id,
      fieldMetadataId: field.id,
      operand,
      value,
      viewFilterGroupId: groupId,
      positionInViewFilterGroup: filters.length,
    });
  };

  if (scope !== 'all' && isDefined(workspaceMemberId)) {
    addFilter(
      'assignee',
      ViewFilterOperand.IS,
      JSON.stringify({
        selectedRecordIds: [],
        isCurrentWorkspaceMemberSelected: true,
      }),
    );
  }
  if (scope === 'today')
    addFilter('dueAt', ViewFilterOperand.IS, today.toPlainDate().toString());
  if (scope === 'upcoming') {
    // Native creation takes the last date default, so the lower bound comes last.
    addFilter(
      'dueAt',
      ViewFilterOperand.IS_BEFORE,
      today.add({ days: 8 }).toInstant().toString(),
    );
    addFilter(
      'dueAt',
      ViewFilterOperand.IS_AFTER,
      today.add({ days: 1 }).toInstant().toString(),
    );
  }
  if (scope === 'overdue')
    addFilter(
      'dueAt',
      ViewFilterOperand.IS_BEFORE,
      today.toInstant().toString(),
    );

  if (!showCompleted) {
    const hasPipelineStatus = readableFields.some(
      (field) => field.name === 'projectStatus',
    );
    const hasNativeStatus = readableFields.some(
      (field) => field.name === 'status',
    );
    if (hasPipelineStatus || hasNativeStatus) {
      const incompleteId = addGroup(
        'incomplete',
        ViewFilterGroupLogicalOperator.OR,
      );
      const statusName = hasPipelineStatus ? 'projectStatus' : 'status';
      const activeStatusId =
        hasPipelineStatus && hasNativeStatus
          ? addGroup(
              'active-pipeline',
              ViewFilterGroupLogicalOperator.AND,
              incompleteId,
            )
          : incompleteId;
      if (hasPipelineStatus && hasNativeStatus)
        addFilter(
          'projectStatus',
          ViewFilterOperand.IS_NOT_EMPTY,
          '',
          activeStatusId,
        );
      addFilter(
        statusName,
        ViewFilterOperand.IS_NOT,
        JSON.stringify(['DONE']),
        activeStatusId,
      );
      if (hasPipelineStatus && hasNativeStatus) {
        const fallbackId = addGroup(
          'native-fallback',
          ViewFilterGroupLogicalOperator.AND,
          incompleteId,
        );
        addFilter('projectStatus', ViewFilterOperand.IS_EMPTY, '', fallbackId);
        const nativeIncompleteId = addGroup(
          'native-incomplete',
          ViewFilterGroupLogicalOperator.OR,
          fallbackId,
        );
        addFilter(
          'status',
          ViewFilterOperand.IS_NOT,
          JSON.stringify(['DONE']),
          nativeIncompleteId,
        );
        addFilter('status', ViewFilterOperand.IS_EMPTY, '', nativeIncompleteId);
      } else {
        addFilter(statusName, ViewFilterOperand.IS_EMPTY, '', incompleteId);
      }
    }
  }

  const dueField = readableFields.find((field) => field.name === 'dueAt');
  return {
    ...view,
    viewFilters: filters,
    viewFilterGroups: filters.length === 0 ? [] : groups,
    anyFieldFilterValue: null,
    mainGroupByFieldMetadataId: null,
    viewGroups: [],
    viewSorts:
      scope !== 'all' && isDefined(dueField)
        ? [
            {
              id: identifier('due-sort'),
              viewId: view.id,
              fieldMetadataId: dueField.id,
              direction: ViewSortDirection.ASC,
            },
          ]
        : view.viewSorts,
  };
};
