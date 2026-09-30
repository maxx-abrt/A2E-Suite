export type HomeRecentPageSummary = {
  id: string;
  title: string;
  kind: string | null;
  updatedAt: string | null;
};

export const HOME_DOCUMENT_TEMPLATE_KIND = 'TEMPLATE';

const getTimestamp = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
};

// Templates are a reusable blueprint, not a page the member recently read, so
// the Today card lists only real documents, freshest first.
export const selectRecentPages = (
  pages: HomeRecentPageSummary[],
  { limit }: { limit: number },
): HomeRecentPageSummary[] =>
  pages
    .filter(
      (page) =>
        page.kind !== HOME_DOCUMENT_TEMPLATE_KIND &&
        getTimestamp(page.updatedAt) !== null,
    )
    .sort(
      (firstPage, secondPage) =>
        (getTimestamp(secondPage.updatedAt) ?? 0) -
        (getTimestamp(firstPage.updatedAt) ?? 0),
    )
    .slice(0, limit);
