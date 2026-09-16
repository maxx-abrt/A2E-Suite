import {
  collectExportFidelityWarnings,
  isDocumentEmptyForExport,
} from '@/blocknote-editor/export/utils/exportFidelity';

const textBlock = (text: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

const headingBlock = (text: string) => ({
  type: 'heading',
  content: [{ type: 'text', text }],
});

describe('isDocumentEmptyForExport', () => {
  it('returns true for null, undefined or empty documents', () => {
    expect(isDocumentEmptyForExport(null)).toBe(true);
    expect(isDocumentEmptyForExport(undefined)).toBe(true);
    expect(isDocumentEmptyForExport([])).toBe(true);
  });

  it('returns true when blocks only carry whitespace text', () => {
    expect(isDocumentEmptyForExport([textBlock('   ')])).toBe(true);
  });

  it('returns false for a nonempty text block', () => {
    expect(isDocumentEmptyForExport([textBlock('Contenu')])).toBe(false);
  });

  it('returns false when only a nested child carries content', () => {
    expect(
      isDocumentEmptyForExport([
        { type: 'toggle', content: [], children: [headingBlock('Sous-titre')] },
      ]),
    ).toBe(false);
  });

  it('counts payload-only blocks (image/table/file) as content', () => {
    expect(isDocumentEmptyForExport([{ type: 'image' }])).toBe(false);
    expect(isDocumentEmptyForExport([{ type: 'table' }])).toBe(false);
    expect(isDocumentEmptyForExport([{ type: 'file' }])).toBe(false);
  });

  it('counts non-array content (e.g. table payload) as content', () => {
    expect(
      isDocumentEmptyForExport([{ type: 'table', content: { rows: [['a']] } }]),
    ).toBe(false);
  });

  it('ignores malformed block entries instead of throwing', () => {
    const malformedOnly = [null, 42] as unknown as Parameters<
      typeof isDocumentEmptyForExport
    >[0];

    expect(isDocumentEmptyForExport(malformedOnly)).toBe(true);

    const malformedThenContent = [
      null,
      42,
      textBlock('ok'),
    ] as unknown as Parameters<typeof isDocumentEmptyForExport>[0];

    expect(isDocumentEmptyForExport(malformedThenContent)).toBe(false);
  });
});

describe('collectExportFidelityWarnings', () => {
  const richDocument = [
    textBlock('Intro'),
    { type: 'callout', content: [{ type: 'text', text: 'Note' }] },
    { type: 'file' },
    {
      type: 'paragraph',
      content: [
        { type: 'mention', label: 'Alice' },
        { type: 'text', text: ' suite' },
      ],
    },
  ];

  it('returns no warnings for the pdf (print) format', () => {
    expect(collectExportFidelityWarnings(richDocument, 'pdf')).toEqual([]);
  });

  it('flags every lossy construct for markdown and docx', () => {
    const expected = ['callout-degrades', 'file-omitted', 'mention-degrades'];

    expect(collectExportFidelityWarnings(richDocument, 'markdown')).toEqual(
      expected,
    );
    expect(collectExportFidelityWarnings(richDocument, 'docx')).toEqual(
      expected,
    );
  });

  it('returns nothing for plain text documents', () => {
    expect(
      collectExportFidelityWarnings([textBlock('Simple')], 'markdown'),
    ).toEqual([]);
  });

  it('detects constructs nested in children', () => {
    const nested = [
      { type: 'toggle', content: [], children: [{ type: 'callout' }] },
    ];

    expect(collectExportFidelityWarnings(nested, 'docx')).toEqual([
      'callout-degrades',
    ]);
  });

  it('handles null documents', () => {
    expect(collectExportFidelityWarnings(null, 'docx')).toEqual([]);
  });
});
