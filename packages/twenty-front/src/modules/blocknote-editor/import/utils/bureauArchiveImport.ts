import {
  type DocumentsTransferEntry,
  decodeEntryTarget,
  getEntryBaseName,
  getEntryDirectory,
  hasMarkdownExtension,
  normalizeEntryPath,
  stripNotionEntryHash,
} from '@/blocknote-editor/import/utils/documentsTransferEntries';
import { sanitizeNotionHtml } from '@/blocknote-editor/import/utils/prepareNotionHtml';
import { collectHtmlImportWarnings } from '@/blocknote-editor/import/utils/htmlImportWarnings';
import { isDefined } from 'twenty-shared/utils';

export type BureauArchivePage = {
  path: string;
  title: string;
  parentPath: string | null;
  format: 'html' | 'markdown';
  content: string;
};

export type BureauArchiveImportPlan = {
  pages: BureauArchivePage[];
  entriesByPath: Map<string, DocumentsTransferEntry>;
  unsupportedPaths: string[];
  reviewCountsByPath?: Map<string, number>;
};

export const resolveBureauArchivePath = (
  pagePath: string,
  target: string,
): string | null => {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) return null;

  const decodedTarget = decodeEntryTarget(target.split(/[?#]/)[0]);
  const directory = target.startsWith('/') ? '' : getEntryDirectory(pagePath);
  const segments: string[] = [];

  for (const segment of `${directory}/${decodedTarget}`.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) return null;
      segments.pop();
    } else {
      segments.push(segment);
    }
  }

  return segments.join('/');
};

export const planBureauArchiveImport = (
  entries: DocumentsTransferEntry[],
): BureauArchiveImportPlan => {
  const entriesByPath = new Map<string, DocumentsTransferEntry>();

  for (const entry of entries) {
    if (/^(?:[\\/]|[a-z]:)/i.test(entry.path))
      throw new Error('Unsafe archive path');
    const path = normalizeEntryPath(entry.path);
    if (
      path.split('/').some((segment) => segment === '..') ||
      /^(?:\/|[a-z]:)/i.test(path)
    )
      throw new Error('Unsafe archive path');
    if (entriesByPath.has(path)) throw new Error('Duplicate archive path');
    entriesByPath.set(path, { path, bytes: entry.bytes });
  }

  const pages: BureauArchivePage[] = [];
  const reviewCountsByPath = new Map<string, number>();

  for (const [path, entry] of entriesByPath) {
    const format = /\.html?$/i.test(path)
      ? 'html'
      : hasMarkdownExtension(path)
        ? 'markdown'
        : null;
    if (format === null) continue;
    const content = new TextDecoder().decode(entry.bytes);
    const fileTitle = stripNotionEntryHash(
      getEntryBaseName(path).replace(/\.(html?|md|markdown)$/i, ''),
    );
    const parsedDocument =
      format === 'html'
        ? new DOMParser().parseFromString(content, 'text/html')
        : null;
    const title =
      parsedDocument?.querySelector('.page-title')?.textContent?.trim() ||
      parsedDocument?.title?.trim() ||
      fileTitle ||
      'Untitled';
    const bodyHtml =
      parsedDocument?.querySelector('.page-body')?.innerHTML ?? content;
    if (format === 'html')
      reviewCountsByPath.set(path, collectHtmlImportWarnings(bodyHtml).length);
    pages.push({
      path,
      title,
      parentPath: null,
      format,
      content: format === 'html' ? sanitizeNotionHtml(bodyHtml) : content,
    });
  }

  const pageByFolder = new Map(
    pages.map((page) => [
      page.path.replace(/\.(html?|md|markdown)$/i, ''),
      page,
    ]),
  );

  for (const page of pages) {
    let directory = getEntryDirectory(page.path);
    while (directory !== '') {
      const parent = pageByFolder.get(directory);
      if (parent) {
        page.parentPath = parent.path;
        break;
      }
      directory = getEntryDirectory(directory);
    }
  }

  // Parent depth sorts before children even when the zip entries are shuffled.
  pages.sort(
    (first, second) =>
      first.path.split('/').length - second.path.split('/').length ||
      first.path.localeCompare(second.path),
  );

  return {
    pages,
    entriesByPath,
    unsupportedPaths: [...entriesByPath.keys()].filter((path) =>
      /\.(csv|json|zip)$/i.test(path),
    ),
    reviewCountsByPath,
  };
};

