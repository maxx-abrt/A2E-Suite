import {
  getSidePanelTabContextKeyFromPath,
  getSidePanelTabContextKeyFromSerializedItem,
} from '@/side-panel/tabs/utils/getSidePanelTabContextKey';
import {
  getSidePanelTabOpenIntent,
  isMiddleMouseButtonEvent,
} from '@/side-panel/tabs/utils/getSidePanelTabOpenIntent';
import { SidePanelPages } from 'twenty-shared/types';

describe('getSidePanelTabOpenIntent', () => {
  it('maps the middle button to a new tab', () => {
    expect(getSidePanelTabOpenIntent({ button: 1 })).toBe('new-tab');
    expect(isMiddleMouseButtonEvent({ button: 1 })).toBe(true);
  });

  it('keeps cmd/ctrl click as a real browser navigation', () => {
    expect(getSidePanelTabOpenIntent({ button: 0, metaKey: true })).toBe(
      'new-window',
    );
    expect(getSidePanelTabOpenIntent({ button: 0, ctrlKey: true })).toBe(
      'new-window',
    );
  });

  it('leaves a plain click on the historical path', () => {
    expect(getSidePanelTabOpenIntent({ button: 0 })).toBe('default');
    expect(getSidePanelTabOpenIntent({})).toBe('default');
    expect(isMiddleMouseButtonEvent({ button: 0 })).toBe(false);
  });
});

describe('getSidePanelTabContextKey', () => {
  it('derives the same key for a path and its routed item', () => {
    const keyFromItem = getSidePanelTabContextKeyFromSerializedItem({
      pageId: 'page-1',
      page: SidePanelPages.RoutedPage,
      pageTitle: 'Airbnb',
      routedLocation: {
        pathname: '/object/company/1',
        search: '',
        hash: '#notes',
        state: null,
        key: 'key-1',
      },
    });

    expect(keyFromItem).toBe(
      getSidePanelTabContextKeyFromPath('/object/company/1#timeline'),
    );
  });

  it('treats two different records as two contexts', () => {
    expect(getSidePanelTabContextKeyFromPath('/object/company/1')).not.toBe(
      getSidePanelTabContextKeyFromPath('/object/company/2'),
    );
  });

  it('keys purpose-built pages by page identity', () => {
    expect(
      getSidePanelTabContextKeyFromSerializedItem({
        pageId: 'page-2',
        page: SidePanelPages.AskAI,
        pageTitle: 'Ask AI',
      }),
    ).toBe(`page:${SidePanelPages.AskAI}`);
  });
});
