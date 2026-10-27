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
  // Archive-relative path or absolute URL of the exported page cover; the
  // record stores covers natively, so they no longer sit in the content body.
  coverSource?: string;
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
  const resolveCoverSource = (
    pagePath: string,
    source: string,
  ): string | undefined => {
    // Remote covers pass through unchanged; archive covers must still exist.
    if (/^#/.test(source)) return undefined;
    if (/^https?:\/\//i.test(source)) return source;
    if (source.startsWith('//')) return `https:${source}`;
    const resolved = resolveBureauArchivePath(pagePath, source);
    if (resolved === null || !entriesByPath.has(resolved)) return undefined;
    return resolved;
  };
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
    const article = parsedDocument?.querySelector('article');
    const header = parsedDocument?.querySelector('article > header');
    const iconElement = header?.querySelector('.page-icon, .icon');
    const articleIcon = article?.getAttribute('data-notion-page-icon');
    const isImageIcon = (value: string) =>
      /^(?:[a-z][a-z\d+.-]*:|[/.])/i.test(value) ||
      /\.(?:svg|png|jpe?g|webp|gif)(?:[?#]|$)/i.test(value);
    let icon =
      iconElement?.getAttribute('data-emoji') ||
      iconElement?.textContent?.trim() ||
      undefined;
    if (!icon) {
      // Some exports only annotate the page icon on the article element; the
      // header markup may be empty or carry no glyph at all.
      if (articleIcon && !isImageIcon(articleIcon)) icon = articleIcon;
    }
    if (icon && isImageIcon(icon)) icon = undefined;
    const coverImageElement = header?.querySelector('.page-cover-image');
    const coverSource =
      coverImageElement?.tagName === 'IMG'
        ? (coverImageElement.getAttribute('src') ?? undefined)
        : (coverImageElement?.querySelector('img[src]')?.getAttribute('src') ??
          undefined);
    const resolvedCoverSource =
      coverSource !== undefined
        ? resolveCoverSource(path, coverSource)
        : undefined;
    // Comments and other export metadata may sit outside .page-body. Remove
    // only decorations represented on the record, keeping all other content.
    if (pageBody) {
      parsedDocument?.querySelector('.page-title')?.remove();
      if (resolvedCoverSource !== undefined) coverImageElement?.remove();
      const iconImage = iconElement?.matches('img')
        ? iconElement
        : iconElement?.querySelector('img');
      if (!iconImage) {
        iconElement?.remove();
        if (articleIcon && isImageIcon(articleIcon) && parsedDocument) {
          const image = parsedDocument.createElement('img');
          image.setAttribute('src', articleIcon);
          parsedDocument.body.prepend(image);
        }
      }
      parsedDocument
        ?.querySelectorAll('img[src^="/icons/"]')
        .forEach((image) => {
          image.setAttribute(
            'src',
            `https://www.notion.so${image.getAttribute('src')}`,
          );
        });
    }
    const bodyHtml = parsedDocument?.body.innerHTML ?? content ?? '';
    if (format === 'html')
      reviewCountsByPath.set(
        path,
        collectHtmlImportWarnings(bodyHtml).length +
          (content === null ? 1 : 0) +
          (coverSource !== undefined && resolvedCoverSource === undefined
            ? 1
            : 0),
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
      coverSource: resolvedCoverSource,
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
  // Paths that failed to create or to save content, with the error to show.
  failedPagesByPath?: Map<string, string>;
  // Paths whose cover was already applied, so retry passes stay idempotent.
  coveredPaths?: Set<string>;
  // Paths whose cover could not be uploaded; retried on the next run.
  pendingCoverPaths?: Set<string>;
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
    pageLinkResolvers?: {
      resolvePageLink: (target: string) => string | null;
      flattenUnresolvedPageLinks: boolean;
    },
  ) => { blocks: Record<string, unknown>[]; warnings: unknown[] };
  uploadAttachment: (
    entry: DocumentsTransferEntry,
    documentId: string,
  ) => Promise<string>;
  applyPageCover?: (
    page: BureauArchivePage,
    documentId: string,
    url: string,
  ) => Promise<void>;
  savePage: (
    documentId: string,
    blocks: Record<string, unknown>[],
  ) => Promise<void>;
  getPageUrl: (documentId: string) => string;
  onProgress: (completedCount: number, totalCount: number) => void;
  assertCanContinue?: () => void;
  destinationParentId?: string | null;
  onOperation?: (
    path: string,
    stage: 'create' | 'content' | 'cover' | 'file',
  ) => void;
};

export const runBureauArchiveImport = async (
  options: RunBureauArchiveImportOptions,
): Promise<{ warningCount: number; failedPageCount: number }> => {
  const { plan, session } = options;
  // Failure reporting is rebuilt per run; entries that refer to work already
  // completed in earlier runs are stale and cleared unless this run repeats it.
  const completedAtRunStart = new Set(session.completedPaths);
  const failedThisRun = new Set<string>();
  const previousFailedPages = new Map(session.failedPagesByPath ?? []);
  const failedPagesByPath = new Map<string, string>();
  session.failedPagesByPath = failedPagesByPath;
  session.mappedBlocksByPath ??= new Map();
  session.warningCountsByPath ??= new Map();
  session.coveredPaths ??= new Set();
  session.pendingCoverPaths ??= new Set();
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
    if (session.attachmentUrls.has(attachmentKey))
      return session.attachmentUrls.get(attachmentKey) ?? null;
    if (failedUploads.has(attachmentKey)) return null;
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
  const failPage = (page: BureauArchivePage, message: string) => {
    const previousMessage = failedPagesByPath.get(page.path);
    failedPagesByPath.set(
      page.path,
      previousMessage && previousMessage !== message
        ? `${previousMessage}\n${message}`
        : message,
    );
    failedThisRun.add(page.path);
  };
  const documentIdsByNotionId = new Map<string, string>();
  const pathsByDocumentId = new Map(
    [...session.documentIdsByPath].map(([path, id]) => [id, path]),
  );
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
    let notionSourceId: string | null = null;
    if (/^notion:/i.test(url)) {
      // `notion:` placeholders carry the source page id from the export.
      const schemeIndex = url.indexOf(':');
      try {
        const source = new URL(
          `https://notion.invalid/${url.slice(schemeIndex + 1)}`,
        );
        notionSourceId =
          /([a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i.exec(
            source.pathname,
          )?.[1] ?? null;
      } catch {
        notionSourceId = null;
      }
    }
    if (notionSourceId)
      return documentIdsByNotionId.get(
        notionSourceId.replaceAll('-', '').toLowerCase(),
      );
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
    if (!id) {
      failPage(page, 'Missing import identity');
      continue;
    }
    const parentId = page.parentPath
      ? session.documentIdsByPath.get(page.parentPath)
      : (options.destinationParentId ?? null);
    if (page.parentPath && !parentId) {
      failPage(page, 'Missing import parent');
      continue;
    }
    if (page.parentPath && !session.createdPaths.has(page.parentPath)) {
      // Descendants of a page whose creation failed cannot be attached yet;
      // they join on the next retry, after their parent exists.
      failPage(page, 'Parent page was not created; retry imports it');
      continue;
    }
    options.onOperation?.(page.path, 'create');
    try {
      await options.createPage(page, id, parentId ?? null);
    } catch (error) {
      options.assertCanContinue?.();
      failPage(
        page,
        error instanceof Error ? error.message : 'Page creation failed',
      );
      continue;
    }
    options.assertCanContinue?.();
    session.createdPaths.add(page.path);
  }

  for (const page of plan.pages) {
    options.assertCanContinue?.();
    if (session.completedPaths.has(page.path)) continue;
    // Pages whose creation failed (their record does not exist yet) cannot
    // receive content; a retry creates them first.
    if (!session.createdPaths.has(page.path)) continue;
    const documentId = session.documentIdsByPath.get(page.path);
    if (!documentId) failPage(page, 'Missing import identity');
    if (!documentId) continue;
    options.onOperation?.(page.path, 'content');
    try {
      const blocks = await options.parsePage(page);
      options.assertCanContinue?.();
      const pendingLinkedPaths = new Set<string>();
      const resolveCreatedLinkedDocumentId = (target: string) => {
        const linkedId = resolveLinkedDocumentId(page.path, target);
        if (!linkedId) return null;
        const linkedPath = pathsByDocumentId.get(linkedId);
        if (!linkedPath || !session.createdPaths.has(linkedPath)) {
          if (linkedPath) pendingLinkedPaths.add(linkedPath);
          return null;
        }
        return linkedId;
      };

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

      const mapped = options.mapBlocks(
        blocks,
        (url) => {
          const linkedId = resolveCreatedLinkedDocumentId(url);
          const fragment = url.includes('#') ? url.slice(url.indexOf('#')) : '';
          if (linkedId) return `${options.getPageUrl(linkedId)}${fragment}`;
          const path = resolveBureauArchivePath(page.path, url);
          if (path === null)
            return /^(?:https?:|mailto:|tel:)/i.test(url) ? url : null;
          return session.attachmentUrls.get(`${documentId}:${path}`) ?? null;
        },
        {
          resolvePageLink: (target) => {
            const linkedId = resolveCreatedLinkedDocumentId(target);
            return isDefined(linkedId) ? linkedId : null;
          },
          flattenUnresolvedPageLinks: true,
        },
      );

      session.warningCountsByPath.set(
        page.path,
        mapped.warnings.length + (plan.reviewCountsByPath?.get(page.path) ?? 0),
      );
      session.mappedBlocksByPath.set(page.path, mapped.blocks);
      options.assertCanContinue?.();
      options.onOperation?.(page.path, 'content');
      await options.savePage(documentId, mapped.blocks);
      options.assertCanContinue?.();
      const pendingUploads = [...references].flatMap((url) => {
        const path = resolveBureauArchivePath(page.path, url);
        const failure =
          path !== null
            ? failedUploads.get(`${documentId}:${path}`)
            : undefined;
        return failure ? [failure] : [];
      });
      if (pendingLinkedPaths.size === 0 && pendingUploads.length === 0) {
        session.completedPaths.add(page.path);
        failedPagesByPath.delete(page.path);
      }
      if (pendingUploads.length > 0)
        failPage(
          page,
          `${pendingUploads.length} file upload(s) need retry:\n${pendingUploads.map(({ path, message }) => `${path}: ${message}`).join('\n')}`,
        );
      if (pendingLinkedPaths.size > 0)
        failPage(
          page,
          `Linked pages need retry: ${[...pendingLinkedPaths].join(', ')}`,
        );
      options.onProgress(session.completedPaths.size, plan.pages.length);
    } catch (error) {
      // One broken page must not stop the others; the failed page stays joinable by retry.
      options.assertCanContinue?.();
      session.warningCountsByPath.set(
        page.path,
        (session.warningCountsByPath.get(page.path) ?? 0) + 1,
      );
      failPage(
        page,
        error instanceof Error ? error.message : 'Content import failed',
      );
      options.onProgress(session.completedPaths.size, plan.pages.length);
    }
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
      if (
        !session.createdPaths.has(ownerPagePath) ||
        !session.mappedBlocksByPath.has(ownerPagePath)
      )
        continue;
      const attachmentKey = `${ownerDocumentId}:${path}`;
      const url =
        session.attachmentUrls.get(attachmentKey) ??
        (await upload(entry, ownerDocumentId, attachmentKey));
      if (!url) {
        const ownerPage = plan.pages.find(
          (page) => page.path === ownerPagePath,
        );
        const failure = failedUploads.get(attachmentKey);
        if (ownerPage)
          failPage(
            ownerPage,
            `${entry.path}: ${failure?.message ?? 'Upload failed'}`,
          );
        continue;
      }
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
      if (!documentId || !session.createdPaths.has(pagePath)) continue;
      options.onOperation?.(pagePath, 'content');
      try {
        await options.savePage(documentId, [
          ...(session.mappedBlocksByPath.get(pagePath) ?? []),
          ...extraBlocks,
        ]);
      } catch (error) {
        options.assertCanContinue?.();
        const ownerPage = plan.pages.find((page) => page.path === pagePath);
        if (ownerPage)
          failPage(
            ownerPage,
            error instanceof Error ? error.message : 'Save failed',
          );
      }
      options.assertCanContinue?.();
    }
  }

  await applyImportedCovers(options, { upload, getDocumentId, failPage });

  // Pages from earlier runs that completed now clear their stale failures.
  for (const path of completedAtRunStart) {
    if (!failedThisRun.has(path)) previousFailedPages.delete(path);
  }
  // Pages whose attachment uploads failed cannot be reconstructed from content
  // alone; they are retried on the next run instead of pausing the import.
  for (const page of plan.pages) {
    if (session.completedPaths.has(page.path)) continue;
    if (!failedPagesByPath.has(page.path)) {
      const carried = previousFailedPages.get(page.path);
      failPage(
        page,
        carried ??
          (failedUploads.size > 0
            ? `${failedUploads.size} file upload(s) need retry`
            : 'Content needs retry'),
      );
    }
  }

  return {
    warningCount:
      plan.unsupportedPaths.length +
      [...session.warningCountsByPath.values()].reduce(
        (sum, count) => sum + count,
        0,
      ),
    failedPageCount: failedPagesByPath.size,
  };
};

const applyImportedCovers = async (
  options: RunBureauArchiveImportOptions,
  helpers: {
    upload: (
      entry: DocumentsTransferEntry,
      documentId: string,
      attachmentKey: string,
    ) => Promise<string | null>;
    getDocumentId: (path: string) => string | undefined;
    failPage: (page: BureauArchivePage, message: string) => void;
  },
) => {
  const { plan, session } = options;
  if (!options.applyPageCover) return;
  for (const page of plan.pages) {
    const documentId = helpers.getDocumentId(page.path);
    if (
      !documentId ||
      !isDefined(page.coverSource) ||
      !session.createdPaths.has(page.path) ||
      !session.mappedBlocksByPath?.has(page.path) ||
      session.coveredPaths?.has(page.path)
    )
      continue;
    options.onOperation?.(page.path, 'cover');
    try {
      options.assertCanContinue?.();
      let coverUrl: string | null = page.coverSource;
      if (!/^(?:https?:\/\/|\/)/i.test(coverUrl)) {
        const entry = plan.entriesByPath.get(coverUrl);
        if (!entry) throw new Error(`Missing cover: ${coverUrl}`);
        coverUrl = await helpers.upload(
          entry,
          documentId,
          `${documentId}:${coverUrl}`,
        );
      }
      if (!coverUrl)
        throw new Error(`Cover upload failed: ${page.coverSource}`);
      options.assertCanContinue?.();
      await options.applyPageCover(page, documentId, coverUrl);
      options.assertCanContinue?.();
      session.coveredPaths?.add(page.path);
      session.pendingCoverPaths?.delete(page.path);
    } catch (error) {
      options.assertCanContinue?.();
      session.pendingCoverPaths?.add(page.path);
      helpers.failPage(
        page,
        error instanceof Error ? error.message : 'Cover import failed',
      );
    }
  }
};
