import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchAidesTerritoiresAids } from '../fetchers/aides-territoires.ts';
import { AIDES_TERRITOIRES_BASE_URL } from '../../lib/subvention-sources.ts';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

test('supports relative pagination on the same authenticated portal', async (context) => {
  const urls: string[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(String(url));
    if (urls.length === 1) return json({ token: 'test-bearer' });
    return json({
      results: [],
      next: urls.length === 2 ? '/api/aids/?page=2' : null,
    });
  });
  const result = await fetchAidesTerritoiresAids({ apiKey: 'test-key' });
  assert.equal(result.pagesRead, 2);
  assert.equal(urls[2], `${AIDES_TERRITOIRES_BASE_URL}/api/aids/?page=2`);
});

test('never forwards the API bearer to a foreign pagination URL', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return calls === 1
      ? json({ token: 'test-bearer' })
      : json({ results: [], next: 'https://untrusted.example/api/aids/' });
  });
  await assert.rejects(
    fetchAidesTerritoiresAids({ apiKey: 'test-key' }),
    /pagination non autorisée/,
  );
  assert.equal(calls, 2);
});

test('does not treat a capped partial catalogue as a complete refresh', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return calls === 1
      ? json({ token: 'test-bearer' })
      : json({ results: [], next: '/api/aids/?page=2' });
  });
  await assert.rejects(
    fetchAidesTerritoiresAids({ apiKey: 'test-key', maxPages: 1 }),
    /incomplet/,
  );
  assert.equal(calls, 2);
});

test('rejects looping pagination instead of exhausting the worker', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return calls === 1
      ? json({ token: 'test-bearer' })
      : json({ results: [], next: '/api/aids/?page=2' });
  });
  await assert.rejects(
    fetchAidesTerritoiresAids({ apiKey: 'test-key' }),
    /répétée/,
  );
  assert.equal(calls, 3);
});
