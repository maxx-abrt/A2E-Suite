import { importHtmlToDocument } from '@/blocknote-editor/import/utils/importHtmlToDocument';

const paragraphBlock = () => ({
  type: 'paragraph',
  content: [{ type: 'text', text: 'hello' }],
});

const expectRejected = (
  result: Awaited<ReturnType<typeof importHtmlToDocument>>,
) => {
  if (result.status !== 'rejected') {
    throw new Error(`expected a rejected import, got ${result.status}`);
  }

  return result;
};

describe('importHtmlToDocument', () => {
  it('runs the pipeline, aggregates warnings and reports progress', async () => {
    const steps: string[] = [];

    const result = await importHtmlToDocument({
      html: '<h1>Title</h1><script>alert(1)</script>',
      parseHtml: async () => [paragraphBlock()],
      onProgress: (progress) => steps.push(progress.step),
    });

    expect(result.status).toBe('imported');
    expect(result.attempts).toBe(1);
    expect(result.warnings.map((warning) => warning.kind)).toContain(
      'script-removed',
    );
    expect(steps).toEqual(['sanitizing', 'parsing', 'mapping', 'validating']);
  });

  it('feeds only sanitized HTML to the parser', async () => {
    const parseHtml = jest.fn().mockResolvedValue([paragraphBlock()]);

    await importHtmlToDocument({
      html: '<p>hello</p><script>alert(1)</script>',
      parseHtml,
    });

    expect(parseHtml).toHaveBeenCalledWith('<p>hello</p>');
  });

  it('retries a flaky parser and reports the eventual attempt count', async () => {
    const parseHtml = jest
      .fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce([paragraphBlock()]);
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await importHtmlToDocument({
      html: '<p>hello</p>',
      parseHtml,
      sleep,
    });

    expect(result.status).toBe('imported');
    expect(result.attempts).toBe(2);
    expect(parseHtml).toHaveBeenCalledTimes(2);
  });

  it('rejects an empty import before any record could be created', async () => {
    const result = await importHtmlToDocument({
      html: '   ',
      parseHtml: async () => [],
    });

    const rejected = expectRejected(result);
    expect(rejected.reasons).toContain('empty-import');
    expect(rejected.reasons).toContain('no-importable-blocks');
  });

  it('fail-closes before create when every attachment is unmapped', async () => {
    const result = await importHtmlToDocument({
      html: '<img src="https://external.example/a.png">',
      parseHtml: async () => [
        { type: 'image', props: { url: 'https://external.example/a.png' } },
      ],
      resolveAttachmentUrl: () => null,
    });

    const rejected = expectRejected(result);
    expect(rejected.reasons).toContain('no-importable-blocks');
    expect(rejected.warnings).toContainEqual({
      kind: 'attachment-unmapped',
      element: 'image',
    });
  });
});
