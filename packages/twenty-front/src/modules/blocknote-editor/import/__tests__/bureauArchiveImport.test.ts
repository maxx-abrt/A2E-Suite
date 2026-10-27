import {
  planBureauArchiveImport,
  resolveBureauArchivePath,
  runBureauArchiveImport,
  type BureauArchiveImportSession,
} from '@/blocknote-editor/import/utils/bureauArchiveImport';
import { mapImportedAttachmentsAndLinks } from '@/blocknote-editor/import/utils/mapImportedAttachmentsAndLinks';

const entry = (path: string, text: string) => ({
  path,
  bytes: new TextEncoder().encode(text),
});

describe('Notion archive import', () => {
  it('joins hash-free child folders and HTML/CSV companions without duplicating a source page', () => {
    const workspacePath = `Export/Workspace ${'a'.repeat(32)}.html`;
    const databasePath = `Export/Workspace/Tasks ${'b'.repeat(32)}.html`;
    const csvPath = databasePath.replace('.html', '.csv');
    const childPath = `Export/Workspace/Tasks/Assignment ${'c'.repeat(32)}.html`;
    const plan = planBureauArchiveImport([
      entry(
        workspacePath,
        '<article><header><span class="icon" data-emoji="📚"></span><h1 class="page-title">Workspace</h1><img class="page-cover-image" src="Workspace/cover.png"></header><div class="page-body"><p>Welcome</p></div></article>',
      ),
      entry('Export/Workspace/cover.png', 'cover bytes'),
      entry(csvPath, 'Name,Status\nAssignment,Done'),
      entry(
        databasePath,
        '<article><header><table class="properties"><tr><th>Due date</th><td><time datetime="2026-10-27">October 27, 2026</time></td></tr></table></header><div class="page-body"><p>Database description</p></div></article>',
      ),
      entry(childPath, '<div class="page-body"><p>Course notes</p></div>'),
    ]);
    expect(plan.pages.map((page) => [page.path, page.parentPath])).toEqual([
      [workspacePath, null],
      [databasePath, workspacePath],
      [childPath, databasePath],
    ]);
    expect(plan.canonicalPathByPath?.get(csvPath)).toBe(databasePath);
    expect(plan.pages[0].icon).toBe('📚');
    // Covers become record attributes, not body content (resolved relative to
    // the page's own directory).
    expect(plan.pages[0].coverSource).toBe('Export/Workspace/cover.png');
    expect(plan.pages[0].content).not.toContain('Workspace/cover.png');
    expect(plan.pages[1].content).toContain('October 27, 2026');
    expect(plan.pages[1].content).toContain('Database description');
  });

  it('preserves exported comments and metadata outside the main page body exactly once', () => {
    const plan = planBureauArchiveImport([
      entry(
        'Home.html',
        `<article><header>
        <h1 class="page-title">Home</h1><span class="page-icon">📚</span>
        <p class="page-description">Description</p><p>Extra metadata</p>
        <table class="properties"><tr><td>Property value</td></tr></table>
        </header><div class="page-body"><p>Body</p></div>
        <footer><p>Ada: exported comment</p></footer></article>
        <section><p>Resolved discussion</p></section>`,
      ),
    ]);
    const document = new DOMParser().parseFromString(
      plan.pages[0].content,
      'text/html',
    );
    for (const text of [
      'Description',
      'Extra metadata',
      'Property value',
      'Body',
      'Ada: exported comment',
      'Resolved discussion',
    ]) {
      expect(document.body.textContent?.split(text)).toHaveLength(2);
    }
    expect(document.querySelector('.page-title, .page-icon')).toBeNull();
  });

  it('preserves image page icons as content without putting image URLs in the emoji field', () => {
    const plan = planBureauArchiveImport([
      entry(
        'Home.html',
        '<article data-notion-page-icon="https://www.notion.so/icons/book_gray.svg"><header><img class="page-icon" src="https://www.notion.so/icons/book_gray.svg"><h1 class="page-title">Home</h1></header><div class="page-body"><p>Body</p></div></article>',
      ),
      entry(
        'Custom.html',
        '<article><header><span class="page-icon"><img src="Custom/icon.png"></span></header><div class="page-body"><p>Custom body</p></div></article>',
      ),
      entry('Custom/icon.png', 'icon bytes'),
    ]);
    expect(plan.pages[0].icon).toBeUndefined();
    expect(plan.pages[0].content).toContain(
      'https://www.notion.so/icons/book_gray.svg',
    );
    expect(plan.pages[1].content).toContain('Custom/icon.png');
  });

  it('keeps a missing cover visible for review instead of silently dropping its reference', () => {
    const plan = planBureauArchiveImport([
      entry(
        'Home.html',
        '<article><header><img class="page-cover-image" src="missing.png"></header><div class="page-body"><p>Body</p></div></article>',
      ),
    ]);
    expect(plan.pages[0].coverSource).toBeUndefined();
    expect(plan.pages[0].content).toContain('missing.png');
    expect(plan.reviewCountsByPath?.get('Home.html')).toBeGreaterThan(0);
  });

  it('retains source folder grouping when there is no page for that folder', () => {
    const plan = planBureauArchiveImport([
      entry('Export/Hidden/Courses.csv', 'Name\nLesson'),
      entry('Export/Hidden/Courses/Lesson.md', '# Lesson'),
    ]);
    expect(plan.pages.map((page) => [page.title, page.parentPath])).toEqual([
      ['Hidden', null],
      ['Courses', 'Export/Hidden/.bureau-import-folder.md'],
      ['Lesson', 'Export/Hidden/Courses.csv'],
    ]);
  });

  it('falls back to the article-level page icon when the header is iconless', () => {
    const plan = planBureauArchiveImport([
      entry(
        'Export/Emoji page.html',
        '<article data-notion-page-icon="🚀"><header><h1 class="page-title">Emoji page</h1></header><div class="page-body"><p>x</p></div></article>',
      ),
      entry(
        'Export/Glyph page.html',
        '<article data-notion-page-icon="/icons/translate_orange.svg"><header><h1 class="page-title">Glyph page</h1></header><div class="page-body"><p>x</p></div></article>',
      ),
    ]);
    expect(plan.pages[0].icon).toBe('🚀');
    expect(plan.pages[1].icon).toBeUndefined();
    expect(plan.pages[1].content).toContain(
      'https://www.notion.so/icons/translate_orange.svg',
    );
  });

  it('preserves readable content and other pages after a file failure, then retries only the failed work', async () => {
    const plan = planBureauArchiveImport([
      entry('Home.md', '# Home'),
      entry('Home/Child.md', '# Child'),
      entry('Home/photo.png', 'png'),
    ]);
    plan.sourceFile = entry('Original.zip', 'original archive bytes');
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([
        ['Home.md', 'home-id'],
        ['Home/Child.md', 'child-id'],
      ]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const createPage = jest.fn();
    const uploadAttachment = jest
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValue('https://files.example/stored');
    const savePage = jest.fn();
    const options = {
      plan,
      session,
      createPage,
      uploadAttachment,
      savePage,
      parsePage: async (page: { path: string }) =>
        page.path === 'Home.md'
          ? [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Keep my notes' }],
              },
              {
                type: 'image',
                props: { url: 'Home/photo.png', caption: 'My diagram' },
              },
            ]
          : [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Child notes' }],
              },
            ],
      mapBlocks: (
        blocks: readonly unknown[],
        resolveUrl: (url: string) => string | null,
      ) =>
        mapImportedAttachmentsAndLinks(blocks, {
          resolveAttachmentUrl: resolveUrl,
          preserveUnmappedAttachments: true,
          resolveLinkUrl: resolveUrl,
        }),
      getPageUrl: (id: string) => `/bureau/${id}`,
      onProgress: jest.fn(),
    };
    const firstResult = await runBureauArchiveImport(options);
    expect(firstResult.failedPageCount).toBe(1);
    expect(savePage).toHaveBeenCalledWith(
      'home-id',
      expect.arrayContaining([
        expect.objectContaining({
          content: [{ type: 'text', text: 'Keep my notes' }],
        }),
        expect.objectContaining({
          content: [{ type: 'text', text: 'My diagram — Home/photo.png' }],
        }),
      ]),
    );
    expect(session.completedPaths.has('Home/Child.md')).toBe(true);
    expect(session.completedPaths.has('Home.md')).toBe(false);
    expect(session.failedPagesByPath?.get('Home.md')).toContain(
      'file upload(s) need retry',
    );
    const result = await runBureauArchiveImport(options);
    expect(result.failedPageCount ?? session.failedPagesByPath?.size ?? 0).toBe(
      0,
    );
    expect(createPage).toHaveBeenCalledTimes(2);
    expect(session.completedPaths.size).toBe(2);
    expect(session.failedPagesByPath?.size).toBe(0);
    expect(
      uploadAttachment.mock.calls.filter(
        ([source]) => source.path === 'Original.zip',
      ),
    ).toHaveLength(1);
    expect(JSON.stringify(savePage.mock.calls.at(-1))).toContain(
      'Keep my notes',
    );
  });

  it('keeps an oversized database as its own parent and attachment without truncating it', async () => {
    const plan = planBureauArchiveImport([
      entry('A.md', '# A'),
      entry(
        'Large.csv',
        `Name\n${Array.from({ length: 2000 }, (_, index) => `Row ${index}`).join('\n')}`,
      ),
      entry('Large/Child.md', '# Child'),
    ]);
    expect(plan.pages[1]).toMatchObject({ path: 'Large.csv', content: '' });
    expect(plan.pages[2].parentPath).toBe('Large.csv');
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map(
        plan.pages.map((page) => [page.path, `${page.path}-id`]),
      ),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const uploadAttachment = jest
      .fn()
      .mockResolvedValue('https://files.example/large.csv');
    const savePage = jest.fn();
    await runBureauArchiveImport({
      plan,
      session,
      uploadAttachment,
      savePage,
      createPage: jest.fn(),
      parsePage: async () => [],
      mapBlocks: () => ({ blocks: [], warnings: [] }),
      getPageUrl: (id) => `/bureau/${id}`,
      onProgress: jest.fn(),
    });
    expect(uploadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'Large.csv' }),
      'Large.csv-id',
    );
    expect(savePage).toHaveBeenLastCalledWith('Large.csv-id', [
      expect.objectContaining({ type: 'file' }),
    ]);
    expect(plan.reviewCountsByPath?.get('Large.csv')).toBeGreaterThan(0);
  });

  it('preserves CSV database parents, quoted cells and source files under the chosen destination', async () => {
    const plan = planBureauArchiveImport([
      entry('Tasks/Task.md', '# Task'),
      entry(
        'Tasks.csv',
        'Name,Notes\nTask,"Multiline\n<script>safe text</script>, comma"',
      ),
      entry('__MACOSX/._Home.md', 'resource fork'),
      entry('.DS_Store', 'finder metadata'),
    ]);
    expect(plan.pages.map((page) => [page.path, page.parentPath])).toEqual([
      ['Tasks.csv', null],
      ['Tasks/Task.md', 'Tasks.csv'],
    ]);
    expect(plan.pages[0].content).toContain(
      '&lt;script&gt;safe text&lt;/script&gt;, comma',
    );
    expect(plan.entriesByPath.size).toBe(2);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([
        ['Tasks.csv', 'tasks-id'],
        ['Tasks/Task.md', 'task-id'],
      ]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const createPage = jest.fn();
    const uploadAttachment = jest
      .fn()
      .mockResolvedValue('https://files.example/tasks.csv');
    await runBureauArchiveImport({
      plan,
      session,
      createPage,
      uploadAttachment,
      destinationParentId: 'existing-note',
      parsePage: async () => [],
      mapBlocks: () => ({ blocks: [], warnings: [] }),
      savePage: jest.fn(),
      getPageUrl: (id) => `/bureau/${id}`,
      onProgress: jest.fn(),
    });
    expect(createPage).toHaveBeenNthCalledWith(
      1,
      plan.pages[0],
      'tasks-id',
      'existing-note',
    );
    expect(createPage).toHaveBeenNthCalledWith(
      2,
      plan.pages[1],
      'task-id',
      'tasks-id',
    );
    expect(uploadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'Tasks.csv' }),
      'tasks-id',
    );
  });

  it('retains a database parent and original file when its CSV cannot be converted', () => {
    const plan = planBureauArchiveImport([
      entry('Home.md', '# Home'),
      entry('Broken.csv', 'Name\n"unterminated'),
    ]);
    expect(plan.pages.map((page) => page.path)).toEqual([
      'Home.md',
      'Broken.csv',
    ]);
    expect(plan.pages.find((page) => page.path === 'Broken.csv')?.content).toBe(
      '',
    );
    expect(plan.unsupportedPaths).toEqual(['Broken.csv']);
  });

  it('rewrites exported and absolute Notion links to the same imported page while preserving fragments', async () => {
    const sourceId = 'a'.repeat(32);
    const plan = planBureauArchiveImport([
      entry('Home.md', 'Home'),
      entry(`Home/Child ${sourceId}.html`, '<p>Child</p>'),
    ]);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([
        ['Home.md', 'home-id'],
        [`Home/Child ${sourceId}.html`, 'child-id'],
      ]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const savePage = jest.fn().mockResolvedValue(undefined);
    await runBureauArchiveImport({
      plan,
      session,
      createPage: jest.fn(),
      uploadAttachment: jest.fn(),
      savePage,
      parsePage: async () => [
        {
          type: 'paragraph',
          content: [
            {
              type: 'link',
              href: `https://www.notion.so/Child-${sourceId}?share=copy#section`,
              content: [{ type: 'text', text: 'Absolute' }],
            },
            {
              type: 'link',
              href: `Home/Child%20${sourceId}.html#section`,
              content: [{ type: 'text', text: 'Exported' }],
            },
            {
              type: 'link',
              href: `https://notion.so.attacker.example/${sourceId}`,
              content: [{ type: 'text', text: 'External' }],
            },
          ],
        },
      ],
      mapBlocks: (blocks, resolveUrl) =>
        mapImportedAttachmentsAndLinks(blocks, {
          resolveLinkUrl: resolveUrl,
          resolveAttachmentUrl: resolveUrl,
          preserveUnmappedAttachments: true,
        }),
      getPageUrl: (id) => `/bureau/${id}`,
      onProgress: jest.fn(),
    });
    expect(
      savePage.mock.calls[0][1][0].content.map(
        (link: { href: string }) => link.href,
      ),
    ).toEqual([
      '/bureau/child-id#section',
      '/bureau/child-id#section',
      `https://notion.so.attacker.example/${sourceId}`,
    ]);
  });

  it('stops before further writes when the import workspace guard fails', async () => {
    const plan = planBureauArchiveImport([entry('Home.md', 'Home')]);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([['Home.md', 'home-id']]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    let isCurrent = true;
    const savePage = jest.fn();
    const parsePage = jest.fn();
    await expect(
      runBureauArchiveImport({
        plan,
        session,
        createPage: async () => {
          isCurrent = false;
        },
        parsePage,
        savePage,
        mapBlocks: (blocks) => mapImportedAttachmentsAndLinks(blocks),
        uploadAttachment: jest.fn(),
        getPageUrl: (id) => `/bureau/${id}`,
        onProgress: jest.fn(),
        assertCanContinue: () => {
          if (!isCurrent) throw new Error('Workspace changed');
        },
      }),
    ).rejects.toThrow('Workspace changed');
    expect(parsePage).not.toHaveBeenCalled();
    expect(savePage).not.toHaveBeenCalled();
  });

  it('keeps unlinked files accessible and resumes their final save without reuploading or duplicating content', async () => {
    const plan = planBureauArchiveImport([
      entry('Home.md', '# Home'),
      entry('Unused cover.png', 'cover bytes'),
    ]);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([['Home.md', 'home-id']]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const createPage = jest.fn().mockResolvedValue(undefined);
    const uploadAttachment = jest
      .fn()
      .mockResolvedValue('https://workspace.example/files/cover.png');
    const savePage = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const options = {
      plan,
      session,
      createPage,
      uploadAttachment,
      savePage,
      parsePage: async () => [
        { type: 'paragraph', content: [{ type: 'text', text: 'Home' }] },
      ],
      mapBlocks: (blocks: readonly unknown[]) =>
        mapImportedAttachmentsAndLinks(blocks),
      getPageUrl: (id: string) => `/bureau/${id}`,
      onProgress: jest.fn(),
    };
    const firstResult = await runBureauArchiveImport(options);
    expect(firstResult.failedPageCount).toBe(1);
    expect(createPage).toHaveBeenCalledTimes(1);
    expect(uploadAttachment).toHaveBeenCalledTimes(1);
    await runBureauArchiveImport(options);
    expect(createPage).toHaveBeenCalledTimes(1);
    expect(uploadAttachment).toHaveBeenCalledTimes(1);
    expect(savePage).toHaveBeenLastCalledWith('home-id', [
      expect.objectContaining({ type: 'paragraph' }),
      expect.objectContaining({
        type: 'file',
        props: {
          url: 'https://workspace.example/files/cover.png',
          name: 'Unused cover.png',
          fileCategory: 'OTHER',
        },
      }),
    ]);
    expect(session.failedPagesByPath?.size).toBe(0);
  });
  it('preserves nested pages, strips Notion hashes and sanitizes exported HTML', () => {
    const hash = 'a'.repeat(32);
    const plan = planBureauArchiveImport([
      entry(
        `Export/Team ${hash}/Meeting.html`,
        '<title>Meeting</title><div class="page-body"><h2>Agenda</h2><img src="photo.png" onerror="alert(1)"><script>alert(1)</script></div>',
      ),
      entry(
        `Export/Team ${hash}.html`,
        '<h1 class="page-title">Team space</h1><div class="page-body"><p>Welcome</p></div>',
      ),
      entry('Export/Database.csv', 'Name,Status\nTask,Done'),
    ]);
    expect(plan.pages.map((page) => [page.title, page.parentPath])).toEqual([
      ['Team space', null],
      ['Meeting', `Export/Team ${hash}.html`],
      ['Database', null],
    ]);
    expect(plan.pages[1].content).toContain('<h2>Agenda</h2>');
    expect(plan.pages[1].content).not.toMatch(/script|onerror/);
    expect(plan.unsupportedPaths).toEqual(['Export/Database.csv']);
  });

  it('handles parent-relative and encoded paths without treating external URLs as archive files', () => {
    expect(
      resolveBureauArchivePath(
        'Team/Meeting.html',
        '../Home%20page.html#section',
      ),
    ).toBe('Home page.html');
    expect(resolveBureauArchivePath('Team/Meeting.html', 'Photo%231.png')).toBe(
      'Team/Photo#1.png',
    );
    expect(
      resolveBureauArchivePath('Team/Meeting.html', '../../outside'),
    ).toBeNull();
    expect(
      resolveBureauArchivePath(
        'Team/Meeting.html',
        'https://example.com/image.png',
      ),
    ).toBeNull();
    expect(() =>
      planBureauArchiveImport([entry('../outside.html', '')]),
    ).toThrow('Unsafe');
    expect(() => planBureauArchiveImport([entry('/outside.html', '')])).toThrow(
      'Unsafe',
    );
  });

  it('imports images, attachments and forward page links, then resumes failed saves without duplicate pages or uploads', async () => {
    const plan = planBureauArchiveImport([
      entry('Home.md', '# Home'),
      entry('Home/Child.html', '<p>Child</p>'),
      entry('Home/photo.png', 'image bytes'),
    ]);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([
        ['Home.md', 'home-id'],
        ['Home/Child.html', 'child-id'],
      ]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const createPage = jest.fn().mockResolvedValue(undefined);
    const uploadAttachment = jest
      .fn()
      .mockResolvedValue('https://workspace.example/files/photo.png');
    const savePage = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const options = {
      plan,
      session,
      createPage,
      uploadAttachment,
      savePage,
      parsePage: async () => [
        { type: 'image', props: { url: 'Home/photo.png' } },
        {
          type: 'paragraph',
          content: [
            {
              type: 'link',
              href: 'Home/Child.html',
              content: [{ type: 'text', text: 'Child page' }],
            },
          ],
        },
      ],
      mapBlocks: (
        blocks: readonly unknown[],
        resolveUrl: (url: string) => string | null,
      ) =>
        mapImportedAttachmentsAndLinks(blocks, {
          resolveAttachmentUrl: resolveUrl,
          preserveUnmappedAttachments: true,
          resolveLinkUrl: resolveUrl,
        }),
      getPageUrl: (id: string) => `/bureau/${id}`,
      onProgress: jest.fn(),
    };
    await expect(runBureauArchiveImport(options)).resolves.toMatchObject({
      failedPageCount: 1,
    });
    await runBureauArchiveImport(options);
    expect(createPage).toHaveBeenCalledTimes(2);
    expect(createPage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'Child' }),
      'child-id',
      'home-id',
    );
    await runBureauArchiveImport(options);
    expect(createPage).toHaveBeenCalledTimes(2);
    expect(uploadAttachment).toHaveBeenCalledTimes(1);
    expect(savePage).toHaveBeenCalledWith('home-id', [
      expect.objectContaining({
        type: 'image',
        props: { url: 'https://workspace.example/files/photo.png' },
      }),
      expect.objectContaining({
        content: [expect.objectContaining({ href: '/bureau/child-id' })],
      }),
    ]);
    expect(session.completedPaths.size).toBe(2);
  });

  it('applies native page covers from the archive and keeps remote ones as-is', async () => {
    const plan = planBureauArchiveImport([
      entry(
        'Home.html',
        '<article><header><img class="page-cover-image" src="Home/cover.png"><h1 class="page-title">Home</h1></header><div class="page-body"><p>Hi</p></div></article>',
      ),
      entry(
        'Remote.html',
        '<article><header><img class="page-cover-image" src="https://images.unsplash.com/photo-1"><h1 class="page-title">Remote</h1></header><div class="page-body"><p>Hi</p></div></article>',
      ),
      entry('Home/cover.png', 'cover bytes'),
    ]);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([
        ['Home.html', 'home-id'],
        ['Remote.html', 'remote-id'],
      ]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const uploadAttachment = jest
      .fn()
      .mockResolvedValue('https://files.example/cover.png');
    const applyPageCover = jest.fn().mockResolvedValue(undefined);
    const options = {
      plan,
      session,
      createPage: jest.fn(),
      uploadAttachment,
      applyPageCover,
      savePage: jest.fn(),
      parsePage: async () => [],
      mapBlocks: () => ({ blocks: [], warnings: [] }),
      getPageUrl: (id: string) => `/bureau/${id}`,
      onProgress: jest.fn(),
    };
    await runBureauArchiveImport(options);
    expect(applyPageCover).toHaveBeenCalledWith(
      plan.pages[0],
      'home-id',
      'https://files.example/cover.png',
    );
    expect(applyPageCover).toHaveBeenCalledWith(
      plan.pages[1],
      'remote-id',
      'https://images.unsplash.com/photo-1',
    );
    expect(uploadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'Home/cover.png' }),
      'home-id',
    );
    // A retry keeps covers idempotent.
    const secondApply = applyPageCover.mock.calls.length;
    await runBureauArchiveImport(options);
    expect(applyPageCover.mock.calls.length).toBe(secondApply);
  });

  it('isolates a failing page so the rest keeps importing, then retries it', async () => {
    const plan = planBureauArchiveImport([
      entry('A.md', '# A'),
      entry('B.md', '# B'),
      entry('C.md', '# C'),
    ]);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map(
        plan.pages.map((page) => [page.path, `${page.path}-id`]),
      ),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const savePage = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Save failed'))
      .mockResolvedValue(undefined);
    const options = {
      plan,
      session,
      createPage: jest.fn(),
      uploadAttachment: jest.fn(),
      savePage,
      parsePage: async (page: { path: string }) => [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: `Content ${page.path}` }],
        },
      ],
      mapBlocks: (blocks: readonly unknown[]) =>
        mapImportedAttachmentsAndLinks(blocks),
      getPageUrl: (id: string) => `/bureau/${id}`,
      onProgress: jest.fn(),
    };
    const result = await runBureauArchiveImport(options);
    // One failing page no longer stops the whole import.
    expect(result.failedPageCount).toBe(1);
    expect(session.completedPaths.has('A.md')).toBe(true);
    expect(session.completedPaths.has('B.md')).toBe(false);
    expect(session.completedPaths.has('C.md')).toBe(true);
    expect(session.failedPagesByPath?.get('B.md')).toBe('Save failed');
    await runBureauArchiveImport(options);
    expect(session.completedPaths.size).toBe(3);
    expect(
      savePage.mock.calls.filter((call) => call[0] === 'B.md-id'),
    ).toHaveLength(2);
  });

  it('resolves page-link placeholders to imported record ids and keeps title text for unknown targets', async () => {
    const sourceId = 'f'.repeat(32);
    const plan = planBureauArchiveImport([
      entry('Home.md', '# Home'),
      entry(`Home/Child ${sourceId}.html`, '<p>Child</p>'),
    ]);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([
        ['Home.md', 'home-id'],
        [`Home/Child ${sourceId}.html`, 'child-id'],
      ]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const savePage = jest.fn();
    await runBureauArchiveImport({
      plan,
      session,
      createPage: jest.fn(),
      uploadAttachment: jest.fn(),
      savePage,
      parsePage: async () => [
        {
          type: 'pageLink',
          props: {
            documentId: `notion:${sourceId}`,
            title: '📚 Child',
          },
        },
        {
          type: 'pageLink',
          props: { documentId: 'notion:deadbeef', title: 'External' },
        },
      ],
      mapBlocks: (blocks, resolveUrl, pageLinkResolvers) =>
        mapImportedAttachmentsAndLinks(blocks, {
          resolveAttachmentUrl: resolveUrl,
          preserveUnmappedAttachments: true,
          resolveLinkUrl: resolveUrl,
          ...(pageLinkResolvers ?? {}),
        }),
      getPageUrl: (id) => `/bureau/${id}`,
      onProgress: jest.fn(),
    });
    expect(savePage.mock.calls[0][1][0]).toMatchObject({
      type: 'pageLink',
      props: { documentId: 'child-id', title: '📚 Child' },
    });
    expect(savePage.mock.calls[0][1][1]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: 'External' }],
    });
  });

  it('resolves relation chips inside table cells to imported record ids', async () => {
    const sourceId = 'e'.repeat(32);
    const plan = planBureauArchiveImport([
      entry('Home.md', '# Home'),
      entry(`Tasks/2.11 ${sourceId}.html`, '<p>Row page</p>'),
    ]);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([
        ...plan.pages.map((page): [string, string] => [
          page.path,
          `${page.path}-id`,
        ]),
        ['Home.md', 'home-id'],
        [`Tasks/2.11 ${sourceId}.html`, 'relation-id'],
      ]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const savePage = jest.fn();
    await runBureauArchiveImport({
      plan,
      session,
      createPage: jest.fn(),
      uploadAttachment: jest.fn(),
      savePage,
      parsePage: async () => [
        {
          type: 'table',
          content: {
            type: 'tableContent',
            rows: [
              {
                cells: [
                  [
                    {
                      type: 'mention',
                      props: {
                        recordId: `notion:${sourceId}`,
                        objectNameSingular: 'document',
                        label: '2.11',
                      },
                    },
                  ],
                ],
              },
            ],
          },
        },
      ],
      mapBlocks: (blocks, resolveUrl, pageLinkResolvers) =>
        mapImportedAttachmentsAndLinks(blocks, {
          resolveAttachmentUrl: resolveUrl,
          preserveUnmappedAttachments: true,
          resolveLinkUrl: resolveUrl,
          ...(pageLinkResolvers ?? {}),
        }),
      getPageUrl: (id) => `/bureau/${id}`,
      onProgress: jest.fn(),
    });
    const saved = JSON.stringify(savePage.mock.calls[0][1]);
    expect(saved).toContain('"relation-id"');
    expect(saved).toContain('"type":"mention"');
  });

  it('does not let failing cover uploads fail the page content', async () => {
    const plan = planBureauArchiveImport([
      entry(
        'Home.html',
        '<article><header><img class="page-cover-image" src="Home/cover.png"><h1 class="page-title">Home</h1></header><div class="page-body"><p>Hi</p></div></article>',
      ),
      entry('Home/cover.png', 'cover bytes'),
    ]);
    const session: BureauArchiveImportSession = {
      documentIdsByPath: new Map([['Home.html', 'home-id']]),
      createdPaths: new Set(),
      completedPaths: new Set(),
      attachmentUrls: new Map(),
    };
    const applyPageCover = jest
      .fn()
      .mockRejectedValueOnce(new Error('Cover upload failed'))
      .mockResolvedValue(undefined);
    const options = {
      plan,
      session,
      createPage: jest.fn(),
      uploadAttachment: jest
        .fn()
        .mockResolvedValue('https://files.example/cover.png'),
      applyPageCover,
      savePage: jest.fn(),
      parsePage: async () => [
        { type: 'paragraph', content: [{ type: 'text', text: 'Body' }] },
      ],
      mapBlocks: (blocks: readonly unknown[]) =>
        mapImportedAttachmentsAndLinks(blocks),
      getPageUrl: (id: string) => `/bureau/${id}`,
      onProgress: jest.fn(),
    };
    const result = await runBureauArchiveImport(options);
    expect(result.failedPageCount).toBe(1);
    expect(session.completedPaths.has('Home.html')).toBe(true);
    expect(session.pendingCoverPaths?.has('Home.html')).toBe(true);
    await runBureauArchiveImport(options);
    expect(applyPageCover).toHaveBeenCalledTimes(2);
    expect(session.pendingCoverPaths?.has('Home.html')).toBe(false);
  });
});
