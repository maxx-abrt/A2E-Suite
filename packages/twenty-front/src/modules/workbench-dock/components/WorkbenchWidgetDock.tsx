import { ResizablePanelEdge } from '@/ui/layout/resizable-panel/components/ResizablePanelEdge';
import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronRight } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  DefaultWorkbenchWidgetContent,
  getWorkbenchWidgetTitle,
} from '~/modules/workbench-dock/components/DefaultWorkbenchWidgetContent';
import { useWorkbenchWidgetRegistry } from '~/modules/workbench-dock/hooks/useWorkbenchWidgetRegistry';
import { workbenchWidgetDockActiveWidgetIdState } from '~/modules/workbench-dock/states/workbenchWidgetDockActiveWidgetIdState';
import { workbenchWidgetDockModeState } from '~/modules/workbench-dock/states/workbenchWidgetDockModeState';
import { workbenchWidgetDockWidthState } from '~/modules/workbench-dock/states/workbenchWidgetDockWidthState';
import {
  getWorkbenchWidgetDockModeAfterResize,
  WORKBENCH_DOCK_MAX_WIDTH,
  WORKBENCH_DOCK_MIN_WIDTH,
} from '~/modules/workbench-dock/utils/getWorkbenchWidgetDockModeAfterResize';

const WORKBENCH_DOCK_MINI_WIDTH = 48;
const WORKBENCH_DOCK_WIDTH_CSS_VARIABLE =
  '--a2e-workbench-dock-workbenchWidgetDockWidth';

const StyledDockRoot = styled.aside<{ isExpanded: boolean }>`
  background: ${themeCssVariables.background.secondary};
  border-left: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  height: 100%;
  min-workbenchwidgetdockwidth: ${WORKBENCH_DOCK_MINI_WIDTH}px;
  overflow: hidden;
  position: relative;
  transition: workbenchWidgetDockWidth
    ${themeCssVariables.animation.duration.normal}s ease;
  workbenchwidgetdockwidth: ${({ isExpanded }) =>
    isExpanded
      ? `var(${WORKBENCH_DOCK_WIDTH_CSS_VARIABLE}, 336px)`
      : `${WORKBENCH_DOCK_MINI_WIDTH}px`};

  @media (max-workbenchwidgetdockwidth: 1199px) {
    bottom: 0;
    box-shadow: ${themeCssVariables.boxShadow.strong};
    position: absolute;
    right: 0;
    top: 0;
    z-index: ${RootStackingContextZIndices.WorkbenchWidgetDock};
  }

  @media (max-workbenchwidgetdockwidth: 767px) {
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: ${themeCssVariables.border.radius.md};
    bottom: ${themeCssVariables.spacing[4]};
    height: ${({ isExpanded }) => (isExpanded ? 'min(520px, 72vh)' : 'auto')};
    max-workbenchwidgetdockwidth: calc(
      100vw - ${themeCssVariables.spacing[4]} * 2
    );
    right: ${themeCssVariables.spacing[4]};
    top: auto;
  }
`;

const StyledRail = styled.nav`
  align-items: center;
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 ${WORKBENCH_DOCK_MINI_WIDTH}px;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[2]} 0;
`;

const StyledWidgetButton = styled.div<{ isActive: boolean }>`
  background: ${({ isActive }) =>
    isActive ? themeCssVariables.background.transparent.medium : 'transparent'};
  border-radius: ${themeCssVariables.border.radius.sm};
`;

const StyledExpandedPanel = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-workbenchwidgetdockwidth: 0;
  overflow: hidden;
`;

const StyledHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 44px;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: 0 ${themeCssVariables.spacing[2]} 0 ${themeCssVariables.spacing[3]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

const StyledResizeEdge = styled.div`
  @media (max-workbenchwidgetdockwidth: 767px) {
    display: none;
  }
