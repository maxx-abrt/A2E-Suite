import { A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER } from '@/a2e-workspace/constants/A2eSuiteApplicationUniversalIdentifiers';
import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import {
  NEW_PAGE_COMMAND_ID,
  useNewPageCommand,
} from '@/quick-capture/hooks/useNewPageCommand';
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

const setInstalledApplications = (universalIdentifiers: string[]) => {
  jotaiStore.set(metadataStoreState.atomFamily('applications'), {
    current: universalIdentifiers.map((universalIdentifier) => ({
      universalIdentifier,
    })),
    draft: [],
    status: 'up-to-date',
  });
};

describe('useNewPageCommand', () => {
  beforeEach(() => {
    jotaiStore.set(sidePanelSearchState.atom, '');
    setInstalledApplications([
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    ]);
  });

  it('exposes the New page command id and label when a2e-documents is installed', () => {
    const { result } = renderHook(() => useNewPageCommand(), {
      wrapper: Wrapper,
    });

    expect(result.current.newPageCommandId).toBe(NEW_PAGE_COMMAND_ID);
    expect(result.current.newPageCommandLabel).toBe('New page');
    expect(result.current.shouldDisplayNewPageCommand).toBe(true);
  });

  it('hides the command without a2e-documents', () => {
    setInstalledApplications([]);

    const { result } = renderHook(() => useNewPageCommand(), {
      wrapper: Wrapper,
    });

    expect(result.current.shouldDisplayNewPageCommand).toBe(false);
  });

  it('hides the command when the search text does not match', () => {
    jotaiStore.set(sidePanelSearchState.atom, 'zzz');

    const { result } = renderHook(() => useNewPageCommand(), {
      wrapper: Wrapper,
    });

    expect(result.current.shouldDisplayNewPageCommand).toBe(false);
  });

  it('shows the command when the search text matches', () => {
    jotaiStore.set(sidePanelSearchState.atom, 'page');

    const { result } = renderHook(() => useNewPageCommand(), {
      wrapper: Wrapper,
    });

    expect(result.current.shouldDisplayNewPageCommand).toBe(true);
  });
});
