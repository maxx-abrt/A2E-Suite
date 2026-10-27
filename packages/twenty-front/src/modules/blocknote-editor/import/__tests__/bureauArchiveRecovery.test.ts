import {
  planBureauArchiveImport,
  runBureauArchiveImport,
  type BureauArchiveImportSession,
} from '@/blocknote-editor/import/utils/bureauArchiveImport';
import { mapImportedAttachmentsAndLinks } from '@/blocknote-editor/import/utils/mapImportedAttachmentsAndLinks';
import { type DocumentsTransferEntry } from '@/blocknote-editor/import/utils/documentsTransferEntries';

const entry = (path: string, text: string) => ({
  path,
  bytes: new TextEncoder().encode(text),
});

const setupImport = (entries: ReturnType<typeof entry>[]) => {
  const plan = planBureauArchiveImport(entries);
  const session: BureauArchiveImportSession = {
    documentIdsByPath: new Map(
      plan.pages.map((page) => [page.path, `${page.path}-id`]),
    ),
    createdPaths: new Set(),
    completedPaths: new Set(),
    attachmentUrls: new Map(),
  };
  return {
    plan,
    session,
    createPage: jest.fn().mockResolvedValue(undefined),
    parsePage: jest.fn().mockResolvedValue([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Original notes' }],
      },
    ]),
    uploadAttachment: jest
      .fn()
      .mockImplementation(
        async (source: DocumentsTransferEntry) =>
          `https://files.example/${encodeURIComponent(source.path)}`,
      ),
    applyPageCover: jest.fn().mockResolvedValue(undefined),
    savePage: jest.fn().mockResolvedValue(undefined),
    mapBlocks: (
      blocks: readonly unknown[],
      resolveUrl: (url: string) => string | null,
      pageLinkResolvers?: {
        resolvePageLink: (target: string) => string | null;
        flattenUnresolvedPageLinks: boolean;
      },
    ) =>
      mapImportedAttachmentsAndLinks(blocks, {
        resolveLinkUrl: resolveUrl,
        resolveAttachmentUrl: resolveUrl,
        preserveUnmappedAttachments: true,
        ...pageLinkResolvers,
      }),
    getPageUrl: (id: string) => `/bureau/${id}`,
    onProgress: jest.fn(),
  };
};

