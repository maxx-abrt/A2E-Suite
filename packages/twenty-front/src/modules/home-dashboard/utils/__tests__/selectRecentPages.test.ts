import {
  type HomeRecentPageSummary,
  selectRecentPages,
} from '@/home-dashboard/utils/selectRecentPages';

const buildPage = (
  overrides: Partial<HomeRecentPageSummary> & { id: string },
): HomeRecentPageSummary => ({
  title: 'Page',
  kind: 'DOCUMENT',
  updatedAt: '2026-09-20T00:00:00.000Z',
  ...overrides,
});

describe('selectRecentPages', () => {
  it('sorts freshest first', () => {
    const pages = [
      buildPage({ id: 'older', updatedAt: '2026-09-10T00:00:00.000Z' }),
      buildPage({ id: 'newer', updatedAt: '2026-09-25T00:00:00.000Z' }),
    ];

    expect(
      selectRecentPages(pages, { limit: 10 }).map((page) => page.id),
    ).toEqual(['newer', 'older']);
  });

  it('excludes templates', () => {
    const pages = [
      buildPage({ id: 'template', kind: 'TEMPLATE' }),
      buildPage({ id: 'document', kind: 'DOCUMENT' }),
    ];

    expect(
      selectRecentPages(pages, { limit: 10 }).map((page) => page.id),
    ).toEqual(['document']);
  });

  it('drops pages without a valid updated timestamp and honours the limit', () => {
    const pages = [
      buildPage({ id: 'a', updatedAt: '2026-09-12T00:00:00.000Z' }),
      buildPage({ id: 'b', updatedAt: '2026-09-13T00:00:00.000Z' }),
      buildPage({ id: 'undated', updatedAt: null }),
    ];

    expect(
      selectRecentPages(pages, { limit: 1 }).map((page) => page.id),
    ).toEqual(['b']);
  });
});
