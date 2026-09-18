import {
  collectHtmlImportWarnings,
  hasUnsafeHtmlImportMarkup,
} from '@/blocknote-editor/import/utils/htmlImportWarnings';

describe('collectHtmlImportWarnings', () => {
  it('reports every unsafe category', () => {
    const warnings = collectHtmlImportWarnings(
      '<script>a</script><iframe></iframe><form></form><style></style>' +
        '<a href="javascript:alert(1)">x</a><img src="x" onerror="a">',
    );
    const kinds = warnings.map((warning) => warning.kind);

    expect(kinds).toContain('script-removed');
    expect(kinds).toContain('unsafe-embed-removed');
    expect(kinds).toContain('active-content-removed');
    expect(kinds).toContain('unsupported-element-removed');
    expect(kinds).toContain('unsafe-url-removed');
    expect(kinds).toContain('unsafe-attribute-removed');
  });

  it('attributes the warning to the offending element', () => {
    expect(collectHtmlImportWarnings('<iframe></iframe>')).toContainEqual({
      kind: 'unsafe-embed-removed',
      element: 'iframe',
    });
  });

  it('returns no warnings for benign markup', () => {
    expect(
      collectHtmlImportWarnings(
        '<h1>Title</h1><p><a href="https://example.com">x</a></p>',
      ),
    ).toEqual([]);
  });
});

describe('hasUnsafeHtmlImportMarkup', () => {
  it('detects real dangerous markup', () => {
    expect(hasUnsafeHtmlImportMarkup('<script>x</script>')).toBe(true);
    expect(hasUnsafeHtmlImportMarkup('<div onmouseover="x">a</div>')).toBe(
      true,
    );
    expect(
      hasUnsafeHtmlImportMarkup('<a href="javascript:alert(1)">x</a>'),
    ).toBe(true);
  });

  it('does not flag plain text that mentions a dangerous scheme', () => {
    expect(hasUnsafeHtmlImportMarkup('<p>javascript: is a scheme</p>')).toBe(
      false,
    );
  });
});
