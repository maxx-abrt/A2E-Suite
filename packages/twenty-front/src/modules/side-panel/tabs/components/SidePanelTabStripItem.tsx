import { SIDE_PANEL_TAB_MAX_WIDTH } from '@/side-panel/tabs/constants/SidePanelTabMaxWidth';
import { SIDE_PANEL_TAB_STRIP_HEIGHT } from '@/side-panel/tabs/constants/SidePanelTabStripHeight';
import { SIDE_PANEL_TAB_STRIP_HEIGHT_MOBILE } from '@/side-panel/tabs/constants/SidePanelTabStripHeightMobile';
import { type SidePanelTab } from '@/side-panel/tabs/types/SidePanelTab';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconX, useIcons } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTab = styled.div<{ isActive: boolean; isMobile: boolean }>`
  align-items: center;
  background-color: ${({ isActive }) =>
    isActive ? themeCssVariables.background.primary : 'transparent'};
  border: 1px solid
    ${({ isActive }) =>
      isActive ? themeCssVariables.border.color.medium : 'transparent'};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.weight.medium
      : themeCssVariables.font.weight.regular};
  gap: ${themeCssVariables.spacing[1]};
  height: ${({ isMobile }) =>
    isMobile
      ? SIDE_PANEL_TAB_STRIP_HEIGHT_MOBILE - 12
      : SIDE_PANEL_TAB_STRIP_HEIGHT - 10}px;
  max-width: ${SIDE_PANEL_TAB_MAX_WIDTH}px;
  min-width: ${({ isMobile }) => (isMobile ? 88 : 64)}px;
  padding: 0 ${themeCssVariables.spacing[1]};
  transition:
    background-color 150ms ease,
    color 150ms ease;
  user-select: none;

  &:hover {
    background-color: ${({ isActive }) =>
      isActive
        ? themeCssVariables.background.primary
        : themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: -1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const StyledTabIcon = styled.span`
  align-items: center;
  display: flex;
  flex-shrink: 0;
`;

const StyledTabLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledCloseButton = styled.button<{ isActive: boolean }>`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  height: 16px;
  justify-content: center;
  opacity: ${({ isActive }) => (isActive ? 1 : 0)};
  padding: 0;
  transition: opacity 150ms ease;
  width: 16px;

  &:hover {
    background-color: ${themeCssVariables.background.transparent.medium};
    color: ${themeCssVariables.font.color.primary};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
  }

  [role='tab']:hover &,
  [role='tab']:focus-within & {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const SidePanelTabStripItem = ({
  tab,
  isActive,
  isMobile,
  tabIndex,
  onActivate,
  onClose,
  onKeyDown,
  registerTabElement,
}: {
  tab: SidePanelTab;
  isActive: boolean;
  isMobile: boolean;
  tabIndex: number;
  onActivate: () => void;
  onClose: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  registerTabElement: (element: HTMLDivElement | null) => void;
}) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const TabIcon = getIcon(tab.iconKey, 'IconDotsVertical');

  const labelRef = useRef<HTMLSpanElement>(null);
  const [isLabelTruncated, setIsLabelTruncated] = useState(false);

  useEffect(() => {
    const labelElement = labelRef.current;

    if (labelElement === null) {
      return;
    }

    setIsLabelTruncated(
      labelElement.scrollWidth > labelElement.clientWidth + 1,
    );
  }, [tab.title]);

  const displayedTitle = tab.title.length > 0 ? tab.title : t`Untitled`;

  return (
    <StyledTab
      role="tab"
      id={`side-panel-tab-${tab.id}`}
      aria-selected={isActive}
      aria-label={displayedTitle}
      tabIndex={tabIndex}
      isActive={isActive}
      isMobile={isMobile}
      ref={registerTabElement}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      data-testid={`side-panel-tab-${tab.id}`}
      data-active={isActive}
      title={isLabelTruncated ? displayedTitle : undefined}
    >
      <StyledTabIcon aria-hidden="true">
        <TabIcon size={14} />
      </StyledTabIcon>
      <StyledTabLabel ref={labelRef}>{displayedTitle}</StyledTabLabel>
      <StyledCloseButton
        type="button"
        isActive={isActive}
        tabIndex={-1}
        aria-label={t`Close tab ${displayedTitle}`}
        data-testid={`side-panel-tab-close-${tab.id}`}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <IconX size={12} />
      </StyledCloseButton>
    </StyledTab>
  );
};
