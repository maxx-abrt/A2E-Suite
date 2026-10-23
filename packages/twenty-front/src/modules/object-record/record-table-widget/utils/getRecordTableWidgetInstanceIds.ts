import { getRecordIndexIdFromObjectNamePluralAndViewId } from '@/object-record/utils/getRecordIndexIdFromObjectNamePluralAndViewId';
import { isNonEmptyString } from '@sniptt/guards';

export const getRecordTableWidgetInstanceIds = ({
  objectNamePlural,
  viewId,
  widgetId,
  instanceIdSuffix,
}: {
  objectNamePlural: string;
  viewId: string;
  widgetId: string;
  instanceIdSuffix?: string;
}) => {
  const baseRecordIndexId = getRecordIndexIdFromObjectNamePluralAndViewId(
    objectNamePlural,
    viewId,
  );
  return {
    recordIndexId: isNonEmptyString(instanceIdSuffix)
      ? `${baseRecordIndexId}-${instanceIdSuffix}`
      : baseRecordIndexId,
    contextStoreInstanceId: isNonEmptyString(instanceIdSuffix)
      ? `record-table-widget-${widgetId}-${instanceIdSuffix}`
      : `record-table-widget-${widgetId}`,
  };
};
