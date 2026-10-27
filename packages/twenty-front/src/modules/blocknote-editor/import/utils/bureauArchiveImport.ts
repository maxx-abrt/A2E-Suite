import { buildBureauArchiveHierarchy } from '@/blocknote-editor/import/utils/buildBureauArchiveHierarchy';
import {
  type DocumentsTransferEntry,
  decodeEntryTarget,
  getEntryBaseName,
  getEntryDirectory,
  getNotionEntryId,
  findSingleRootPrefix,
  hasMarkdownExtension,
  normalizeEntryPath,
  stripNotionEntryHash,
} from '@/blocknote-editor/import/utils/documentsTransferEntries';
import { sanitizeNotionHtml } from '@/blocknote-editor/import/utils/prepareNotionHtml';
import { collectHtmlImportWarnings } from '@/blocknote-editor/import/utils/htmlImportWarnings';
import { preserveNotionFormatting } from '@/blocknote-editor/import/utils/preserveNotionFormatting';
import { isDefined } from 'twenty-shared/utils';
import Papa from 'papaparse';

const MAX_CSV_TABLE_ROWS = 1000;
const MAX_CSV_TABLE_CELLS = 20000;

const csvToTableHtml = (content: string) => {
  const document = new DOMParser().parseFromString('', 'text/html');
  const table = document.createElement('table');
  const { data, errors } = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
    delimiter: ',',
    preview: MAX_CSV_TABLE_ROWS + 1,
  });
  if (
    errors.length > 0 ||
    data.length > MAX_CSV_TABLE_ROWS ||
    data.reduce((count, row) => count + row.length, 0) > MAX_CSV_TABLE_CELLS
  )
    return null;
  data.forEach((row, index) => {
    const tableRow = table.insertRow();
    row.forEach((value) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      cell.textContent = value;
      tableRow.appendChild(cell);
    });
  });
  return table.outerHTML;
};

export type BureauArchivePage = {
  path: string;
  title: string;
  parentPath: string | null;
  format: 'html' | 'markdown';
  content: string;
  sourcePaths?: string[];
  icon?: string;
};

