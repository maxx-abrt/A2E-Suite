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
});
