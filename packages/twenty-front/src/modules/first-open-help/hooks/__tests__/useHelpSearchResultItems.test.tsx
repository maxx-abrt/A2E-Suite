import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { useHelpSearchResultItems } from '@/first-open-help/hooks/useHelpSearchResultItems';

const getWrapper =
  (initialPath = '/objects/tasks') =>
  ({ children }: { children: ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    </I18nProvider>
  );

describe('useHelpSearchResultItems', () => {
  it('registers a Help entry per shipped doc topic, deep-linked to its page', () => {
    const { result } = renderHook(
      () => useHelpSearchResultItems({ searchInput: 'help' }),
      { wrapper: getWrapper() },
    );

    const docEntries = result.current.helpSearchResultItems.filter((item) =>
      item.id.startsWith('a2e-help-doc-'),
    );

    expect(docEntries).toHaveLength(9);
    expect(docEntries[0].label).toContain('Help:');
    expect(docEntries[0].externalUrl).toBe(
      'https://docs.twenty.com/user-guide/a2e-suite/getting-started',
    );

    for (const entry of docEntries) {
      expect(entry.externalUrl).toMatch(
        /^https:\/\/docs\.twenty\.com\/user-guide\/a2e-suite\//,
      );
    }
  });

  it('hides the Home entry when already on the Home page', () => {
    const { result } = renderHook(
      () => useHelpSearchResultItems({ searchInput: '' }),
      { wrapper: getWrapper('/home') },
    );

    expect(
      result.current.helpSearchResultItems.find(
        (item) => item.id === 'a2e-help-open',
      ),
    ).toBeUndefined();
  });
});
