import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { templateGalleryCategoryPreselectState } from '@/template-gallery/states/templateGalleryCategoryPreselectState';
import { templateGalleryTemplateKeyPreselectState } from '@/template-gallery/states/templateGalleryTemplateKeyPreselectState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { i18n } from '@lingui/core';
import { act, renderHook } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { SidePanelPages } from 'twenty-shared/types';
import { IconFileText } from 'twenty-ui/icon';

i18n.activate('en');

const mockNavigateSidePanelMenu = jest.fn();

jest.mock('@/side-panel/hooks/useSidePanelMenu', () => ({
  useSidePanelMenu: () => ({
    navigateSidePanelMenu: mockNavigateSidePanelMenu,
  }),
}));

const Wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
);

describe('useOpenTemplateGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jotaiStore.set(templateGalleryCategoryPreselectState.atom, null);
    jotaiStore.set(templateGalleryTemplateKeyPreselectState.atom, null);
  });

  it('navigates to the gallery host surface', () => {
    const { result } = renderHook(() => useOpenTemplateGallery(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.openTemplateGallery();
    });

    expect(mockNavigateSidePanelMenu).toHaveBeenCalledWith({
      page: SidePanelPages.TemplateGallery,
      pageTitle: 'Templates',
      pageIcon: IconFileText,
      resetNavigationStack: true,
    });
    expect(
      jotaiStore.get(templateGalleryCategoryPreselectState.atom),
    ).toBeNull();
  });

  it('carries the requested category as a soft preselect', () => {
    const { result } = renderHook(() => useOpenTemplateGallery(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.openTemplateGallery({ category: 'Projets' });
    });

    expect(jotaiStore.get(templateGalleryCategoryPreselectState.atom)).toBe(
      'Projets',
    );
  });

  it('carries a requested template key as a soft preselect', () => {
    const { result } = renderHook(() => useOpenTemplateGallery(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.openTemplateGallery({
        category: 'Pages',
        templateKey: 'okr',
      });
    });

    expect(jotaiStore.get(templateGalleryTemplateKeyPreselectState.atom)).toBe(
      'okr',
    );
  });

  it('clears a previous preselect when opened without a category', () => {
    jotaiStore.set(templateGalleryCategoryPreselectState.atom, 'Bilan');
    jotaiStore.set(templateGalleryTemplateKeyPreselectState.atom, 'okr');

    const { result } = renderHook(() => useOpenTemplateGallery(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.openTemplateGallery();
    });

    expect(
      jotaiStore.get(templateGalleryCategoryPreselectState.atom),
    ).toBeNull();
    expect(
      jotaiStore.get(templateGalleryTemplateKeyPreselectState.atom),
    ).toBeNull();
  });
});
