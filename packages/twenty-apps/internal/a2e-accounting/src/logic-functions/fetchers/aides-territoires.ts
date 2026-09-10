import {
  AIDES_TERRITOIRES_BASE_URL,
  normaliseAidesTerritoiresAid,
  type NormalisedAid,
} from '../../lib/subvention-sources.ts';

// Aides-territoires is the French state's own aid aggregator. The permanent
// key is exchanged for a 24 h bearer, then the aid list is walked page by page
// through the `next` cursor the API hands back.

export const AIDES_TERRITOIRES_KEY_VARIABLE = 'AIDES_TERRITOIRES_KEY';

const CONNECT_PATH = '/api/connexion/';
const AIDS_PATH = '/api/aids/';

export const getAidesTerritoiresKey = (): string | undefined => {
  const key = process.env[AIDES_TERRITOIRES_KEY_VARIABLE];

  return key !== undefined && key.trim().length > 0 ? key.trim() : undefined;
};

export const exchangeAidesTerritoiresToken = async (
  apiKey: string,
): Promise<string> => {
  const response = await fetch(`${AIDES_TERRITOIRES_BASE_URL}${CONNECT_PATH}`, {
    method: 'POST',
    headers: { 'X-AUTH-TOKEN': apiKey },
  });

  if (!response.ok) {
    throw new Error(
      `Aides-territoires refuse la clé API (HTTP ${response.status}). Vérifiez la variable ${AIDES_TERRITOIRES_KEY_VARIABLE}.`,
    );
  }

  const body = (await response.json()) as { token?: string };

  if (typeof body.token !== 'string' || body.token.length === 0) {
    throw new Error("Aides-territoires n'a pas renvoyé de jeton Bearer.");
  }

  return body.token;
};

type AidsPage = {
  count?: number;
  next?: string | null;
  results?: Record<string, unknown>[];
};

export const fetchAidesTerritoiresAids = async ({
  apiKey,
  itemsPerPage = 100,
  maxPages = 60,
}: {
  apiKey: string;
  itemsPerPage?: number;
  maxPages?: number;
}): Promise<{ aids: NormalisedAid[]; total: number; pagesRead: number }> => {
  const token = await exchangeAidesTerritoiresToken(apiKey);
  const aids: NormalisedAid[] = [];
  const seen = new Set<string>();

  let url: string | undefined =
    `${AIDES_TERRITOIRES_BASE_URL}${AIDS_PATH}?page=1&itemsPerPage=${itemsPerPage}`;
  let total = 0;
  let pagesRead = 0;

  while (url !== undefined && pagesRead < maxPages) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(
        `Aides-territoires a répondu HTTP ${response.status} sur ${url}.`,
      );
    }

    const page = (await response.json()) as AidsPage;

    pagesRead += 1;
    total = page.count ?? total;

    for (const raw of page.results ?? []) {
      const aid = normaliseAidesTerritoiresAid(raw);

      if (aid === undefined || seen.has(aid.sourceKey)) {
        continue;
      }

      seen.add(aid.sourceKey);
      aids.push(aid);
    }

    url = typeof page.next === 'string' && page.next.length > 0 ? page.next : undefined;
  }

  return { aids, total: total || aids.length, pagesRead };
};