describe('Notion archive recovery completeness', () => {
  it('reports failed recovery-source uploads and retries without reparsing completed content', async () => {
    const options = setupImport([entry('Home.md', '# Home')]);
    options.plan.sourceFile = entry('Original.zip', 'original export');
    options.uploadAttachment.mockRejectedValueOnce(
      new Error('Storage offline'),
    );

    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 1,
    });
    expect(options.session.failedPagesByPath?.get('Home.md')).toContain(
      'Original.zip',
    );
    expect(options.session.failedPagesByPath?.get('Home.md')).toContain(
      'Storage offline',
    );
    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 0,
    });
    expect(options.parsePage).toHaveBeenCalledTimes(1);
    expect(options.createPage).toHaveBeenCalledTimes(1);
    expect(options.savePage).toHaveBeenLastCalledWith('Home.md-id', [
      expect.objectContaining({ type: 'paragraph' }),
      expect.objectContaining({
        type: 'file',
        props: expect.objectContaining({ name: 'Original.zip' }),
      }),
    ]);
  });

  it('does not upload files to records whose creation failed', async () => {
    const options = setupImport([
      entry('Home.md', '# Home'),
      entry('Home/Child.md', '# Child'),
      entry('Home/asset.png', 'asset bytes'),
      entry('Other.md', '# Other'),
    ]);
    options.plan.sourceFile = entry('Original.zip', 'original export');
    options.createPage.mockRejectedValueOnce(new Error('Create failed'));

    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 2,
    });
    expect(options.uploadAttachment).not.toHaveBeenCalled();
    expect(options.savePage).toHaveBeenCalledTimes(1);
    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 0,
    });
    expect(options.uploadAttachment).toHaveBeenCalledTimes(2);
  });

  it('does not replace a page that failed parsing with an attachment-only document', async () => {
    const options = setupImport([
      entry('Home.md', '# Home'),
      entry('Home/asset.png', 'asset'),
    ]);
    options.parsePage.mockRejectedValueOnce(new Error('Cannot parse'));
    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 1,
    });
    expect(options.savePage).not.toHaveBeenCalled();
    expect(options.uploadAttachment).not.toHaveBeenCalled();
    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 0,
    });
    expect(options.savePage).toHaveBeenLastCalledWith('Home.md-id', [
      expect.objectContaining({ type: 'paragraph' }),
      expect.objectContaining({ type: 'file' }),
    ]);
  });

  it('reports failed cover uploads and reuses a successful upload when applying the cover needs retry', async () => {
    const options = setupImport([
      entry(
        'Home.html',
        '<article><header><img class="page-cover-image" src="Home/cover.png"></header><div class="page-body"><p>Body</p></div></article>',
      ),
      entry('Home/cover.png', 'cover bytes'),
    ]);
    options.uploadAttachment.mockRejectedValueOnce(
      new Error('Storage offline'),
    );
    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 1,
    });
    expect(options.session.pendingCoverPaths?.has('Home.html')).toBe(true);
    expect(options.applyPageCover).not.toHaveBeenCalled();
    expect(options.uploadAttachment).toHaveBeenCalledTimes(1);

    options.applyPageCover.mockRejectedValueOnce(
      new Error('Cover save failed'),
    );
    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 1,
    });
    expect(options.session.failedPagesByPath?.get('Home.html')).toContain(
      'Cover save failed',
    );
    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 0,
    });
    expect(options.uploadAttachment).toHaveBeenCalledTimes(2);
    expect(options.parsePage).toHaveBeenCalledTimes(1);
    expect(options.session.pendingCoverPaths?.size).toBe(0);
    expect(options.session.warningCountsByPath?.get('Home.html')).toBe(0);
  });

  it('restores relation chips after their target creation succeeds on retry', async () => {
    const sourceId = 'a'.repeat(32);
    const targetPath = `Child ${sourceId}.html`;
    const options = setupImport([
      entry(targetPath, '<p>Child</p>'),
      entry('Home.md', '# Home'),
      entry('Other.md', '# Other'),
    ]);
    options.createPage.mockRejectedValueOnce(new Error('Create failed'));
    options.parsePage.mockImplementation(async (page: { path: string }) =>
      page.path === 'Home.md'
        ? [
            {
              type: 'pageLink',
              props: { documentId: `notion:${sourceId}`, title: 'Child' },
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'mention',
                  props: {
                    recordId: `${targetPath}#notes`,
                    objectNameSingular: 'document',
                    label: 'Related child',
                  },
                },
              ],
            },
          ]
        : [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Other content' }],
            },
          ],
    );

    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 2,
    });
    const initialSourceSave = options.savePage.mock.calls.find(
      ([id]) => id === 'Home.md-id',
    );
    expect(JSON.stringify(initialSourceSave)).not.toContain(`${targetPath}-id`);
    expect(JSON.stringify(initialSourceSave)).toContain('Related child');
    expect(options.session.completedPaths.has('Home.md')).toBe(false);

    expect(await runBureauArchiveImport(options)).toMatchObject({
      failedPageCount: 0,
    });
    const sourceSave = options.savePage.mock.calls
      .filter(([id]) => id === 'Home.md-id')
      .at(-1);
    expect(sourceSave?.[1]).toMatchObject([
      { type: 'pageLink', props: { documentId: `${targetPath}-id` } },
      {
        type: 'paragraph',
        content: [{ type: 'mention', props: { recordId: `${targetPath}-id` } }],
      },
    ]);
    expect(
      options.savePage.mock.calls.filter(([id]) => id === 'Other.md-id'),
    ).toHaveLength(1);
  });
});
