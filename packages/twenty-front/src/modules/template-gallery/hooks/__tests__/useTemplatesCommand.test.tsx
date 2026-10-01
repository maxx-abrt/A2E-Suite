import { useTemplatesCommand } from '@/template-gallery/hooks/useTemplatesCommand';
import { sidePanelSearchState } from '@/side-panel/states/sidePanelSearchState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { i18n } from '@lingui/core';
import { renderHook } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';

i18n.activate('en');

const Wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
);

describe('useTemplatesCommand', () => {
  beforeEach(() => {
    jotaiStore.set(sidePanelSearchState.atom, '');
  });

  it('exposes a registered Templates command id and label', () => {
    const { result } = renderHook(() => useTemplatesCommand(), {
      wrapper: Wrapper,
    });

    expect(result.current.templatesCommandId).toBe('templates');
    expect(result.current.templatesCommandLabel).toBe('Templates');
    expect(result.current.shouldDisplayTemplatesCommand).toBe(true);
  });

  it('hides the command when the search text does not match', () => {
    jotaiStore.set(sidePanelSearchState.atom, 'zzz');

    const { result } = renderHook(() => useTemplatesCommand(), {
      wrapper: Wrapper,
    });

    expect(result.current.shouldDisplayTemplatesCommand).toBe(false);
  });

  it('shows the command when the search text matches', () => {
    jotaiStore.set(sidePanelSearchState.atom, 'temp');

    const { result } = renderHook(() => useTemplatesCommand(), {
      wrapper: Wrapper,
    });

    expect(result.current.shouldDisplayTemplatesCommand).toBe(true);
  });
});