`;

export const WorkbenchWidgetDock = () => {
  const { t } = useLingui();
  const definitions = useWorkbenchWidgetRegistry();
  const [workbenchWidgetDockMode, setWorkbenchWidgetDockMode] = useAtomState(
    workbenchWidgetDockModeState,
  );
  const [workbenchWidgetDockWidth, setWorkbenchWidgetDockWidth] = useAtomState(
    workbenchWidgetDockWidthState,
  );
  const [
    workbenchWidgetDockActiveWidgetId,
    setWorkbenchWidgetDockActiveWidgetId,
  ] = useAtomState(workbenchWidgetDockActiveWidgetIdState);
  const isExpanded = workbenchWidgetDockMode === 'EXPANDED';
  const activeDefinition =
    definitions.find(
      (definition) => definition.id === workbenchWidgetDockActiveWidgetId,
    ) ?? definitions[0];

  useEffect(() => {
    document.documentElement.style.setProperty(
      WORKBENCH_DOCK_WIDTH_CSS_VARIABLE,
      `${workbenchWidgetDockWidth}px`,
    );

    return () => {
      document.documentElement.style.removeProperty(
        WORKBENCH_DOCK_WIDTH_CSS_VARIABLE,
      );
    };
  }, [workbenchWidgetDockWidth]);

  if (!isDefined(activeDefinition)) {
    return null;
  }

  const activeTitle = getWorkbenchWidgetTitle(activeDefinition.id, t);
  const handleWidthChange = (nextWidth: number) => {
    if (getWorkbenchWidgetDockModeAfterResize(nextWidth) === 'MINI') {
      setWorkbenchWidgetDockMode('MINI');
      return;
    }

    setWorkbenchWidgetDockWidth(nextWidth);
  };

  return (
    <StyledDockRoot
      isExpanded={isExpanded}
      data-testid="workbench-widget-dock"
      data-mode={workbenchWidgetDockMode}
      aria-label={t`Workspace widgets`}
    >
      {isExpanded && (
        <StyledResizeEdge>
          <ResizablePanelEdge
            side="left"
            currentWidth={workbenchWidgetDockWidth}
            constraints={{
              default: 336,
              min: WORKBENCH_DOCK_MIN_WIDTH,
              max: WORKBENCH_DOCK_MAX_WIDTH,
            }}
            onWidthChange={handleWidthChange}
            onCollapse={() => setWorkbenchWidgetDockMode('MINI')}
            cssVariableName={WORKBENCH_DOCK_WIDTH_CSS_VARIABLE}
          />
        </StyledResizeEdge>
      )}
      <StyledRail aria-label={t`Widget shortcuts`}>
        {definitions.map((definition) => {
          const title = getWorkbenchWidgetTitle(definition.id, t);
          const isActive = definition.id === activeDefinition.id;

          return (
            <StyledWidgetButton key={definition.id} isActive={isActive}>
              <IconButton
                Icon={definition.Icon}
                dataTestId={`workbench-widget-button-${definition.id}`}
                ariaLabel={title}
                size="small"
                variant={isActive ? 'primary' : 'tertiary'}
                accent={isActive ? 'blue' : 'default'}
                onClick={() => {
                  setWorkbenchWidgetDockActiveWidgetId(definition.id);
                  setWorkbenchWidgetDockMode('EXPANDED');
                }}
              />
            </StyledWidgetButton>
          );
        })}
      </StyledRail>
      {isExpanded && (
        <StyledExpandedPanel>
          <StyledHeader>
            <StyledTitle>{activeTitle}</StyledTitle>
            <IconButton
              Icon={IconChevronRight}
              dataTestId="workbench-widget-collapse"
              ariaLabel={t`Collapse widgets`}
              size="small"
              variant="tertiary"
              accent="default"
              onClick={() => setWorkbenchWidgetDockMode('MINI')}
            />
          </StyledHeader>
          <StyledContent>
            {isDefined(activeDefinition.Component) ? (
              <activeDefinition.Component />
            ) : (
              <DefaultWorkbenchWidgetContent definition={activeDefinition} />
            )}
          </StyledContent>
        </StyledExpandedPanel>
      )}
    </StyledDockRoot>
  );
};
