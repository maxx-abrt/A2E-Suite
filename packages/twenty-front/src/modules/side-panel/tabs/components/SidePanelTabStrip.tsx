import { SidePanelTabStripItem } from '@/side-panel/tabs/components/SidePanelTabStripItem';
import { SIDE_PANEL_TAB_STRIP_HEIGHT } from '@/side-panel/tabs/constants/SidePanelTabStripHeight';
import { SIDE_PANEL_TAB_STRIP_HEIGHT_MOBILE } from '@/side-panel/tabs/constants/SidePanelTabStripHeightMobile';
import { useSidePanelTabs } from '@/side-panel/tabs/hooks/useSidePanelTabs';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { Key } from 'ts-key-enum';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useIsMobile } from 'twenty-ui/utilities';

const StyledTabStrip = styled.div<{ isMobile: boolean }>`
  align-items: center;
  background-color: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[1]};
  height: ${({ isMobile }) =>
    isMobile
      ? SIDE_PANEL_TAB_STRIP_HEIGHT_MOBILE
      : SIDE_PANEL_TAB_STRIP_HEIGHT}px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 ${themeCssVariables.spacing[2]};
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media print {
    display: none;
  }
`;

export const SidePanelTabStrip = () => {
  const { t } = useLingui();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const { tabs, activeTabId, activateSidePanelTab, closeSidePanelTab } =
    useSidePanelTabs();

  // Holds DOM nodes for focus and scroll management, never rendered state.
  // oxlint-disable-next-line twenty/no-state-useref
  const tabElementsRef = useRef(new Map<string, HTMLDivElement>());

  const registerTabElement = useCallback(
    (tabId: string) => (element: HTMLDivElement | null) => {
      if (element === null) {
        tabElementsRef.current.delete(tabId);

        return;
      }

      tabElementsRef.current.set(tabId, element);
    },
    [],
  );

  useEffect(() => {
    if (!isDefined(activeTabId)) {
      return;
    }

    const activeTabElement = tabElementsRef.current.get(activeTabId);

    // Guarded: not every environment (jsdom, older engines) implements it.
    if (typeof activeTabElement?.scrollIntoView !== 'function') {
      return;
    }

    activeTabElement.scrollIntoView({
      behavior: shouldReduceMotion === true ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeTabId, shouldReduceMotion]);

  const focusTabAtIndex = useCallback(
    (index: number) => {
      const targetTab = tabs[index];

      if (!isDefined(targetTab)) {
        return;
      }

      tabElementsRef.current.get(targetTab.id)?.focus();
      activateSidePanelTab(targetTab.id);
    },
    [activateSidePanelTab, tabs],
  );

  const handleTabKeyDown = useCallback(
    (tabId: string) => (event: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((tab) => tab.id === tabId);

      if (currentIndex === -1) {
        return;
      }

      switch (event.key) {
        case Key.ArrowRight:
          event.preventDefault();
          focusTabAtIndex((currentIndex + 1) % tabs.length);
          break;
        case Key.ArrowLeft:
          event.preventDefault();
          focusTabAtIndex((currentIndex - 1 + tabs.length) % tabs.length);
          break;
        case Key.Home:
          event.preventDefault();
          focusTabAtIndex(0);
          break;
        case Key.End:
          event.preventDefault();
          focusTabAtIndex(tabs.length - 1);
          break;
        case Key.Enter:
        case ' ':
          event.preventDefault();
          activateSidePanelTab(tabId);
          break;
        case Key.Delete:
        case Key.Backspace:
          event.preventDefault();
          closeSidePanelTab(tabId);
          break;
        default:
          break;
      }
    },
    [activateSidePanelTab, closeSidePanelTab, focusTabAtIndex, tabs],
  );

  if (tabs.length === 0) {
    return null;
  }

  // Roving tabIndex: exactly one tab is reachable with Tab, arrows do the rest.
  const rovingTabId = isDefined(activeTabId) ? activeTabId : tabs[0]?.id;

  return (
    <StyledTabStrip
      role="tablist"
      aria-label={t`Side panel context tabs`}
      aria-orientation="horizontal"
      isMobile={isMobile}
      data-testid="side-panel-tab-strip"
    >
      {tabs.map((tab) => (
        <SidePanelTabStripItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          isMobile={isMobile}
          tabIndex={tab.id === rovingTabId ? 0 : -1}
          registerTabElement={registerTabElement(tab.id)}
          onActivate={() => activateSidePanelTab(tab.id)}
          onClose={() => closeSidePanelTab(tab.id)}
          onKeyDown={handleTabKeyDown(tab.id)}
        />
      ))}
    </StyledTabStrip>
  );
};
