import { SIDE_PANEL_TABS_SCHEMA_VERSION } from '@/side-panel/tabs/constants/SidePanelTabsSchemaVersion';
import { type SidePanelTab } from '@/side-panel/tabs/types/SidePanelTab';
import {
  isValidSidePanelTab,
  isValidSidePanelTabsSession,
} from '@/side-panel/tabs/utils/isValidSidePanelTabsSession';
import { SidePanelPages } from 'twenty-shared/types';

const validRoutedItem = {
  pageId: 'page-1',
  page: SidePanelPages.RoutedPage,
  pageTitle: 'Airbnb',
  pageIconKey: 'IconBuildingSkyscraper',
  routedLocation: {
    pathname: '/object/company/1',
    search: '',
    hash: '',
    state: null,
    key: 'key-1',
  },
  routedFlowStateScopeId: 'scope-1',
};

const validTab: SidePanelTab = {
  id: 'tab-1',
  title: 'Airbnb',
  iconKey: 'IconBuildingSkyscraper',
  stack: [validRoutedItem],
  activePageId: 'page-1',
  contextKey: 'route:/object/company/1',
  createdAt: 1,
  updatedAt: 2,
};

describe('isValidSidePanelTab', () => {
  it('accepts a well-formed tab', () => {
    expect(isValidSidePanelTab(validTab)).toBe(true);
  });

  it('rejects a tab whose active page is not in its stack', () => {
    expect(
      isValidSidePanelTab({ ...validTab, activePageId: 'missing-page' }),
    ).toBe(false);
  });

  it('rejects a tab with an empty stack', () => {
    expect(isValidSidePanelTab({ ...validTab, stack: [] })).toBe(false);
  });

  it('rejects a routed entry without its location', () => {
    expect(
      isValidSidePanelTab({
        ...validTab,
        stack: [{ ...validRoutedItem, routedLocation: undefined }],
      }),
    ).toBe(false);
  });

  it('rejects an unknown page identifier', () => {
    expect(
      isValidSidePanelTab({
        ...validTab,
        stack: [{ ...validRoutedItem, page: 'page-from-the-future' }],
      }),
    ).toBe(false);
  });

  it('rejects a serialized React component leaking into the payload', () => {
    expect(
      isValidSidePanelTab({
        ...validTab,
        stack: [{ ...validRoutedItem, pageIconKey: { $$typeof: 'react' } }],
      }),
    ).toBe(false);
  });
});

describe('isValidSidePanelTabsSession', () => {
  it('accepts a well-formed session', () => {
    expect(
      isValidSidePanelTabsSession({
        version: SIDE_PANEL_TABS_SCHEMA_VERSION,
        tabs: [validTab],
      }),
    ).toBe(true);
  });

  it('accepts an empty session', () => {
    expect(
      isValidSidePanelTabsSession({
        version: SIDE_PANEL_TABS_SCHEMA_VERSION,
        tabs: [],
      }),
    ).toBe(true);
  });

  it('rejects a session written by another schema version', () => {
    expect(
      isValidSidePanelTabsSession({
        version: SIDE_PANEL_TABS_SCHEMA_VERSION + 1,
        tabs: [validTab],
      }),
    ).toBe(false);
  });

  it('rejects duplicated tab ids', () => {
    expect(
      isValidSidePanelTabsSession({
        version: SIDE_PANEL_TABS_SCHEMA_VERSION,
        tabs: [validTab, validTab],
      }),
    ).toBe(false);
  });

  it('rejects non-object payloads', () => {
    expect(isValidSidePanelTabsSession(null)).toBe(false);
    expect(isValidSidePanelTabsSession('[]')).toBe(false);
    expect(isValidSidePanelTabsSession([])).toBe(false);
  });

  it('rejects a session over the tab limit', () => {
    expect(
      isValidSidePanelTabsSession({
        version: SIDE_PANEL_TABS_SCHEMA_VERSION,
        tabs: Array.from({ length: 20 }, (_unused, index) => ({
          ...validTab,
          id: `tab-${index}`,
        })),
      }),
    ).toBe(false);
  });
});