export type BureauArchiveImportSession = {
  documentIdsByPath: Map<string, string>;
  createdPaths: Set<string>;
  completedPaths: Set<string>;
  attachmentUrls: Map<string, string>;
  mappedBlocksByPath?: Map<string, Record<string, unknown>[]>;
  extraFilePaths?: string[];
  warningCountsByPath?: Map<string, number>;
};

type RunBureauArchiveImportOptions = {
  plan: BureauArchiveImportPlan;
  session: BureauArchiveImportSession;
  createPage: (
    page: BureauArchivePage,
    id: string,
    parentId: string | null,
  ) => Promise<void>;
  parsePage: (page: BureauArchivePage) => Promise<readonly unknown[]>;
  mapBlocks: (
    blocks: readonly unknown[],
    resolveUrl: (url: string) => string | null,
  ) => { blocks: Record<string, unknown>[]; warnings: unknown[] };
  uploadAttachment: (
    entry: DocumentsTransferEntry,
    documentId: string,
  ) => Promise<string>;
  savePage: (
    documentId: string,
    blocks: Record<string, unknown>[],
  ) => Promise<void>;
  getPageUrl: (documentId: string) => string;
  onProgress: (completedCount: number, totalCount: number) => void;
  assertCanContinue?: () => void;
};

export const runBureauArchiveImport = async (
  options: RunBureauArchiveImportOptions,
): Promise<{ warningCount: number }> => {
  const { plan, session } = options;
  session.mappedBlocksByPath ??= new Map();
  session.warningCountsByPath ??= new Map();
  const documentIdsByNotionId = new Map<string, string>();
  for (const page of plan.pages) {
    const sourceId =
      /([a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})\.(?:html?|md|markdown)$/i.exec(
        page.path,
      )?.[1];
    const documentId = session.documentIdsByPath.get(page.path);
    if (sourceId && documentId)
      documentIdsByNotionId.set(
        sourceId.replaceAll('-', '').toLowerCase(),
        documentId,
      );
  }

  const resolveLinkedDocumentId = (pagePath: string, url: string) => {
    const path = resolveBureauArchivePath(pagePath, url);
    if (path !== null) return session.documentIdsByPath.get(path);
    try {
      const source = new URL(url);
      if (
        !/^(?:https?:)$/.test(source.protocol) ||
        !/(?:^|\.)notion\.(?:so|site)$/i.test(source.hostname)
      )
        return undefined;
      const sourceId =
        /([a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i.exec(
          source.pathname,
        )?.[1];
      return sourceId
        ? documentIdsByNotionId.get(sourceId.replaceAll('-', '').toLowerCase())
        : undefined;
    } catch {
      return undefined;
    }
  };

  // Allocate every page first so forward and backward links resolve equally.
  for (const page of plan.pages) {
    options.assertCanContinue?.();
    if (session.createdPaths.has(page.path)) continue;
    const id = session.documentIdsByPath.get(page.path);
    if (!id) throw new Error('Missing import identity');
    const parentId = page.parentPath
      ? session.documentIdsByPath.get(page.parentPath)
      : null;
    if (page.parentPath && !parentId) throw new Error('Missing import parent');
    await options.createPage(page, id, parentId ?? null);
    options.assertCanContinue?.();
    session.createdPaths.add(page.path);
  }

  for (const page of plan.pages) {
    options.assertCanContinue?.();
    if (session.completedPaths.has(page.path)) continue;
    const documentId = session.documentIdsByPath.get(page.path);
    if (!documentId) throw new Error('Missing import identity');
    const blocks = await options.parsePage(page);
    options.assertCanContinue?.();

    // The first pass discovers references without doing asynchronous work in
    // the shared block mapper's synchronous URL resolver.
    const references = new Set<string>();
    options.mapBlocks(blocks, (url) => {
      references.add(url);
      return url;
    });

    for (const reference of references) {
      const path = resolveBureauArchivePath(page.path, reference);
      if (!path || session.documentIdsByPath.has(path)) continue;
      const entry = plan.entriesByPath.get(path);
      const attachmentKey = `${documentId}:${path}`;
      if (entry && !session.attachmentUrls.has(attachmentKey)) {
        options.assertCanContinue?.();
        session.attachmentUrls.set(
          attachmentKey,
          await options.uploadAttachment(entry, documentId),
        );
        options.assertCanContinue?.();
      }
    }

    const mapped = options.mapBlocks(blocks, (url) => {
      const linkedId = resolveLinkedDocumentId(page.path, url);
      const fragment = url.includes('#') ? url.slice(url.indexOf('#')) : '';
      if (linkedId) return `${options.getPageUrl(linkedId)}${fragment}`;
      const path = resolveBureauArchivePath(page.path, url);
      if (path === null)
        return /^(?:https?:|mailto:|tel:|#|\/\/)/i.test(url) ? url : null;
      return session.attachmentUrls.get(`${documentId}:${path}`) ?? null;
    });

    session.warningCountsByPath.set(
      page.path,
      mapped.warnings.length + (plan.reviewCountsByPath?.get(page.path) ?? 0),
    );
    session.mappedBlocksByPath.set(page.path, mapped.blocks);
    options.assertCanContinue?.();
    await options.savePage(documentId, mapped.blocks);
    options.assertCanContinue?.();
    session.completedPaths.add(page.path);
    options.onProgress(session.completedPaths.size, plan.pages.length);
  }

  // Covers, icons and other files outside the parsed body must stay accessible.
  const firstPage = plan.pages[0];
  const firstDocumentId = isDefined(firstPage)
    ? session.documentIdsByPath.get(firstPage.path)
    : undefined;
  if (isDefined(firstPage) && isDefined(firstDocumentId)) {
    const referencedPaths = new Set(
      [...session.attachmentUrls.keys()].map((key) =>
        key.slice(key.indexOf(':') + 1),
      ),
    );
    session.extraFilePaths ??= [...plan.entriesByPath.keys()].filter(
      (path) =>
        !session.documentIdsByPath.has(path) && !referencedPaths.has(path),
    );
    const extraBlocks: Record<string, unknown>[] = [];
    for (const path of session.extraFilePaths) {
      options.assertCanContinue?.();
      const entry = plan.entriesByPath.get(path);
      if (!entry) continue;
      const attachmentKey = `${firstDocumentId}:${path}`;
      const url =
        session.attachmentUrls.get(attachmentKey) ??
        (await options.uploadAttachment(entry, firstDocumentId));
      options.assertCanContinue?.();
      session.attachmentUrls.set(attachmentKey, url);
      extraBlocks.push({
        type: 'file',
        props: { url, name: entry.path, fileCategory: 'OTHER' },
      });
    }
    if (extraBlocks.length > 0) {
      options.assertCanContinue?.();
      await options.savePage(firstDocumentId, [
        ...(session.mappedBlocksByPath.get(firstPage.path) ?? []),
        ...extraBlocks,
      ]);
      options.assertCanContinue?.();
    }
  }

  return {
    warningCount:
      plan.unsupportedPaths.length +
      [...session.warningCountsByPath.values()].reduce(
        (sum, count) => sum + count,
        0,
      ),
  };
};
