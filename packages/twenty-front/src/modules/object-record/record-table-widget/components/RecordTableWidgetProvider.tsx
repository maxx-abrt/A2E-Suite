import { ContextStoreComponentInstanceContext } from '@/context-store/states/contexts/ContextStoreComponentInstanceContext';
import { type ContextStoreViewType } from '@/context-store/types/ContextStoreViewType';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { RecordComponentInstanceContextsWrapper } from '@/object-record/components/RecordComponentInstanceContextsWrapper';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { RecordIndexContextProvider } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useRecordIndexFieldMetadataDerivedStates } from '@/object-record/record-index/hooks/useRecordIndexFieldMetadataDerivedStates';
import { RecordTableWidgetContextStoreInitEffect } from '@/object-record/record-table-widget/components/RecordTableWidgetContextStoreInitEffect';
import { RecordTableWidgetViewLoadEffect } from '@/object-record/record-table-widget/components/RecordTableWidgetViewLoadEffect';
import { MISSING_RECORD_TABLE_WIDGET_PAGE_LAYOUT_ID } from '@/object-record/record-table-widget/constants/MissingRecordTableWidgetPageLayoutId';
import {
  RecordTableWidgetContext,
  type RecordTableWidgetJunctionCreateThrough,
  type RecordTableWidgetNestedRelationCreateThrough,
} from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { useRecordTableWidgetFieldUpdate } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetFieldUpdate';
import { useUpdateRecordTableWidgetViewDraft } from '@/page-layout/widgets/record-table/hooks/useUpdateRecordTableWidgetViewDraft';
import { useComponentInstanceStateContext } from '@/ui/utilities/state/component-state/hooks/useComponentInstanceStateContext';
import { getRecordTableWidgetInstanceIds } from '@/object-record/record-table-widget/utils/getRecordTableWidgetInstanceIds';
import { ViewComponentInstanceContext } from '@/views/states/contexts/ViewComponentInstanceContext';
import { type PropsWithChildren, useCallback, useMemo } from 'react';
import { type View } from '@/views/types/View';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';

type RecordTableWidgetProviderProps = PropsWithChildren<{
  objectNameSingular: string;
  viewId: string;
  widgetId: string;
  recordLimit?: number;
  instanceIdSuffix?: string;
  contextStoreViewType?: ContextStoreViewType;
  nestedRelationCreateThrough?: RecordTableWidgetNestedRelationCreateThrough;
  junctionCreateThrough?: RecordTableWidgetJunctionCreateThrough;
  viewOverride?: View;
}>;

export const RecordTableWidgetProvider = ({
  objectNameSingular,
  viewId,
  widgetId,
  recordLimit,
  instanceIdSuffix,
  contextStoreViewType,
  nestedRelationCreateThrough,
  junctionCreateThrough,
  viewOverride,
  children,
}: RecordTableWidgetProviderProps) => {
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular,
  });

  const { recordIndexId, contextStoreInstanceId } =
    getRecordTableWidgetInstanceIds({
      objectNamePlural: objectMetadataItem.namePlural,
      viewId,
      widgetId,
      instanceIdSuffix,
    });

  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const objectPermissions = getObjectPermissionsForObject(
    objectPermissionsByObjectMetadataId,
    objectMetadataItem.id,
  );

  const {
    fieldDefinitionByFieldMetadataItemId,
    fieldMetadataItemByFieldMetadataItemId,
    labelIdentifierFieldMetadataItem,
    recordFieldByFieldMetadataItemId,
  } = useRecordIndexFieldMetadataDerivedStates(
    objectMetadataItem,
    recordIndexId,
  );

  const indexIdentifierUrl = useCallback(
    (recordId: string) => {
      return getAppPath(AppPath.RecordShowPage, {
        objectNameSingular,
        objectRecordId: recordId,
      });
    },
    [objectNameSingular],
  );

  const handleIndexRecordsLoaded = useCallback(() => {}, []);

  const pageLayoutComponentInstanceContext = useComponentInstanceStateContext(
    PageLayoutComponentInstanceContext,
  );

  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  const pageLayoutId = pageLayoutComponentInstanceContext?.instanceId;

  const { handleFieldUpdated: updateViewDraftField } =
    useRecordTableWidgetFieldUpdate({
      pageLayoutId: pageLayoutId ?? MISSING_RECORD_TABLE_WIDGET_PAGE_LAYOUT_ID,
      widgetId,
    });

  const { updateRecordTableWidgetViewDraft: updateViewDraft } =
    useUpdateRecordTableWidgetViewDraft({
      pageLayoutId: pageLayoutId ?? MISSING_RECORD_TABLE_WIDGET_PAGE_LAYOUT_ID,
      widgetId,
    });

  const recordTableWidgetContext = useMemo(
    () => ({
      isPageLayoutInEditMode,
      pageLayoutId,
      widgetId,
      nestedRelationCreateThrough,
      junctionCreateThrough,
      updateViewDraftField,
      updateViewDraft,
    }),
    [
      isPageLayoutInEditMode,
      pageLayoutId,
      widgetId,
      nestedRelationCreateThrough,
      junctionCreateThrough,
      updateViewDraftField,
      updateViewDraft,
    ],
  );

  if (!objectPermissions.canReadObjectRecords) {
    return null;
  }

  return (
    <RecordTableWidgetContext.Provider value={recordTableWidgetContext}>
      <ContextStoreComponentInstanceContext.Provider
        value={{
          instanceId: contextStoreInstanceId,
        }}
      >
        <RecordTableWidgetContextStoreInitEffect
          objectMetadataItemId={objectMetadataItem.id}
          viewId={viewId}
          contextStoreViewType={contextStoreViewType}
        />
        <RecordIndexContextProvider
          value={{
            objectPermissionsByObjectMetadataId,
            recordIndexId,
            viewBarInstanceId: recordIndexId,
            objectNamePlural: objectMetadataItem.namePlural,
            objectNameSingular,
            objectMetadataItem,
            onIndexRecordsLoaded: handleIndexRecordsLoaded,
            indexIdentifierUrl,
            recordFieldByFieldMetadataItemId,
            labelIdentifierFieldMetadataItem,
            fieldMetadataItemByFieldMetadataItemId,
            fieldDefinitionByFieldMetadataItemId,
            recordLimit,
          }}
        >
          <ViewComponentInstanceContext.Provider
            value={{ instanceId: recordIndexId }}
          >
            <RecordComponentInstanceContextsWrapper
              componentInstanceId={recordIndexId}
            >
              <RecordTableWidgetViewLoadEffect
                viewOverride={viewOverride}
                viewId={viewId}
                widgetId={widgetId}
                objectMetadataItem={objectMetadataItem}
              />
              {children}
            </RecordComponentInstanceContextsWrapper>
          </ViewComponentInstanceContext.Provider>
        </RecordIndexContextProvider>
      </ContextStoreComponentInstanceContext.Provider>
    </RecordTableWidgetContext.Provider>
  );
};
