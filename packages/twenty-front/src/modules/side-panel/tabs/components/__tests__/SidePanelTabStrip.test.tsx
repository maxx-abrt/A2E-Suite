import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';

import { ContextStoreViewType } from '@/context-store/types/ContextStoreViewType';
import { SIDE_PANEL_COMPONENT_INSTANCE_ID } from '@/side-panel/constants/SidePanelComponentInstanceId';
import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import { SidePanelTabStrip } from '@/side-panel/tabs/components/SidePanelTabStrip';
import { activeSidePanelTabIdState } from '@/side-panel/tabs/states/activeSidePanelTabIdState';
import {
  EMPTY_SIDE_PANEL_TABS_SESSION,
  sidePanelTabsState,
} from '@/side-panel/tabs/states/sidePanelTabsState';
import { SIDE_PANEL_TABS_SCHEMA_VERSION } from '@/side-panel/tabs/constants/SidePanelTabsSchemaVersion';
import { type SidePanelTab } from '@/side-panel/tabs/types/SidePanelTab';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { SidePanelPages } from 'twenty-shared/types';
import { getJestMetadataAndApolloMocksAndCommandMenuWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksAndCommandMenuWrapper';

const Wrapper = getJestMetadataAndApolloMocksAndCommandMenuWrapper({
  apolloMocks: [],
  componentInstanceId: SIDE_PANEL_COMPONENT_INSTANCE_ID,
  contextStoreCurrentObjectMetadataNameSingular: 'person',
  contextStoreCurrentViewId: 'my-view-id',
  contextStoreTargetedRecordsRule: {
    mode: 'selection',
    selectedRecordIds: [],
  },
  contextStoreNumberOfSelectedRecords: 0,
  contextStoreCurrentViewType: ContextStoreViewType.Table,
});

const buildTab = ({
  id,
  title,
  path,
}: {
  id: string;
  title: string;
  path: string;
}): SidePanelTab => ({
  id,
  title,
  iconKey: 'IconBuildingSkyscraper',
  stack: [
    {
      pageId: `page-${id}`,
      page: SidePanelPages.RoutedPage,
      pageTitle: title,
      pageIconKey: 'IconBuildingSkyscraper',
      routedFlowStateScopeId: `scope-${id}`,
      routedLocation: {
        pathname: path,
        search: '',
        hash: '',
        state: null,
        key: `key-${id}`,
      },
    },
  ],
  activePageId: `page-${id}`,
  contextKey: `route:${path}`,
  createdAt: 1,
  updatedAt: 1,
});

const seedTabs = (tabs: SidePanelTab[], activeTabId: string | null) => {
  jotaiStore.set(sidePanelTabsState.atom, {
    version: SIDE_PANEL_TABS_SCHEMA_VERSION,
    tabs,
  });
  jotaiStore.set(activeSidePanelTabIdState.atom, activeTabId);
};

const renderTabStrip = () =>
  render(
    <I18nProvider i18n={i18n}>
      <Wrapper>
        <SidePanelTabStrip />
      </Wrapper>
    </I18nProvider>,
  );

describe('SidePanelTabStrip', () => {
  beforeEach(() => {
    localStorage.clear();
    jotaiStore.set(sidePanelTabsState.atom, EMPTY_SIDE_PANEL_TABS_SESSION);
    jotaiStore.set(activeSidePanelTabIdState.atom, null);
    jotaiStore.set(sidePanelNavigationStackState.atom, []);
  });

  it('renders nothing when no context is held in a tab', () => {
    renderTabStrip();

    expect(
      screen.queryByTestId('side-panel-tab-strip'),
    ).not.toBeInTheDocument();
  });

  it('exposes an accessible tablist with the active tab selected', () => {
    seedTabs(
      [
        buildTab({ id: 'a', title: 'Airbnb', path: '/object/company/1' }),
        buildTab({ id: 'b', title: 'Qonto', path: '/object/company/2' }),
      ],
      'b',
    );

    renderTabStrip();

    const tabList = screen.getByRole('tablist');

    expect(tabList).toHaveAttribute('aria-orientation', 'horizontal');
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByTestId('side-panel-tab-b')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('side-panel-tab-a')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('applies a roving tabIndex so only the active tab is in the tab order', () => {
    seedTabs(
      [
        buildTab({ id: 'a', title: 'Airbnb', path: '/object/company/1' }),
        buildTab({ id: 'b', title: 'Qonto', path: '/object/company/2' }),
      ],
      'b',
    );

    renderTabStrip();

    expect(screen.getByTestId('side-panel-tab-b')).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByTestId('side-panel-tab-a')).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('activates a tab on click', () => {
    seedTabs(
      [
        buildTab({ id: 'a', title: 'Airbnb', path: '/object/company/1' }),
        buildTab({ id: 'b', title: 'Qonto', path: '/object/company/2' }),
      ],
      'b',
    );

    renderTabStrip();

    act(() => {
      fireEvent.click(screen.getByTestId('side-panel-tab-a'));
    });

    expect(jotaiStore.get(activeSidePanelTabIdState.atom)).toBe('a');
    expect(jotaiStore.get(sidePanelNavigationStackState.atom)[0]?.pageId).toBe(
      'page-a',
    );
  });

  it('moves between tabs with the arrow keys', () => {
    seedTabs(
      [
        buildTab({ id: 'a', title: 'Airbnb', path: '/object/company/1' }),
        buildTab({ id: 'b', title: 'Qonto', path: '/object/company/2' }),
      ],
      'a',
    );

    renderTabStrip();

    act(() => {
      fireEvent.keyDown(screen.getByTestId('side-panel-tab-a'), {
        key: 'ArrowRight',
      });
    });

    expect(jotaiStore.get(activeSidePanelTabIdState.atom)).toBe('b');

    act(() => {
      fireEvent.keyDown(screen.getByTestId('side-panel-tab-b'), {
        key: 'ArrowLeft',
      });
    });

    expect(jotaiStore.get(activeSidePanelTabIdState.atom)).toBe('a');
  });

  it('jumps to the first and last tab with Home and End', () => {
    seedTabs(
      [
        buildTab({ id: 'a', title: 'Airbnb', path: '/object/company/1' }),
        buildTab({ id: 'b', title: 'Qonto', path: '/object/company/2' }),
        buildTab({ id: 'c', title: 'Alan', path: '/object/company/3' }),
      ],
      'b',
    );

    renderTabStrip();

    act(() => {
      fireEvent.keyDown(screen.getByTestId('side-panel-tab-b'), {
        key: 'End',
      });
    });

    expect(jotaiStore.get(activeSidePanelTabIdState.atom)).toBe('c');

    act(() => {
      fireEvent.keyDown(screen.getByTestId('side-panel-tab-c'), {
        key: 'Home',
      });
    });

    expect(jotaiStore.get(activeSidePanelTabIdState.atom)).toBe('a');
  });

  it('closes a tab from its close affordance', () => {
    seedTabs(
      [
        buildTab({ id: 'a', title: 'Airbnb', path: '/object/company/1' }),
        buildTab({ id: 'b', title: 'Qonto', path: '/object/company/2' }),
      ],
      'b',
    );

    renderTabStrip();

    act(() => {
      fireEvent.click(screen.getByTestId('side-panel-tab-close-a'));
    });

    expect(
      jotaiStore.get(sidePanelTabsState.atom).tabs.map((tab) => tab.id),
    ).toEqual(['b']);
    expect(jotaiStore.get(activeSidePanelTabIdState.atom)).toBe('b');
  });

  it('closes the focused tab with the Delete key', () => {
    seedTabs(
      [
        buildTab({ id: 'a', title: 'Airbnb', path: '/object/company/1' }),
        buildTab({ id: 'b', title: 'Qonto', path: '/object/company/2' }),
      ],
      'a',
    );

    renderTabStrip();

    act(() => {
      fireEvent.keyDown(screen.getByTestId('side-panel-tab-a'), {
        key: 'Delete',
      });
    });

    expect(
      jotaiStore.get(sidePanelTabsState.atom).tabs.map((tab) => tab.id),
    ).toEqual(['b']);
    expect(jotaiStore.get(activeSidePanelTabIdState.atom)).toBe('b');
  });

  it('labels each close affordance with the context it closes', () => {
    seedTabs(
      [buildTab({ id: 'a', title: 'Airbnb', path: '/object/company/1' })],
      'a',
    );

    renderTabStrip();

    expect(screen.getByTestId('side-panel-tab-close-a')).toHaveAttribute(
      'aria-label',
      'Close tab Airbnb',
    );
  });
});
