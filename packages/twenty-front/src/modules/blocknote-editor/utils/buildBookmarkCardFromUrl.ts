export type BookmarkCard = {
  url: string;
  title: string;
  hostname: string;
};

export const getBookmarkHostname = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// A web bookmark stores the URL, a display title and the hostname so the card
// renders without a network round-trip (the OG fetch is a later slice). An
// input without a resolvable hostname is rejected — never a card pointing at
// nothing.
export const buildBookmarkCardFromUrl = (
  url: string,
  title?: string,
): BookmarkCard | null => {
  const trimmedUrl = url.trim();
  const hostname = getBookmarkHostname(trimmedUrl);

  if (hostname.length === 0) {
    return null;
  }

  return {
    url: trimmedUrl,
    title: title?.trim() || hostname,
    hostname,
  };
};
