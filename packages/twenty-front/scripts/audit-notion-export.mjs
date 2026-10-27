// Offline conversion audit: no network uploads or server writes. Uses the real
// BlockNote parser with the default blocks and matching callout/file contracts.
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { marked } from 'marked';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { buildSync } from 'esbuild';
import { JSDOM } from 'jsdom';
const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const archivePath = process.argv[2];
if (!archivePath)
  throw new Error(
    'Usage: node packages/twenty-front/scripts/audit-notion-export.mjs /path/to/export.zip',
  );
const require = createRequire(import.meta.url);
const directory = mkdtempSync(join(tmpdir(), 'bureau-real-export-'));
try {
  const modulePath = join(directory, 'import.cjs');
  buildSync({
    stdin: {
      contents: [
        'export {planBureauArchiveImport,runBureauArchiveImport,resolveBureauArchivePath} from "./packages/twenty-front/src/modules/blocknote-editor/import/utils/bureauArchiveImport.ts";',
        'export {readZipEntries} from "./packages/twenty-front/src/modules/blocknote-editor/import/utils/zipArchiveCodec.ts";',
        'export {prepareNotionHtml} from "./packages/twenty-front/src/modules/blocknote-editor/import/utils/prepareNotionHtml.ts";',
        'export {mapImportedAttachmentsAndLinks} from "./packages/twenty-front/src/modules/blocknote-editor/import/utils/mapImportedAttachmentsAndLinks.ts";',
      ].join('\n'),
      resolveDir: root,
      loader: 'ts',
    },
    outfile: modulePath,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    logLevel: 'error',
    tsconfig: join(root, 'packages/twenty-front/tsconfig.json'),
  });
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://app.example/bureau',
  });
  for (const name of [
    'window',
    'document',
    'DOMParser',
    'Node',
    'NodeFilter',
    'Element',
    'HTMLElement',
    'HTMLInputElement',
    'MutationObserver',
    'DOMRect',
    'getComputedStyle',
  ])
    if (dom.window[name]) globalThis[name] = dom.window[name];
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
  const {
    BlockNoteEditor,
    BlockNoteSchema,
    defaultBlockSpecs,
    createBlockSpec,
  } = await import('@blocknote/core');
  const { withMultiColumn } = await import('@blocknote/xl-multi-column');
  const callout = createBlockSpec(
    {
      type: 'callout',
      propSchema: {
        emoji: { default: '💡' },
        backgroundColor: { default: 'default' },
        textColor: { default: 'default' },
      },
      content: 'inline',
    },
    {
      render() {
        const element = document.createElement('div');
        return { dom: element, contentDOM: element };
      },
    },
  );
  const file = createBlockSpec(
    {
      type: 'file',
      propSchema: {
        url: { default: '' },
        name: { default: '' },
        fileCategory: { default: 'OTHER' },
      },
      content: 'none',
    },
    {
      render() {
        return { dom: document.createElement('div') };
      },
    },
  );
  const schema = withMultiColumn(
    BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, callout: callout(), file: file() },
    }),
  );
  const editor = BlockNoteEditor.create({ schema });
  const {
    planBureauArchiveImport,
    runBureauArchiveImport,
    readZipEntries,
    prepareNotionHtml,
    mapImportedAttachmentsAndLinks,
    resolveBureauArchivePath,
  } = require(modulePath);
  const archive = new Uint8Array(readFileSync(archivePath));
  const entries = readZipEntries(archive);
  const plan = planBureauArchiveImport(entries);
  plan.sourceFile = { path: basename(archivePath), bytes: archive };
  const parses = new Map(),
    failures = [],
    missingWords = [],
    formattingDifferences = [],
    missingTextCharacters = [],
    missingReferences = [],
    typeCounts = {},
    styleCounts = {};
  let propertyTables = 0;
  const blockIds = new Set();
  let duplicateBlockIds = 0;
  const parse = (page) => {
    if (parses.has(page.path)) return parses.get(page.path);
    const prepared = prepareNotionHtml(
      page.format === 'markdown'
        ? marked.parse(page.content, { async: false, gfm: true })
        : page.content,
    );
    const blocks = mapImportedAttachmentsAndLinks(
      editor.tryParseHTMLToBlocks(prepared.html),
      {
        resolveAttachmentUrl: prepared.restoreUrl,
        resolveLinkUrl: prepared.restoreUrl,
      },
    ).blocks;
    parses.set(page.path, blocks);
    return blocks;
  };
  const flatten = (blocks) =>
    blocks.flatMap((block) => [block, ...flatten(block.children ?? [])]);
  const texts = (value) =>
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value
            .map(texts)
            .join(
              value.every(
                (item) => item && ['text', 'link'].includes(item.type),
              )
                ? ''
                : ' ',
            )
        : value && typeof value === 'object'
          ? typeof value.text === 'string'
            ? value.text
            : [
                ...['content', 'children', 'rows', 'cells'].map((key) =>
                  texts(value[key]),
                ),
                value.props?.caption ?? '',
                value.props?.emoji ?? '',
              ].join(' ')
          : '';
  const words = (text) =>
    (text.normalize('NFC').match(/[\p{L}\p{N}]+/gu) ?? []).reduce(
      (result, word) => (result.set(word, (result.get(word) ?? 0) + 1), result),
      new Map(),
    );
  const characterLength = (text) =>
    (text.normalize('NFC').match(/[\p{L}\p{N}]/gu) ?? []).length;
  const styleInventory = (sourceDocument, blocks) => {
    const expected = {},
      actual = {};
    const add = (inventory, style, count) => {
      inventory[style] = (inventory[style] ?? 0) + count;
    };
    const walker = sourceDocument.createTreeWalker(
      sourceDocument.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      const count = characterLength(node.textContent ?? '');
      if (parent?.closest('strong,b')) add(expected, 'bold', count);
      if (parent?.closest('em,i')) add(expected, 'italic', count);
      if (parent?.closest('del,s')) add(expected, 'strike', count);
      if (parent?.closest('code') && !parent.closest('pre'))
        add(expected, 'code', count);
      for (const style of ['textColor', 'backgroundColor']) {
        let element = parent;
        while (element && element !== sourceDocument.body) {
          if (
            element.style[style === 'textColor' ? 'color' : 'backgroundColor']
          ) {
            add(expected, style, count);
            break;
          }
          element = element.parentElement;
        }
      }
    }
    const walk = (value, inherited = {}) => {
      if (Array.isArray(value)) {
        value.forEach((item) => walk(item, inherited));
        return;
      }
      if (!value || typeof value !== 'object') return;
      const styles = {
        ...inherited,
        ...(value.props ?? {}),
        ...(value.styles ?? {}),
      };
      if (typeof value.props?.emoji === 'string') {
        for (const style of ['textColor', 'backgroundColor'])
          if (styles[style] && styles[style] !== 'default')
            add(actual, style, characterLength(value.props.emoji));
      }
      if (typeof value.text === 'string') {
        for (const style of [
          'bold',
          'italic',
          'strike',
          'code',
          'textColor',
          'backgroundColor',
        ])
          if (styles[style] && styles[style] !== 'default')
            add(actual, style, characterLength(value.text));
      }
      for (const key of ['content', 'children', 'rows', 'cells'])
        walk(value[key], styles);
    };
    walk(blocks);
    return Object.entries(expected)
      .filter(([style, count]) => (actual[style] ?? 0) < count)
      .map(([style, count]) => ({
        style,
        expected: count,
        actual: actual[style] ?? 0,
      }));
  };
  for (const page of plan.pages) {
    try {
      const blocks = parse(page);
      const doc = new DOMParser().parseFromString(page.content, 'text/html');
      propertyTables += doc.querySelectorAll('table.properties').length;
      const formatting = styleInventory(doc, blocks);
      if (formatting.length)
        formattingDifferences.push({
          path: page.path,
          differences: formatting,
        });
      const sourceText = (node) =>
        node.nodeName === 'BR'
          ? ' '
          : node.nodeType === 3
            ? node.textContent
            : (/^(?:BODY|P|DIV|H[1-6]|TD|TH|TR|TABLE|LI|UL|OL|ASIDE|FIGURE|SUMMARY|PRE|BLOCKQUOTE)$/.test(
                node.nodeName,
              )
                ? ' '
                : '') +
              [...node.childNodes].map(sourceText).join('') +
              (/^(?:BODY|P|DIV|H[1-6]|TD|TH|TR|TABLE|LI|UL|OL|ASIDE|FIGURE|SUMMARY|PRE|BLOCKQUOTE)$/.test(
                node.nodeName,
              )
                ? ' '
                : '');
      const sourceParts = [];
      for (const path of page.sourcePaths ?? [page.path]) {
        const entry = plan.entriesByPath.get(path);
        if (!entry) continue;
        if (/\.html?$/i.test(path)) {
          const sourceDoc = new DOMParser().parseFromString(
            new TextDecoder().decode(entry.bytes),
            'text/html',
          );
          sourceDoc
            .querySelectorAll('script,style,.property-icon,.status-dot')
            .forEach((element) => element.remove());
          sourceDoc
            .querySelectorAll('[data-notion-equation]')
            .forEach(
              (element) =>
                (element.textContent = element.getAttribute(
                  'data-notion-equation',
                )),
            );
          sourceDoc.querySelectorAll('[data-emoji]').forEach((element) => {
            if (!element.textContent.trim())
              element.textContent = element.getAttribute('data-emoji');
          });
          const body = sourceDoc.querySelector('.page-body');
          const sourceElements = body
            ? [
                body,
                ...sourceDoc.querySelectorAll(
                  'table.properties,header .page-description',
                ),
              ].filter(
                (element, index, array) =>
                  array.indexOf(element) === index &&
                  !array.some(
                    (parent) => parent !== element && parent.contains(element),
                  ),
              )
            : [sourceDoc.body];
          sourceParts.push(...sourceElements.map(sourceText));
        } else if (/\.csv$/i.test(path))
          sourceParts.push(
            Papa.parse(new TextDecoder().decode(entry.bytes), {
              skipEmptyLines: true,
              delimiter: ',',
            })
              .data.flat()
              .join(' '),
          );
        else sourceParts.push(page.content);
      }
      const originalText = sourceParts.join(' ');
      const expected = words(originalText);
      const actual = words(texts(blocks));
      const missing = [...expected].filter(
        ([word, count]) => (actual.get(word) ?? 0) < count,
      );
      const chars = (text) =>
        [...(text.normalize('NFC').match(/[\p{L}\p{N}]/gu) ?? [])].reduce(
          (result, char) => (
            result.set(char, (result.get(char) ?? 0) + 1),
            result
          ),
          new Map(),
        );
      const expectedChars = chars(originalText);
      const actualChars = chars(texts(blocks));
      const missingChars = [...expectedChars].filter(
        ([char, count]) => (actualChars.get(char) ?? 0) < count,
      );
      if (missingChars.length)
        missingTextCharacters.push({ path: page.path, missing: missingChars });
      if (missing.length)
        missingWords.push({
          path: page.path,
          missing: missing.slice(0, 8),
          total: missing.length,
        });
      for (const block of flatten(blocks)) {
        typeCounts[block.type] = (typeCounts[block.type] ?? 0) + 1;
        if (block.id) {
          if (blockIds.has(block.id)) duplicateBlockIds++;
          blockIds.add(block.id);
        }
      }
      const inline = (value) => {
        if (Array.isArray(value)) value.forEach(inline);
        else if (value && typeof value === 'object') {
          if (value.styles)
            for (const key of Object.keys(value.styles))
              styleCounts[key] = (styleCounts[key] ?? 0) + 1;
          Object.entries(value)
            .filter(([key]) => key !== 'styles')
            .forEach(([, v]) => {
              if (typeof v === 'object') inline(v);
            });
        }
      };
      inline(blocks);
      mapImportedAttachmentsAndLinks(blocks, {
        resolveAttachmentUrl: check,
        resolveLinkUrl: check,
      });
      function check(url) {
        const path = resolveBureauArchivePath(page.path, url);
        if (path !== null && !plan.entriesByPath.has(path))
          missingReferences.push({ page: page.path, url });
        return url;
      }
      BlockNoteEditor.create({
        schema,
        initialContent: JSON.parse(JSON.stringify(blocks)),
      });
    } catch (error) {
      failures.push({ path: page.path, error: error.message });
    }
  }
  const uploads = new Set(),
    creates = new Set(),
    saves = new Set();
  const session = {
    documentIdsByPath: new Map(
      plan.pages.map((p, index) => [p.path, `document-${index}`]),
    ),
    createdPaths: new Set(),
    completedPaths: new Set(),
    attachmentUrls: new Map(),
  };
  await runBureauArchiveImport({
    plan,
    session,
    createPage: async (page, id, parent) => {
      assert.ok(!creates.has(id));
      assert.ok(parent === null || creates.has(parent));
      creates.add(id);
    },
    parsePage: async (page) => parse(page),
    mapBlocks: (blocks, resolveUrl) =>
      mapImportedAttachmentsAndLinks(blocks, {
        resolveAttachmentUrl: resolveUrl,
        preserveUnmappedAttachments: true,
        resolveLinkUrl: resolveUrl,
      }),
    uploadAttachment: async (entry, id) => {
      uploads.add(entry.path);
      assert.deepEqual(
        entry.bytes,
        (entry.path === plan.sourceFile.path
          ? plan.sourceFile
          : plan.entriesByPath.get(entry.path)
        ).bytes,
      );
      return `https://files.example/${encodeURIComponent(entry.path)}`;
    },
    savePage: async (id, blocks) => {
      saves.add(id);
      BlockNoteEditor.create({
        schema,
        initialContent: JSON.parse(JSON.stringify(blocks)),
      });
    },
    getPageUrl: (id) => `/bureau/${id}`,
    onProgress: () => {},
  });
  console.log(
    JSON.stringify(
      {
        sha256: createHash('sha256').update(archive).digest('hex'),
        entries: entries.length,
        pages: plan.pages.length,
        roots: plan.pages
          .filter((p) => p.parentPath === null)
          .map((p) => ({ title: p.title, path: p.path })),
        nested: plan.pages.filter((p) => p.parentPath !== null).length,
        sourceAliases: plan.canonicalPathByPath.size,
        syntheticContainers: plan.pages
          .filter((p) => p.sourcePaths?.length === 0)
          .map((p) => p.title),
        propertyTables,
        failures,
        segmentationDifferences: missingWords,
        formattingDifferences,
        missingTextCharacters,
        missingReferences,
        duplicateBlockIds,
        typeCounts,
        styleCounts,
        created: creates.size,
        saved: saves.size,
        completed: session.completedPaths.size,
        uploadedPaths: uploads.size,
        warnings: [...session.warningCountsByPath.values()].reduce(
          (a, b) => a + b,
          0,
        ),
      },
      null,
      2,
    ),
  );
  if (
    failures.length ||
    formattingDifferences.length ||
    missingTextCharacters.length ||
    missingReferences.length ||
    duplicateBlockIds
  )
    process.exitCode = 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
