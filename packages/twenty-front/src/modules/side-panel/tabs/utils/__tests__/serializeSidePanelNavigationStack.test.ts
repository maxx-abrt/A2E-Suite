import { type SidePanelNavigationStackItem } from '@/side-panel/states/sidePanelNavigationStackState';
import {
  deserializeSidePanelNavigationStack,
  serializeSidePanelNavigationItem,
  serializeSidePanelNavigationStack,
} from '@/side-panel/tabs/utils/serializeSidePanelNavigationStack';
import { SidePanelPages } from 'twenty-shared/types';
import { Icon123, IconDotsVertical } from 'twenty-ui/icon';

const icons = {
  Icon123,
  IconDotsVertical,
};

const getIcon = (iconKey?: string | null, defaultIconKey?: string) =>
  (icons as Record<string, typeof Icon123>)[iconKey ?? ''] ??
  (icons as Record<string, typeof Icon123>)[defaultIconKey ?? ''] ??
  Icon123;

const routedItem: SidePanelNavigationStackItem = {
  page: SidePanelPages.RoutedPage,
  pageId: 'page-1',
  pageTitle: 'Airbnb',
  pageIcon: Icon123,
  routedFlowStateScopeId: 'scope-1',
  routedLocation: {
    pathname: '/object/company/1',
    search: '?tab=notes',
    hash: '#timeline',
    state: { from: 'index' },
    key: 'key-1',
  },
};

const purposeBuiltItem = {
  page: SidePanelPages.CommandMenuDisplay,
  pageId: 'page-2',
  pageTitle: 'Command Menu',
  pageIcon: IconDotsVertical,
} as SidePanelNavigationStackItem;

describe('serializeSidePanelNavigationItem', () => {
  it('replaces the icon component with its canonical icon key', () => {
    const serialized = serializeSidePanelNavigationItem({
      item: routedItem,
      icons,
    });

    expect(serialized.pageIconKey).toBe('Icon123');
    expect(JSON.stringify(serialized)).not.toContain('function');
  });

  it('produces a payload that survives a JSON round trip', () => {
    const serialized = serializeSidePanelNavigationItem({
      item: routedItem,
      icons,
    });

    expect(JSON.parse(JSON.stringify(serialized))).toEqual(serialized);
  });

  it('drops router state that cannot be serialized', () => {
    const circularState: Record<string, unknown> = {};
    circularState.self = circularState;

    const serialized = serializeSidePanelNavigationItem({
      item: {
        ...routedItem,
        routedLocation: { ...routedItem.routedLocation, state: circularState },
      } as SidePanelNavigationStackItem,
      icons,
    });

    expect(serialized.routedLocation?.state).toBeNull();
  });

  it('omits the icon key when the icon is not part of the registry', () => {
    const serialized = serializeSidePanelNavigationItem({
      item: routedItem,
      icons: {},
    });

    expect(serialized.pageIconKey).toBeUndefined();
  });

  it('does not attach a routed location to a purpose-built page', () => {
    const serialized = serializeSidePanelNavigationItem({
      item: purposeBuiltItem,
      icons,
    });

    expect(serialized.routedLocation).toBeUndefined();
  });
});

describe('deserializeSidePanelNavigationStack', () => {
  it('restores the icon component from its key', () => {
    const serializedStack = serializeSidePanelNavigationStack({
      stack: [purposeBuiltItem, routedItem],
      icons,
    });

    const restoredStack = deserializeSidePanelNavigationStack({
      stack: serializedStack,
      getIcon,
    });

    expect(restoredStack).toHaveLength(2);
    expect(restoredStack?.[1]?.pageIcon).toBe(Icon123);
    expect(restoredStack?.[1]?.routedLocation).toEqual(
      routedItem.routedLocation,
    );
  });

  it('falls back to a canonical default icon for an unknown key', () => {
    const restoredStack = deserializeSidePanelNavigationStack({
      stack: [
        {
          pageId: 'page-1',
          page: SidePanelPages.RoutedPage,
          pageTitle: 'Airbnb',
          pageIconKey: 'IconThatNoLongerExists',
          routedLocation: {
            pathname: '/object/company/1',
            search: '',
            hash: '',
            state: null,
            key: 'key-1',
          },
        },
      ],
      getIcon,
    });

    expect(restoredStack?.[0]?.pageIcon).toBe(IconDotsVertical);
  });

  it('rejects the whole stack when one entry is unreadable', () => {
    const restoredStack = deserializeSidePanelNavigationStack({
      stack: [
        serializeSidePanelNavigationItem({ item: routedItem, icons }),
        { pageId: '', page: SidePanelPages.RoutedPage, pageTitle: 'Broken' },
      ],
      getIcon,
    });

    expect(restoredStack).toBeNull();
  });

  it('returns null for an empty stack', () => {
    expect(
      deserializeSidePanelNavigationStack({ stack: [], getIcon }),
    ).toBeNull();
  });
});
