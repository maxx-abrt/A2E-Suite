import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// BlockNote's bundled CJS entry has incompatible interop under Jest. An isolated
// ESM process exercises its real parser without replacing it with a mock.
it('parses and reloads Notion structure with the real BlockNote and multi-column runtime', () => {
  const repositoryRoot = resolve(__dirname, '../../../../../../..');
  const script = String.raw`
    import assert from 'node:assert/strict';
    import {mkdtempSync, rmSync} from 'node:fs';
    import {tmpdir} from 'node:os';
    import {join} from 'node:path';
    import {createRequire} from 'node:module';
    import {buildSync} from 'esbuild';
    import {JSDOM} from 'jsdom';
    import {marked} from 'marked';
    const require = createRequire(import.meta.url);
    const root = process.argv[1];
    const directory = mkdtempSync(join(tmpdir(), 'a2e-notion-parser-'));
    try {
      const modulePath = join(directory, 'import.cjs');
      buildSync({
        stdin: {contents: [
          'export {prepareNotionHtml} from "./packages/twenty-front/src/modules/blocknote-editor/import/utils/prepareNotionHtml.ts";',
          'export {mapImportedAttachmentsAndLinks} from "./packages/twenty-front/src/modules/blocknote-editor/import/utils/mapImportedAttachmentsAndLinks.ts";',
        ].join('\n'), resolveDir: root, loader: 'ts'},
        outfile: modulePath, bundle: true, platform: 'node', format: 'cjs', logLevel: 'error',
        tsconfig: join(root, 'packages/twenty-front/tsconfig.json'),
      });
      const dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'https://app.example/bureau'});
      for (const name of ['window', 'document', 'DOMParser', 'Node', 'Element', 'HTMLElement', 'HTMLInputElement', 'MutationObserver', 'DOMRect', 'getComputedStyle']) {
        if (dom.window[name]) globalThis[name] = dom.window[name];
      }
      Object.defineProperty(globalThis, 'navigator', {value: dom.window.navigator, configurable: true});
      const {BlockNoteEditor, BlockNoteSchema, defaultBlockSpecs, createBlockSpec} = await import('@blocknote/core');
      const {withMultiColumn} = await import('@blocknote/xl-multi-column');
      const {prepareNotionHtml, mapImportedAttachmentsAndLinks} = require(modulePath);
      const callout = createBlockSpec({type: 'callout', propSchema: {emoji: {default: '💡'}}, content: 'inline'}, {
        render() { const element = document.createElement('div'); return {dom: element, contentDOM: element}; },
      });
      const file = createBlockSpec({type: 'file', propSchema: {url: {default: ''}, name: {default: ''}, fileCategory: {default: 'OTHER'}}, content: 'none'}, {
        render() { return {dom: document.createElement('div')}; },
      });
      const schema = withMultiColumn(BlockNoteSchema.create({blockSpecs: {...defaultBlockSpecs, callout: callout(), file: file()}}));
      const editor = BlockNoteEditor.create({schema});
      const parse = (html) => {
        const prepared = prepareNotionHtml(html);
        return mapImportedAttachmentsAndLinks(editor.tryParseHTMLToBlocks(prepared.html), {
          resolveAttachmentUrl: prepared.restoreUrl, resolveLinkUrl: prepared.restoreUrl,
        }).blocks;
      };
      const blocks = parse('<div class="column-list"><div class="column" style="width:30%"><h2>Left</h2><figure class="callout"><div><span class="icon">⚠️</span></div><div><p>Keep <strong>bold</strong></p><table><tbody><tr><td><a href="Child.html">Child</a></td></tr></tbody></table></div></figure></div><div class="column" style="width:70%"><ul class="to-do-list"><li><span class="checkbox checkbox-on"></span>Done<ul><li>Nested</li></ul></li></ul><details><summary>Toggle</summary><p>Hidden content</p></details><figure class="file"><a href="report.pdf">Report.pdf</a></figure><video><source src="demo.mp4"></video><audio><source src="voice.mp3"></audio><figure><img src="photo.png"><figcaption>Photo caption</figcaption></figure><pre><code class="language-js">const value = 1;\n</code></pre></div></div>');
      assert.equal(blocks[0].type, 'columnList');
      assert.deepEqual(blocks[0].children.map((column) => column.props.width), [30, 70]);
      const flatten = (values) => values.flatMap((block) => [block, ...flatten(block.children ?? [])]);
      const all = flatten(blocks);
      const find = (type) => all.find((block) => block.type === type);
      assert.equal(find('callout').props.emoji, '⚠️');
      assert.ok(find('callout').content.some((item) => item.styles?.bold));
      assert.equal(find('callout').children[0].type, 'table');
      assert.ok(JSON.stringify(find('table')).includes('Child.html'));
      assert.equal(find('checkListItem').props.checked, true);
      assert.ok(JSON.stringify(find('checkListItem').children).includes('Nested'));
      assert.ok(JSON.stringify(find('toggleListItem').children).includes('Hidden content'));
      assert.equal(find('file').props.url, 'report.pdf');
      assert.equal(find('file').props.fileCategory, 'TEXT_DOCUMENT');
      assert.equal(find('video').props.url, 'demo.mp4');
      assert.equal(find('audio').props.url, 'voice.mp3');
      assert.equal(find('image').props.url, 'photo.png');
      assert.equal(find('image').props.caption, 'Photo caption');
      assert.equal(find('codeBlock').props.language, 'js');
      assert.ok(!JSON.stringify(blocks).includes('bureau-import.invalid'));
      const reloaded = BlockNoteEditor.create({schema, initialContent: JSON.parse(JSON.stringify(blocks))});
      assert.deepEqual(reloaded.document, blocks);
      const markdown = parse(marked.parse('- [x] Finished\n\n| Name | Value |\n| --- | --- |\n| One | Two |\n\n<aside><p>Markdown <em>callout</em></p></aside>', {async: false, gfm: true}));
      const markdownBlocks = flatten(markdown);
      assert.equal(markdownBlocks.find((block) => block.type === 'checkListItem').props.checked, true);
      assert.ok(markdownBlocks.some((block) => block.type === 'table'));
      assert.ok(markdownBlocks.some((block) => block.type === 'callout'));
      console.log('PASS native Notion parser and serialized reload');
    } finally { rmSync(directory, {recursive: true, force: true}); }
  `;
  const output = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', script, repositoryRoot],
    { cwd: repositoryRoot, encoding: 'utf8', timeout: 30000 },
  );
  expect(output).toContain('PASS native Notion parser and serialized reload');
});
