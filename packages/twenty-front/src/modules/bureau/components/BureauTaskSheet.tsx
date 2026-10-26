import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useBureauDayBoundaries } from '@/bureau/hooks/useBureauDayBoundaries';
import { bureauTaskPreferencesState } from '@/bureau/states/bureauTaskPreferencesState';
import {
  BUREAU_TASK_SCOPES,
  type BureauTaskScope,
} from '@/bureau/types/BureauTaskScope';
import { buildBureauTaskFocusView } from '@/bureau/utils/buildBureauTaskFocusView';
import { useAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
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
import { useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import { Button, Checkbox } from 'twenty-ui/input';
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

const StyledFocusBar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledFocusButtons = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  max-width: 100%;
  overflow-x: auto;
`;

const StyledFocusButton = styled.button`
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  flex-shrink: 0;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &[aria-pressed='true'] {
    background: ${themeCssVariables.background.tertiary};
    color: ${themeCssVariables.font.color.primary};
  }
  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: -2px;
  }
`;

const StyledCompletedControl = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
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
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { today } = useBureauDayBoundaries();
  const [preferences, setPreferences] = useAtomFamilyState(
    bureauTaskPreferencesState,
    {
      objectMetadataId,
      workspaceMemberId: currentWorkspaceMember?.id ?? 'anonymous',
    },
  );
  const selectedViewId = preferences?.viewId;
  const showCompleted = preferences?.showCompleted === true;
  const canFilterMine =
    isDefined(currentWorkspaceMember?.id) &&
    objectMetadataItem.readableFields.some(
      (field) => field.name === 'assignee',
    );
  const canFilterDates =
    canFilterMine &&
    objectMetadataItem.readableFields.some((field) => field.name === 'dueAt');
  const canFilterCompletion = objectMetadataItem.readableFields.some((field) =>
    ['status', 'projectStatus'].includes(field.name),
  );
  const availableScopes = BUREAU_TASK_SCOPES.filter(
    (scope) =>
      scope === 'all' || (scope === 'mine' ? canFilterMine : canFilterDates),
  );
  const preferredScope = preferences?.scope;
  const scope: BureauTaskScope =
    preferredScope === 'view' ||
    availableScopes.some((candidate) => candidate === preferredScope)
      ? preferredScope
      : canFilterMine
        ? 'mine'
        : 'all';
  const scopeLabels = {
    mine: t`My tasks`,
    today: t`Today`,
    upcoming: t`Next 7 days`,
    overdue: t`Overdue`,
    all: t`All tasks`,
    view: t`Saved view`,
  };
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
  const instanceIdSuffix = `${taskSheetId}-${scope}`;
  const focusView = useMemo(
    () =>
      isDefined(selectedView)
        ? buildBureauTaskFocusView({
            view: selectedView,
            scope,
            readableFields: objectMetadataItem.readableFields,
            workspaceMemberId: currentWorkspaceMember?.id,
            today,
            showCompleted,
          })
        : undefined,
    [
      selectedView,
      scope,
      objectMetadataItem.readableFields,
      currentWorkspaceMember?.id,
      today,
      showCompleted,
    ],
  );
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
            scope !== 'overdue' &&
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
                      instanceIdSuffix,
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
              onChange={(event) =>
                setPreferences((previous) => ({
                  ...previous,
                  viewId: event.target.value,
                  scope: 'view',
                }))
              }
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
      <StyledFocusBar>
        <StyledFocusButtons role="group" aria-label={t`Task focus`}>
          {[
            ...availableScopes,
            ...(views.length > 0 ? ['view' as const] : []),
          ].map((taskScope) => (
            <StyledFocusButton
              key={taskScope}
              type="button"
              aria-pressed={scope === taskScope}
              onClick={() =>
                setPreferences((previous) => ({
                  ...previous,
                  scope: taskScope,
                }))
              }
            >
              {scopeLabels[taskScope]}
            </StyledFocusButton>
          ))}
        </StyledFocusButtons>
        {scope !== 'view' && canFilterCompletion && (
          <StyledCompletedControl>
            <Checkbox
              checked={showCompleted}
              onCheckedChange={(checked) =>
                setPreferences((previous) => ({
                  ...previous,
                  showCompleted: checked,
                }))
              }
            />
            {t`Show completed`}
          </StyledCompletedControl>
        )}
      </StyledFocusBar>
      {scope === 'overdue' && (
        <StyledMessage>{t`Review overdue work here. Choose Today or My tasks to add a new task.`}</StyledMessage>
      )}
      {isDefined(selectedView) ? (
        <PageLayoutEditModeProviderContext value={{ isInEditMode: false }}>
          <PageLayoutComponentInstanceContext.Provider
            value={{ instanceId: taskSheetId }}
          >
            <ErrorBoundary
              FallbackComponent={TaskSheetError}
              resetKeys={[objectMetadataId, selectedView.id, scope]}
            >
              <StyledTable>
                <RecordTableWidgetRendererContent
                  key={`${selectedView.id}-${scope}`}
                  viewOverride={focusView}
                  isCreationEnabled={scope !== 'overdue'}
                  objectMetadataId={objectMetadataId}
                  viewId={selectedView.id}
                  widgetId={taskSheetId}
                  instanceIdSuffix={instanceIdSuffix}
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
