import { parseCarenewsAids } from '../../lib/carenews-parse.ts';
import {
  CARENEWS_BASE_URL,
  type NormalisedAid,
} from '../../lib/subvention-sources.ts';

// Carenews is the reference feed of foundation and corporate calls for
// projects. There is no API, so the paginated listing is read as HTML; a page
// that yields nothing ends the walk rather than raising, because the end of the
// pagination looks exactly like that.

const LISTING_PATH = '/appels_a_projets';

export const fetchCarenewsAids = async ({
  maxPages = 5,
}: { maxPages?: number } = {}): Promise<{
  aids: NormalisedAid[];
  pagesRead: number;
}> => {
  const aids: NormalisedAid[] = [];
  const seen = new Set<string>();
  let pagesRead = 0;

  for (let page = 1; page <= maxPages; page++) {
    const url =
      page === 1
        ? `${CARENEWS_BASE_URL}${LISTING_PATH}`
        : `${CARENEWS_BASE_URL}${LISTING_PATH}/${page}/`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'A2E-Bilan/1.0 (+catalogue de subventions)' },
    });

    if (!response.ok) {
      if (page === 1) {
        throw new Error(`Carenews a répondu HTTP ${response.status}.`);
      }

      break;
    }

    pagesRead += 1;

    const pageAids = parseCarenewsAids(await response.text());

    if (pageAids.length === 0) {
      break;
    }

    for (const aid of pageAids) {
      if (seen.has(aid.sourceKey)) {
        continue;
      }

      seen.add(aid.sourceKey);
      aids.push(aid);
    }
  }

  return { aids, pagesRead };
};
