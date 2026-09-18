import { sanitizeImportedHtml } from '@/blocknote-editor/import/utils/sanitizeImportedHtml';

describe('sanitizeImportedHtml', () => {
  it('removes script elements with their payload', () => {
    expect(sanitizeImportedHtml('<p>a</p><script>alert(1)</script>')).toBe(
      '<p>a</p>',
    );
  });

  it('removes unsafe embeds', () => {
    expect(sanitizeImportedHtml('<iframe src="https://x"></iframe>')).toBe('');
    expect(sanitizeImportedHtml('<object data="x"></object>')).toBe('');
    expect(sanitizeImportedHtml('<embed src="x">')).toBe('');
    expect(sanitizeImportedHtml('<frame src="x">')).toBe('');
  });

  it('removes active content and non-representable structure', () => {
    expect(sanitizeImportedHtml('<form><input value="x"></form>')).toBe('');
    expect(sanitizeImportedHtml('<svg><circle /></svg>')).toBe('');
    expect(
      sanitizeImportedHtml(
        '<template><img src="x" onerror="alert(1)"></template>',
      ),
    ).toBe('');
    expect(sanitizeImportedHtml('<style>p{color:red}</style><p>a</p>')).toBe(
      '<p>a</p>',
    );
  });

  it('strips inline event handlers even without a leading space', () => {
    expect(
      sanitizeImportedHtml('<img src="x.png" onerror="alert(1)">'),
    ).not.toContain('onerror');
    expect(
      sanitizeImportedHtml('<div ONCLICK="alert(1)">x</div>'),
    ).not.toContain('ONCLICK');
  });

  it('strips javascript: and encoded unsafe URL schemes', () => {
    expect(
      sanitizeImportedHtml('<a href="javascript:alert(1)">x</a>'),
    ).not.toContain('href');
    expect(
      sanitizeImportedHtml('<a href="jav&#x61;script:alert(1)">x</a>'),
    ).not.toContain('href');
    expect(
      sanitizeImportedHtml('<a href="java\nscript:alert(1)">x</a>'),
    ).not.toContain('href');
  });

  it('keeps benign markup and safe URLs', () => {
    expect(
      sanitizeImportedHtml('<h1>Title</h1><p>Hello <strong>world</strong></p>'),
    ).toBe('<h1>Title</h1><p>Hello <strong>world</strong></p>');
    expect(
      sanitizeImportedHtml('<a href="https://example.com">x</a>'),
    ).toContain('href="https://example.com"');
    expect(
      sanitizeImportedHtml('<img src="data:image/png;base64,AAAA">'),
    ).toContain('data:image/png');
  });

  it('does not treat javascript: as dangerous when it is plain text', () => {
    expect(
      sanitizeImportedHtml('<p>use javascript:alert to debug</p>'),
      // oxlint-disable-next-line no-script-url -- asserting the sanitizer keeps benign text
    ).toContain('javascript:alert');
  });
});
