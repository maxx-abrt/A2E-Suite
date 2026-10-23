import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { getRecordTableWidgetInstanceIds } from '@/object-record/record-table-widget/utils/getRecordTableWidgetInstanceIds';
import { useMountCommand } from '@/command-menu-item/engine-command/hooks/useMountCommand';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { PageLayoutEditModeProviderContext } from '@/page-layout/contexts/PageLayoutEditModeContext';
import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { RecordTableWidgetRendererContent } from '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { viewsFromObjectMetadataItemFamilySelector } from '@/views/states/selectors/viewsFromObjectMetadataItemFamilySelector';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { IconCheckbox, IconPlus } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import {
  EngineComponentKey,
  ViewKey,
  ViewType,
} from '~/generated-metadata/graphql';

const StyledSection = styled.section`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  min-width: 0;
  overflow: hidden;
`;

const StyledHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledTitle = styled.h2`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[2]};
  margin: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  font: inherit;
  max-width: 220px;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

const StyledTable = styled.div`
  display: flex;
  flex-direction: column;
  height: 360px;
  min-height: 0;
`;

const StyledMessage = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  margin: 0;
  padding: ${themeCssVariables.spacing[5]};
`;

const TaskSheetError = () => {
  const { t } = useLingui();
  return (
    <StyledMessage role="status">
      {t`This view could not load. Open tasks to continue.`}
    </StyledMessage>
  );
};

export const BureauTaskSheet = () => {
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const taskObject = readableObjectMetadataItems.find(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === CoreObjectNameSingular.Task,
  );

  return taskObject ? (
    <BureauTaskSheetContent
      key={taskObject.id}
      objectMetadataItem={taskObject}
      priorityFieldMetadataId={
        taskObject.readableFields.find((field) => field.name === 'priority')?.id
      }
    />
  ) : null;
};

type BureauTaskSheetContentProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  priorityFieldMetadataId?: string;
};

const BureauTaskSheetContent = ({
  objectMetadataItem,
  priorityFieldMetadataId,
}: BureauTaskSheetContentProps) => {
  const { t } = useLingui();
  const objectMetadataId = objectMetadataItem.id;
  const mountCommand = useMountCommand();
  const permissions = useObjectPermissionsForObject(objectMetadataId);
  const views = useAtomFamilySelectorValue(
    viewsFromObjectMetadataItemFamilySelector,
    { objectMetadataItemId: objectMetadataId },
  ).filter((view) => view.type === ViewType.TABLE);
  const [selectedViewId, setSelectedViewId] = useState<string>();
  const compactView = views
    .filter(
      (view) =>
        view.viewFields.some((field) => field.isVisible !== false) &&
        (view.viewFilters?.length ?? 0) === 0 &&
        (view.viewFilterGroups?.length ?? 0) === 0 &&
        !isNonEmptyString(view.anyFieldFilterValue),
    )
    .sort(
      (firstView, secondView) =>
        firstView.viewFields.filter((field) => field.isVisible !== false)
          .length -
        secondView.viewFields.filter((field) => field.isVisible !== false)
          .length,
    )
    .at(0);
  const selectedView =
    views.find((view) => view.id === selectedViewId) ??
    compactView ??
    views.find((view) =>
      view.viewFields.some(
        (field) =>
          isDefined(priorityFieldMetadataId) &&
          field.fieldMetadataId === priorityFieldMetadataId &&
          field.isVisible !== false,
      ),
    ) ??
    views.find((view) => view.key === ViewKey.INDEX) ??
    views.at(0);
  const taskSheetId = `bureau-task-sheet-${objectMetadataId}`;
  const tasksPath = isDefined(selectedView)
    ? getAppPath(
        AppPath.RecordIndexPage,
        { objectNamePlural: 'tasks' },
        { viewId: selectedView.id },
      )
    : AppPath.TasksPage;

  return (
    <StyledSection aria-label={t`Task sheet`}>
      <StyledHeader>
        <StyledTitle>
          <IconCheckbox size={18} />
          {t`Task sheet`}
        </StyledTitle>
        <StyledActions>
          {isDefined(selectedView) &&
            canCreateRecordsForObjectMetadataItem({
              objectMetadataItem,
              objectPermissions: permissions,
            }) && (
              <Button
                title={t`New task`}
                ariaLabel={t`New task`}
                Icon={IconPlus}
                variant="secondary"
                size="small"
                onClick={() => {
                  const { recordIndexId, contextStoreInstanceId } =
                    getRecordTableWidgetInstanceIds({
                      objectNamePlural: 'tasks',
                      viewId: selectedView.id,
                      widgetId: taskSheetId,
                      instanceIdSuffix: taskSheetId,
                    });
                  void mountCommand({
                    engineCommandId: `quick-create-${recordIndexId}`,
                    engineComponentKey: EngineComponentKey.CREATE_NEW_RECORD,
                    contextStoreInstanceId,
                    recordIndexId,
                  });
                }}
              />
            )}
          {views.length > 0 && (
            <StyledSelect
              aria-label={t`Task view`}
              value={selectedView?.id}
              onChange={(event) => setSelectedViewId(event.target.value)}
            >
              {views.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </StyledSelect>
          )}
          <Button
            title={t`Open tasks`}
            ariaLabel={t`Open tasks`}
            variant="secondary"
            size="small"
            to={tasksPath}
          />
        </StyledActions>
      </StyledHeader>
      {isDefined(selectedView) ? (
        <PageLayoutEditModeProviderContext value={{ isInEditMode: false }}>
          <PageLayoutComponentInstanceContext.Provider
            value={{ instanceId: taskSheetId }}
          >
            <ErrorBoundary
              FallbackComponent={TaskSheetError}
              resetKeys={[objectMetadataId, selectedView.id]}
            >
              <StyledTable>
                <RecordTableWidgetRendererContent
                  key={selectedView.id}
                  objectMetadataId={objectMetadataId}
                  viewId={selectedView.id}
                  widgetId={taskSheetId}
                  instanceIdSuffix={taskSheetId}
                  isUIEditable={permissions.canUpdateObjectRecords}
                />
              </StyledTable>
            </ErrorBoundary>
          </PageLayoutComponentInstanceContext.Provider>
        </PageLayoutEditModeProviderContext>
      ) : (
        <StyledMessage>{t`Open tasks to choose or create a table view.`}</StyledMessage>
      )}
    </StyledSection>
  );
};
