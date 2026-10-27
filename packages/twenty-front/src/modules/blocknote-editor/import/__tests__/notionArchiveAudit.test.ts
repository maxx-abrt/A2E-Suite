import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { strToU8, zipSync } from 'fflate';

const auditArchive = (files: Record<string, string | Uint8Array>) => {
  const directory = mkdtempSync(join(tmpdir(), 'a2e-notion-audit-'));
  const archivePath = join(directory, 'Synthetic.zip');
  const repositoryRoot = resolve(__dirname, '../../../../../../..');
  try {
    writeFileSync(
      archivePath,
      zipSync(
        Object.fromEntries(
          Object.entries(files).map(([path, value]) => [
            path,
            typeof value === 'string' ? strToU8(value) : value,
          ]),
        ),
      ),
    );
    const result = spawnSync(
      process.execPath,
      [
        join(
          repositoryRoot,
          'packages/twenty-front/scripts/audit-notion-export.mjs',
        ),
        archivePath,
      ],
      { cwd: repositoryRoot, encoding: 'utf8', timeout: 30000 },
    );
    if (result.error) throw result.error;
    return { ...result, report: JSON.parse(result.stdout) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe('offline Notion archive fidelity audit', () => {
  it('converts a synthetic ZIP through native parsing, storage handoff, covers and serialized reload', () => {
    const sourceId = 'a'.repeat(32);
    const result = auditArchive({
      'Home.html': `<article><header><h1 class="page-title">Home</h1>
        <img class="page-icon notion-static-icon" src="https://www.notion.so/icons/book_gray.svg">
        <img class="page-cover-image" src="Home/cover.png"><p>Header metadata</p>
        <table class="properties"><tr><th>Relation</th><td><a href="Home/Child%20${sourceId}.html" data-notion-page-id="${sourceId}">Child</a></td></tr></table>
        </header><div class="page-body"><h2>Heading</h2>
        <nav class="table_of_contents"><a href="#heading">Heading</a></nav>
        <div class="column-list"><div class="column" style="width:30%">
        <figure class="callout"><span class="icon">💡</span><p>Keep <strong>bold</strong></p><p>Nested text</p></figure></div>
        <div class="column" style="width:70%"><ul class="to-do-list"><li><span class="checkbox checkbox-on"></span>Done</li></ul>
        <details><summary>Toggle</summary><p>Hidden text</p></details></div></div>
        <figure class="link-to-page"><a href="Home/Child%20${sourceId}.html" data-notion-page-id="${sourceId}">Child</a></figure>
        <table><colgroup><col/><col style="width:160px"/></colgroup><tr><th>Name</th><th>Value</th></tr>
        <tr><td><a href="https://example.com/report.html">External report</a></td><td>Full value</td></tr></table>
        <figure data-notion-equation="x = 1"><span>rendered math</span></figure>
        <figure><img src="Home/photo.png"><figcaption>Photo caption</figcaption></figure>
        <video><source src="Home/demo.mp4"></video><audio><source src="Home/voice.mp3"></audio>
        </div><footer><p>Ada: exported comment</p></footer></article><section><p>Resolved discussion</p></section>`,
      [`Home/Child ${sourceId}.html`]: '<p>Related content</p>',
      'Tasks.html': '<div class="page-body"><p>Database description</p></div>',
      'Tasks.csv': 'Name,Hidden column\nTask,"Keep all data"',
      'Home/cover.png': new Uint8Array([137, 80, 78, 71]),
      'Home/photo.png': new Uint8Array([137, 80, 78, 71, 1]),
      'Home/demo.mp4': new Uint8Array([1, 2, 3]),
      'Home/voice.mp3': new Uint8Array([4, 5, 6]),
      'Home/unreferenced.json': '{"schema":"retained source"}',
    });
    expect(result.status).toBe(0);
    expect(result.report).toMatchObject({
      entries: 9,
      pages: 3,
      created: 3,
      saved: 3,
      completed: 3,
      uploadedPaths: 7,
      appliedCovers: 1,
      failedPages: [],
      failures: [],
      missingTextCharacters: [],
      formattingDifferences: [],
      missingReferences: [],
      missingAttachmentPaths: [],
      unsafeSavedUrls: [],
      typeCounts: {
        image: 2,
        table: 3,
        pageLink: 1,
        tableOfContents: 1,
        columnList: 1,
        callout: 1,
        checkListItem: 1,
        codeBlock: 1,
        video: 1,
        audio: 1,
      },
      inlineTypeCounts: { mention: 1 },
    });
  });

  it('fails when exported text outside the page body cannot be converted', () => {
    const result = auditArchive({
      'Home.html':
        '<article><div class="page-body"><p>Body</p></div><footer><svg><text>Missing commentary</text></svg></footer></article>',
    });
    expect(result.status).toBe(1);
    expect(result.report.missingTextCharacters).toHaveLength(1);
    expect(result.report.missingTextCharacters[0].path).toBe('Home.html');
  });
});
