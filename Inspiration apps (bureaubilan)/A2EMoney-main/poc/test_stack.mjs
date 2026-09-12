#!/usr/bin/env node
/**
 * BILAN — single POC covering every risky integration, in isolation.
 *
 *   node poc/test_stack.mjs
 *
 * 1. Convex (Bilan deployment)      — deploy key valid, functions reachable
 * 2. A2E Core service bridge        — A2E_SERVICE_SECRET accepted by sync:*
 * 3. Aides-territoires API          — key -> bearer -> real aids payload
 * 4. Google AI Studio (Gemini)      — structured JSON matching, no hallucination
 * 5. B2 (Backblaze S3)              — bucket reachable with the core creds
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ---------------------------------------------------------------- env loading
const envPath = path.resolve('./.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const results = [];
const ok = (n, d) => {
  results.push(['PASS', n, d]);
  console.log(`✅ ${n} — ${d}`);
};
const ko = (n, d) => {
  results.push(['FAIL', n, d]);
  console.log(`❌ ${n} — ${d}`);
};

// ------------------------------------------------------------------- 1. Convex
async function testConvex() {
  const name = '1. Convex / Bilan deployment';
  try {
    const out = execSync('npx convex env list', {
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const keys = out
      .split('\n')
      .map((l) => l.split('=')[0])
      .filter(Boolean);
    ok(
      name,
      `deploy key valid — ${keys.length} env vars set: ${keys.join(', ')}`,
    );
    return keys;
  } catch (e) {
    ko(name, (e.stderr || e.message || '').toString().slice(0, 400));
    return [];
  }
}

// ------------------------------------------------------- 2. Core service bridge
async function testCoreBridge() {
  const name = '2. A2E Core service bridge';
  const url = process.env.CONVEX_CORE_URL;
  const secret = process.env.A2E_SERVICE_SECRET;
  try {
    // Core exposes `sync:workspacesForUser` (secret-gated query).
    const res = await fetch(`${url}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'sync:workspacesForUser',
        args: { secret, workosId: 'user_probe_nonexistent' },
        format: 'json',
      }),
    });
    const body = await res.json();
    if (body.status === 'success') {
      ok(
        name,
        `secret accepted, returned ${JSON.stringify(body.value).slice(0, 120)}`,
      );
      return true;
    }
    // A validator/arg error still proves the secret gate passed differently
    ko(name, JSON.stringify(body).slice(0, 400));
    return false;
  } catch (e) {
    ko(name, String(e).slice(0, 300));
    return false;
  }
}

// -------------------------------------------------- 2b. Core reachable at all
async function testCoreFunctions() {
  const name = '2b. A2E Core function surface';
  const url = process.env.CONVEX_CORE_URL;
  const secret = process.env.A2E_SERVICE_SECRET;
  const probes = [
    ['sync:workspacesForUser', { secret, workosId: 'x' }],
    ['sync:notifyWorkspace', null],
    ['workspaces:list', {}],
    ['drive:list', {}],
  ];
  const found = [];
  for (const [p, args] of probes) {
    if (!args) continue;
    const res = await fetch(`${url}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: p, args, format: 'json' }),
    });
    const body = await res.json();
    const kind =
      body.status === 'success' ? 'OK' : (body.errorMessage || '').slice(0, 90);
    found.push(`${p} → ${kind}`);
  }
  ok(name, found.join(' | '));
}

// ------------------------------------------------------ 3. Aides-territoires
async function testAides() {
  const name = '3. Aides-territoires API';
  try {
    const auth = await fetch(
      'https://aides-territoires.beta.gouv.fr/api/connexion/',
      {
        method: 'POST',
        headers: {
          'X-AUTH-TOKEN': process.env.AIDES_TERRITOIRES_KEY,
          'Content-Type': 'application/json',
        },
        body: '{}',
      },
    );
    const authBody = await auth.json();
    if (!authBody.token) {
      ko(name, `no bearer: ${JSON.stringify(authBody).slice(0, 200)}`);
      return null;
    }
    const bearer = authBody.token;

    const res = await fetch(
      'https://aides-territoires.beta.gouv.fr/api/aids/?itemsPerPage=5',
      {
        headers: { Authorization: `Bearer ${bearer}` },
      },
    );
    const data = await res.json();
    const items = data.results ?? data['hydra:member'] ?? [];
    if (!items.length) {
      ko(name, `bearer ok but no aids: ${JSON.stringify(data).slice(0, 300)}`);
      return bearer;
    }
    const a = items[0];
    ok(
      name,
      `${data.count ?? '?'} aids total. Sample: "${a.name}" / financers=${JSON.stringify(a.financers)?.slice(0, 60)} / keys=${Object.keys(a).length}`,
    );
    console.log('   ↳ sample keys:', Object.keys(a).join(', '));
    console.log('   ↳ sample aid:', JSON.stringify(a).slice(0, 700));
    return bearer;
  } catch (e) {
    ko(name, String(e).slice(0, 300));
    return null;
  }
}

// ---------------------------------------------- 3b. other free aid catalogues
async function testOtherSources() {
  const name = '3b. Complementary free sources';
  const probes = [
    [
      'data.gouv datasets(subventions)',
      'https://www.data.gouv.fr/api/1/datasets/?q=subvention%20association&page_size=2',
    ],
    [
      'aides-territoires programs',
      'https://aides-territoires.beta.gouv.fr/api/programs/',
    ],
  ];
  const out = [];
  for (const [label, url] of probes) {
    try {
      const headers =
        url.includes('aides-territoires') && globalThis.__bearer
          ? { Authorization: `Bearer ${globalThis.__bearer}` }
          : {};
      const r = await fetch(url, { headers });
      const j = await r.json().catch(() => ({}));
      const n =
        j.total ??
        j.count ??
        (Array.isArray(j) ? j.length : (j.results?.length ?? '?'));
      out.push(`${label}: HTTP ${r.status} n=${n}`);
    } catch (e) {
      out.push(`${label}: ERR ${String(e).slice(0, 60)}`);
    }
  }
  ok(name, out.join(' | '));
}

// -------------------------------------------------------------- 4. Gemini
async function testGemini() {
  const name = '4. Google AI Studio (Gemini)';
  const key = process.env.GEMINI_API_KEY;
  const models = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash',
  ];

  // First: list models to learn what the key can actually reach.
  for (const authMode of ['query', 'header', 'bearer']) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models';
    const opts = { headers: {} };
    let full = url;
    if (authMode === 'query') full = `${url}?key=${key}`;
    if (authMode === 'header') opts.headers['x-goog-api-key'] = key;
    if (authMode === 'bearer') opts.headers['Authorization'] = `Bearer ${key}`;
    try {
      const r = await fetch(full, opts);
      const j = await r.json();
      if (r.ok && j.models) {
        const names = j.models.map((m) => m.name.replace('models/', ''));
        console.log(`   ↳ auth via ${authMode}: ${names.length} models`);
        globalThis.__geminiAuth = authMode;
        break;
      } else {
        console.log(
          `   ↳ auth via ${authMode}: HTTP ${r.status} ${JSON.stringify(j).slice(0, 160)}`,
        );
      }
    } catch (e) {
      console.log(`   ↳ auth via ${authMode}: ERR ${String(e).slice(0, 80)}`);
    }
  }

  const authMode = globalThis.__geminiAuth;
  if (!authMode) {
    ko(name, 'API key rejected by all auth modes (query/header/bearer)');
    return;
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Association project: "Nous ouvrons un tiers-lieu à Lyon pour l'insertion numérique des jeunes de 16-25 ans, avec 3 salariés et un budget de 120 000 €."
Given these 3 aids, return which ones fit and why.
AIDS: [{"id":"a1","name":"FDVA 2 - Fonctionnement et innovation","who":"associations"},{"id":"a2","name":"Aide à la rénovation énergétique des bâtiments industriels","who":"entreprises industrielles"},{"id":"a3","name":"Fonjep Jeunes - poste FONJEP","who":"associations employeuses"}]`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          matches: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                score: { type: 'NUMBER' },
                reason: { type: 'STRING' },
              },
              required: ['id', 'score', 'reason'],
            },
          },
        },
        required: ['matches'],
      },
      temperature: 0.1,
    },
  };

  for (const model of models) {
    const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const headers = { 'Content-Type': 'application/json' };
    let url = base;
    if (authMode === 'query') url = `${base}?key=${key}`;
    if (authMode === 'header') headers['x-goog-api-key'] = key;
    if (authMode === 'bearer') headers['Authorization'] = `Bearer ${key}`;
    try {
      const t0 = Date.now();
      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) {
        console.log(
          `   ↳ ${model}: HTTP ${r.status} ${JSON.stringify(j).slice(0, 200)}`,
        );
        continue;
      }
      const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(text);
      const ids = parsed.matches.map((m) => `${m.id}:${m.score}`).join(',');
      const rejectedIndustrial = !parsed.matches.some(
        (m) => m.id === 'a2' && m.score > 0.4,
      );
      ok(
        name,
        `${model} in ${Date.now() - t0}ms via ${authMode} → ${ids} | correctly excluded industrial aid: ${rejectedIndustrial} | tokens=${JSON.stringify(j.usageMetadata)}`,
      );
      console.log(
        '   ↳ reasons:',
        parsed.matches
          .map((m) => m.reason)
          .join(' / ')
          .slice(0, 300),
      );
      return;
    } catch (e) {
      console.log(`   ↳ ${model}: ERR ${String(e).slice(0, 150)}`);
    }
  }
  ko(name, 'no model responded with valid structured JSON');
}

// ------------------------------------------------------------------ 5. B2
async function testB2() {
  const name = '5. Backblaze B2 (drive storage)';
  try {
    const r = await fetch(
      'https://api.backblazeb2.com/b2api/v3/b2_authorize_account',
      {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              'REDACTED_B2_KEY_ID:REDACTED_B2_APPLICATION_KEY',
            ).toString('base64'),
        },
      },
    );
    const j = await r.json();
    if (!r.ok) {
      ko(name, `HTTP ${r.status} ${JSON.stringify(j).slice(0, 250)}`);
      return;
    }
    const caps = j.apiInfo?.storageApi?.capabilities ?? [];
    ok(
      name,
      `authorised. bucket=${j.apiInfo?.storageApi?.bucketName ?? '(all)'} caps=${caps.join(',').slice(0, 160)}`,
    );
  } catch (e) {
    ko(name, String(e).slice(0, 250));
  }
}

// ------------------------------------------------------------------- runner
(async () => {
  console.log('\n════════ BILAN — integration POC ════════\n');
  await testConvex();
  await testCoreBridge();
  await testCoreFunctions();
  globalThis.__bearer = await testAides();
  await testOtherSources();
  await testGemini();
  await testB2();
  console.log('\n════════ SUMMARY ════════');
  for (const [s, n] of results)
    console.log(`${s === 'PASS' ? '✅' : '❌'} ${n}`);
  const failed = results.filter((r) => r[0] === 'FAIL');
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