export type BureauArchiveImportPlan = {
  pages: BureauArchivePage[];
  entriesByPath: Map<string, DocumentsTransferEntry>;
  unsupportedPaths: string[];
  reviewCountsByPath?: Map<string, number>;
  canonicalPathByPath?: Map<string, string>;
  sourceFile?: DocumentsTransferEntry;
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
    if (
      entry.path.split('/').some((segment) => segment === '__MACOSX') ||
      /(?:^|\/)\._|(?:^|\/)\.DS_Store$/.test(entry.path)
    )
      continue;
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
  const canonicalPathByPath = new Map<string, string>();
  const pagesByIdentity = new Map<string, BureauArchivePage>();
  const sourceOrder = new Map(
    [...entriesByPath.keys()].map((path, index) => [path, index]),
  );
  // HTML carries properties and layout that the CSV companion does not contain.
  const formatRank = (path: string) =>
    /\.html?$/i.test(path) ? 0 : hasMarkdownExtension(path) ? 1 : 2;
  for (const [path, entry] of [...entriesByPath].sort(
    ([first], [second]) => formatRank(first) - formatRank(second),
  )) {
    const format = /\.html?$/i.test(path)
      ? 'html'
      : hasMarkdownExtension(path)
        ? 'markdown'
        : /\.csv$/i.test(path)
          ? 'html'
          : null;
    if (format === null) continue;
    const identity =
      getNotionEntryId(path) ?? path.replace(/\.(html?|md|markdown|csv)$/i, '');
    const existingPage = pagesByIdentity.get(identity);
    if (existingPage) {
      existingPage.sourcePaths?.push(path);
      canonicalPathByPath.set(path, existingPage.path);
      if (/\.csv$/i.test(path)) {
        const table = csvToTableHtml(new TextDecoder().decode(entry.bytes));
        if (table !== null) {
          // A visible HTML database view may omit columns that the CSV retains.
          const document = new DOMParser().parseFromString(table, 'text/html');
          const details = document.createElement('details');
          const summary = document.createElement('summary');
          summary.textContent = `${stripNotionEntryHash(getEntryBaseName(path).replace(/\.csv$/i, ''))}.csv`;
          details.append(summary, ...document.body.childNodes);
          existingPage.content += sanitizeNotionHtml(details.outerHTML);
        } else
          reviewCountsByPath.set(
            existingPage.path,
            (reviewCountsByPath.get(existingPage.path) ?? 0) + 1,
          );
      }
      continue;
    }
    const sourceContent = new TextDecoder().decode(entry.bytes);
    const content = /\.csv$/i.test(path)
      ? csvToTableHtml(sourceContent)
      : sourceContent;
    const fileTitle = stripNotionEntryHash(
      getEntryBaseName(path).replace(/\.(html?|md|markdown|csv)$/i, ''),
    );
    const parsedDocument =
      format === 'html'
        ? new DOMParser().parseFromString(content ?? '', 'text/html')
        : null;
    if (parsedDocument) preserveNotionFormatting(parsedDocument);
    const title =
      parsedDocument?.querySelector('.page-title')?.textContent?.trim() ||
      parsedDocument?.title?.trim() ||
      fileTitle ||
      'Untitled';
    const pageBody = parsedDocument?.querySelector('.page-body');
    const header = parsedDocument?.querySelector('article > header');
    const cover = header?.querySelector('.page-cover-image');
    const description = header?.querySelector('.page-description');
    const properties = parsedDocument?.querySelector('table.properties');
    const bodyHtml = pageBody
      ? [
          cover?.outerHTML ?? '',
          description?.outerHTML ?? '',
          properties && !pageBody.contains(properties)
            ? properties.outerHTML
            : '',
          pageBody.innerHTML,
        ].join('')
      : (content ?? '');
    const iconElement = header?.querySelector('.page-icon, .icon');
    const icon =
      iconElement?.getAttribute('data-emoji') ||
      iconElement?.textContent?.trim() ||
      undefined;
    if (format === 'html')
      reviewCountsByPath.set(
        path,
        collectHtmlImportWarnings(bodyHtml).length + (content === null ? 1 : 0),
      );
    const page: BureauArchivePage = {
      path,
      title,
      parentPath: null,
      format,
      content:
        format === 'html' ? sanitizeNotionHtml(bodyHtml) : (content ?? ''),
      sourcePaths: [path],
      icon,
    };
    pages.push(page);
    pagesByIdentity.set(identity, page);
    canonicalPathByPath.set(path, path);
  }

  pages.sort((first, second) => {
    const order = (page: BureauArchivePage) =>
      Math.min(
        ...(page.sourcePaths ?? [page.path]).map(
          (path) => sourceOrder.get(path) ?? 0,
        ),
      );
    return order(first) - order(second);
  });
  const orderedPages = buildBureauArchiveHierarchy(
    pages,
    findSingleRootPrefix([...entriesByPath.values()]),
  );

  return {
    pages: orderedPages,
    entriesByPath,
    canonicalPathByPath,
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
  destinationParentId?: string | null;
  onOperation?: (path: string, stage: 'create' | 'content' | 'file') => void;
};

export const runBureauArchiveImport = async (
  options: RunBureauArchiveImportOptions,
): Promise<{ warningCount: number }> => {
  const { plan, session } = options;
  session.mappedBlocksByPath ??= new Map();
  session.warningCountsByPath ??= new Map();
  const canonicalPath = (path: string) =>
    plan.canonicalPathByPath?.get(path) ?? path;
  const getDocumentId = (path: string) =>
    session.documentIdsByPath.get(canonicalPath(path));
  const failedUploads = new Map<string, { path: string; message: string }>();
  const referencedAttachmentPaths = new Set<string>();
  const upload = async (
    entry: DocumentsTransferEntry,
    documentId: string,
    attachmentKey: string,
  ) => {
    options.assertCanContinue?.();
    options.onOperation?.(entry.path, 'file');
    try {
      const url = await options.uploadAttachment(entry, documentId);
      options.assertCanContinue?.();
      session.attachmentUrls.set(attachmentKey, url);
      return url;
    } catch (error) {
      options.assertCanContinue?.();
      failedUploads.set(attachmentKey, {
        path: entry.path,
        message: error instanceof Error ? error.message : 'Upload failed',
      });
      return null;
    }
  };
  const documentIdsByNotionId = new Map<string, string>();
  for (const page of plan.pages) {
    const sourceId = getNotionEntryId(page.path);
    const documentId = session.documentIdsByPath.get(page.path);
    if (sourceId && documentId)
      documentIdsByNotionId.set(
        sourceId.replaceAll('-', '').toLowerCase(),
        documentId,
      );
  }

  const resolveLinkedDocumentId = (pagePath: string, url: string) => {
    const path = resolveBureauArchivePath(pagePath, url);
    if (path !== null)
      return (
        getDocumentId(path) ??
        documentIdsByNotionId.get(getNotionEntryId(path) ?? '')
      );
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
      : (options.destinationParentId ?? null);
    if (page.parentPath && !parentId) throw new Error('Missing import parent');
    options.onOperation?.(page.path, 'create');
    await options.createPage(page, id, parentId ?? null);
    options.assertCanContinue?.();
    session.createdPaths.add(page.path);
  }

  for (const page of plan.pages) {
    options.assertCanContinue?.();
    if (session.completedPaths.has(page.path)) continue;
    const documentId = session.documentIdsByPath.get(page.path);
    if (!documentId) throw new Error('Missing import identity');
    options.onOperation?.(page.path, 'content');
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
      if (!path || getDocumentId(path)) continue;
      const entry = plan.entriesByPath.get(path);
      if (entry) referencedAttachmentPaths.add(path);
      const attachmentKey = `${documentId}:${path}`;
      if (entry && !session.attachmentUrls.has(attachmentKey)) {
        await upload(entry, documentId, attachmentKey);
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
    options.onOperation?.(page.path, 'content');
    await options.savePage(documentId, mapped.blocks);
    options.assertCanContinue?.();
    if (
      ![...references].some((url) => {
        const path = resolveBureauArchivePath(page.path, url);
        return path !== null && failedUploads.has(`${documentId}:${path}`);
      })
    )
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
        (!getDocumentId(path) || /\.csv$/i.test(path)) &&
        !referencedPaths.has(path) &&
        !referencedAttachmentPaths.has(path),
    );
    const sourceKey = `bureau-original-export:${plan.sourceFile?.path ?? ''}`;
    if (plan.sourceFile && !session.extraFilePaths.includes(sourceKey))
      session.extraFilePaths.push(sourceKey);
    const extraBlocksByPagePath = new Map<string, Record<string, unknown>[]>();
    const findOwner = (path: string) => {
      if (getDocumentId(path)) return canonicalPath(path);
      const owners = plan.pages
        .flatMap((page) =>
          (page.sourcePaths ?? [page.path]).flatMap((sourcePath) => {
            const stem = sourcePath.replace(/\.(html?|md|markdown|csv)$/i, '');
            const folders = [
              stem,
              `${getEntryDirectory(stem)}/${stripNotionEntryHash(getEntryBaseName(stem))}`.replace(
                /^\//,
                '',
              ),
            ];
            return folders
              .filter((folder) => path.startsWith(`${folder}/`))
              .map((folder) => ({ pagePath: page.path, depth: folder.length }));
          }),
        )
        .sort((first, second) => second.depth - first.depth);
      return owners[0]?.pagePath ?? firstPage.path;
    };
    for (const path of session.extraFilePaths) {
      options.assertCanContinue?.();
      const entry =
        path === sourceKey ? plan.sourceFile : plan.entriesByPath.get(path);
      if (!entry) continue;
      const ownerPagePath = findOwner(path);
      const ownerDocumentId =
        session.documentIdsByPath.get(ownerPagePath) ?? firstDocumentId;
      const attachmentKey = `${ownerDocumentId}:${path}`;
      const url =
        session.attachmentUrls.get(attachmentKey) ??
        (await upload(entry, ownerDocumentId, attachmentKey));
      if (!url) continue;
      options.assertCanContinue?.();
      session.attachmentUrls.set(attachmentKey, url);
      const extraBlocks = extraBlocksByPagePath.get(ownerPagePath) ?? [];
      extraBlocks.push({
        type: 'file',
        props: { url, name: entry.path, fileCategory: 'OTHER' },
      });
      extraBlocksByPagePath.set(ownerPagePath, extraBlocks);
    }
    for (const [pagePath, extraBlocks] of extraBlocksByPagePath) {
      options.assertCanContinue?.();
      const documentId = session.documentIdsByPath.get(pagePath);
      if (!documentId) throw new Error('Missing attachment owner');
      options.onOperation?.(pagePath, 'content');
      await options.savePage(documentId, [
        ...(session.mappedBlocksByPath.get(pagePath) ?? []),
        ...extraBlocks,
      ]);
      options.assertCanContinue?.();
    }
  }

  if (failedUploads.size > 0) {
    const { path, message } = [...failedUploads.values()][0];
    options.onOperation?.(path, 'file');
    throw new Error(
      `${failedUploads.size} file upload(s) need retry. ${message}`,
    );
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
