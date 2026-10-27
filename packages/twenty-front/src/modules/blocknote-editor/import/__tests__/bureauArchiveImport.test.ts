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
      'Broken.csv',
      'Home.md',
    ]);
    expect(plan.pages[0].content).toBe('');
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
    await expect(runBureauArchiveImport(options)).rejects.toThrow('offline');
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
      ['Database', null],
      ['Team space', null],
      ['Meeting', `Export/Team ${hash}.html`],
    ]);
    expect(plan.pages[2].content).toContain('<h2>Agenda</h2>');
    expect(plan.pages[2].content).not.toMatch(/script|onerror/);
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
          resolveLinkUrl: resolveUrl,
        }),
      getPageUrl: (id: string) => `/bureau/${id}`,
      onProgress: jest.fn(),
    };
    await expect(runBureauArchiveImport(options)).rejects.toThrow('offline');
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
});
