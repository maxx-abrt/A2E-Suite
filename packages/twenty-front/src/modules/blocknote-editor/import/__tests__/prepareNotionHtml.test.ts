import {
  prepareNotionHtml,
  sanitizeNotionHtml,
} from '@/blocknote-editor/import/utils/prepareNotionHtml';

const read = (html: string) =>
  new DOMParser().parseFromString(html, 'text/html');

describe('prepareNotionHtml', () => {
  it('translates nested unequal columns into the native multi-column schema', () => {
    const result = prepareNotionHtml(`<div class="column-list">
      <div class="column" style="width:30%"><p>Left</p></div>
      <div class="column" style="width:70%"><div class="column-list">
        <div class="column"><p>Nested</p></div><div class="column"></div>
      </div></div></div>`);
    const document = read(result.html);
    expect(
      document.querySelectorAll('[data-node-type="columnList"]'),
    ).toHaveLength(2);
    expect(
      [...document.querySelectorAll('[data-node-type="column"]')].map(
        (column) => column.getAttribute('data-width'),
      ),
    ).toEqual(['30', '70', '1', '1']);
    expect(
      document.querySelectorAll('[data-node-type="column"]')[3].innerHTML,
    ).toBe('<p></p>');
    expect(document.body.textContent).toContain('Nested');
  });

  it('keeps callout rich text and nested tables as editable native blocks', () => {
    const document = read(
      prepareNotionHtml(`<figure class="callout">
      <div><span class="icon">⚠️</span></div><div><p>Keep <strong>formatting</strong></p>
      <table><tbody><tr><td>Nested cell</td></tr></tbody></table></div></figure>`)
        .html,
    );
    expect(
      document
        .querySelector('[data-content-type="callout"]')
        ?.getAttribute('data-emoji'),
    ).toBe('⚠️');
    expect(
      document.querySelector('.bn-inline-content strong')?.textContent,
    ).toBe('formatting');
    expect(
      document.querySelector('[data-node-type="blockGroup"] table td')
        ?.textContent,
    ).toBe('Nested cell');
  });

  it('preserves checked and unchecked Notion and Markdown to-dos with nested lists', () => {
    const document = read(
      prepareNotionHtml(`<ul class="to-do-list">
      <li><span class="checkbox checkbox-on"></span><strong>Done</strong><ul><li>Child</li></ul></li>
      <li><span class="checkbox checkbox-off"></span>Open</li>
      <li><input type="checkbox" checked disabled>Markdown done</li></ul>`)
        .html,
    );
    expect(
      [...document.querySelectorAll('[data-content-type="checkListItem"]')].map(
        (item) => item.getAttribute('data-checked'),
      ),
    ).toEqual(['true', 'false', 'true']);
    expect(document.querySelector('li ul li')?.textContent).toBe('Child');
    expect(
      document.querySelector('li .bn-inline-content strong')?.textContent,
    ).toBe('Done');
    expect(document.querySelector('input')).toBeNull();
  });

  it('preserves local URLs through parsers that make media paths absolute', () => {
    const prepared = prepareNotionHtml(
      '<p><a href="Child%20page.html#block">Child</a></p><img src="photos/a%231.png">',
    );
    const document = read(prepared.html);
    expect(prepared.restoreUrl(document.querySelector('a')?.href ?? '')).toBe(
      'Child%20page.html#block',
    );
    expect(prepared.restoreUrl(document.querySelector('img')?.src ?? '')).toBe(
      'photos/a%231.png',
    );
    expect(prepared.restoreUrl('https://example.com/photo.png')).toBe(
      'https://example.com/photo.png',
    );
  });

  it('keeps downloadable files, captions and audio/video source URLs', () => {
    const prepared =
      prepareNotionHtml(`<figure class="file"><a href="files/report.pdf">Report.pdf</a><figcaption>Read this first</figcaption></figure>
      <video><source src="media/demo.mp4"></video><audio><source src="media/voice.mp3"></audio>`);
    const document = read(prepared.html);
    const file = document.querySelector('[data-content-type="file"]');
    expect(file?.getAttribute('data-file-category')).toBe('TEXT_DOCUMENT');
    expect(prepared.restoreUrl(file?.getAttribute('data-url') ?? '')).toBe(
      'files/report.pdf',
    );
    expect(document.body.textContent).toContain('Read this first');
    expect(
      prepared.restoreUrl(document.querySelector('video')?.src ?? ''),
    ).toBe('media/demo.mp4');
    expect(
      prepared.restoreUrl(document.querySelector('audio')?.src ?? ''),
    ).toBe('media/voice.mp3');
  });

  it('preserves safe embed destinations and removes executable content', () => {
    const html = sanitizeNotionHtml(
      '<iframe src="https://video.example/watch" title="Demo"></iframe><iframe src="javascript:alert(1)"></iframe><script>bad()</script>',
    );
    const document = read(html);
    expect(document.querySelector('a')?.getAttribute('href')).toBe(
      'https://video.example/watch',
    );
    expect(
      document.querySelector('iframe, script, a[href^="javascript:"]'),
    ).toBeNull();
  });

  it('converts the exported table of contents into the native block without anchor links', () => {
    const document = read(
      prepareNotionHtml(
        '<nav class="table_of_contents" data-notion-toc=""><div class="table_of_contents-item"><a href="#27f9393d">Notes</a></div></nav><p><a href="#reference-1">jump</a></p>',
      ).html,
    );
    const tocBlocks = document.querySelectorAll(
      '[data-content-type="tableOfContents"]',
    );
    expect(tocBlocks).toHaveLength(1);
    // In-page anchors cannot survive as jump targets and would be rejected by
    // the rich-text API, so their text stays without a protocol.
    expect(document.querySelectorAll('a[href^="#"]')).toHaveLength(0);
    // The nav entries are re-derived from document headings at render time,
    // while an arbitrary anchor keeps only its visible text.
    expect(document.querySelector('nav')).toBeNull();
    expect(document.body.textContent).toContain('jump');
  });

  it('converts link-to-page figures into native page-link chips', () => {
    const document = read(
      prepareNotionHtml(`<figure class="link-to-page">
        <a href="Courses/Philo.html" data-notion-page-id="dec832a4-83b7-4ea6-a09c-0dab32125442">
          <span class="icon" data-emoji="📚">📚</span>Philo</a></figure>`).html,
    );
    const chip = document.querySelector('[data-content-type="pageLink"]');
    expect(chip?.getAttribute('data-document-id')).toBe(
      'notion:dec832a4-83b7-4ea6-a09c-0dab32125442',
    );
    expect(chip?.getAttribute('data-title')).toBe('📚 Philo');
    expect(document.querySelector('figure.link-to-page')).toBeNull();
  });

  it('converts page links without a notion id from their archive path', () => {
    const document = read(
      prepareNotionHtml(
        '<figure class="link-to-page"><a href="Child%20page.html">Child page</a></figure>',
      ).html,
    );
    const chip = document.querySelector('[data-content-type="pageLink"]');
    expect(chip?.getAttribute('data-document-id')).toBe('Child%20page.html');
    expect(chip?.getAttribute('data-title')).toBe('Child page');
  });

  it('converts page links inside table cells into native relation chips', () => {
    const document = read(
      prepareNotionHtml(`<table><tbody><tr>
        <td class="cell-title"><a href="Tasks/2%2011%20row.html" data-notion-page-id="27f9393d-44ea-8063-9545-cb8bed10f716">2.11</a></td>
        <td><a href="https://example.com/plain">Keep plain links</a></td>
      </tr></tbody></table>`).html,
    );
    const mention = document.querySelector('[data-content-type="mention"]');
    expect(mention?.getAttribute('data-record-id')).toBe(
      'notion:27f9393d-44ea-8063-9545-cb8bed10f716',
    );
    expect(mention?.getAttribute('data-label')).toBe('2.11');
    expect(mention?.getAttribute('data-object-name-singular')).toBe('document');
    // Non-page anchors keep their URL semantics inside cells.
    expect(
      document.querySelector('td a[href="https://example.com/plain"]'),
    ).not.toBeNull();
  });

  it('keeps external HTML links as links and tolerates literal percent signs in table URLs', () => {
    const prepared = prepareNotionHtml(
      '<table><tr><td><a href="https://example.com/report.html">External report</a></td><td><a href="Progress% report.html#notes">Progress</a></td></tr></table>',
    );
    const document = read(prepared.html);
    expect(document.querySelector('a')?.getAttribute('href')).toBe(
      'https://example.com/report.html',
    );
    expect(
      document
        .querySelector('[data-content-type="mention"]')
        ?.getAttribute('data-record-id'),
    ).toBe('Progress% report.html#notes');
  });

  it('does not shift column widths when an earlier column has no exported width', () => {
    const document = read(
      prepareNotionHtml(
        '<table><colgroup><col/><col style="width:160px"/></colgroup><tr><td>First</td><td>Second</td></tr></table>',
      ).html,
    );
    const cells = document.querySelectorAll('td');
    expect(cells[0].getAttribute('colwidth')).toBeNull();
    expect(cells[1].getAttribute('colwidth')).toBe('160');
  });

  it('copies export column widths onto table cells for editable resizing', () => {
    const document = read(
      prepareNotionHtml(`<table><colgroup><col style="width:58.333333%"/><col style="width:41.666667%"/></colgroup>
        <thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>`)
        .html,
    );
    const header = document.querySelectorAll('thead th');
    expect(header[0].getAttribute('colwidth')).toBe('583');
    expect(header[1].getAttribute('colwidth')).toBe('417');
    const body = document.querySelectorAll('tbody td');
    expect(body[0].getAttribute('colwidth')).toBe('583');
    expect(body[1].getAttribute('colwidth')).toBe('417');
  });

  it('keeps absolute table widths untouched by percentage scaling', () => {
    const document = read(
      prepareNotionHtml(
        '<table><colgroup><col style="width:120px"/><col/></colgroup><tr><th>A</th><td>B</td></tr></table>',
      ).html,
    );
    expect(document.querySelector('th')?.getAttribute('colwidth')).toBe('120');
    expect(
      document.querySelectorAll('td')[0].getAttribute('colwidth'),
    ).toBeNull();
  });
});
