import { type DocumentImportWarning } from '@/blocknote-editor/import/utils/documentImportWarnings';
import {
  type DocumentsTransferEntry,
  decodeEntryTarget,
  findSingleRootPrefix,
  getEntryBaseName,
  getEntryDirectory,
  hasMarkdownExtension,
  isAbsoluteEntryTarget,
  isImageEntryPath,
  joinEntryPath,
  normalizeEntryPath,
  stripEntryRootPrefix,
  stripNotionEntryHash,
} from '@/blocknote-editor/import/utils/documentsTransferEntries';
import { isNonEmptyString } from '@sniptt/guards';

// Notion "Markdown & CSV" export reader. Pure zip-structure walk — no Notion
// API call. Each `.md` in the archive is a page; a page's asset folder (same
// path without the `.md` extension) holds its images and child pages, so the
// folder shape is what reconstructs the nested page tree.

export type NotionPageImage = {
  fileName: string;
  archivePath: string;
  bytes: Uint8Array;
  alt: string;
};

export type NotionPage = {
  title: string;
  markdown: string;
  images: NotionPageImage[];
  children: NotionPage[];
};

export type NotionExportTree = {
  pages: NotionPage[];
  warnings: DocumentImportWarning[];
};

const decodeBytes = (bytes: Uint8Array): string =>
  new TextDecoder('utf-8').decode(bytes);

const IMAGE_REFERENCE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const LINK_REFERENCE_PATTERN =
  /(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

const firstHeadingTitle = (markdown: string): string | null => {
  const headingMatch = /^#{1,6}\s+(.*)$/m.exec(markdown);

  return headingMatch === null ? null : headingMatch[1].trim();
};

type WorkingPage = {
  assetFolder: string;
  directory: string;
  title: string;
  titleFromHeading: boolean;
  markdown: string;
  images: NotionPageImage[];
  children: WorkingPage[];
};

const collectMatches = (
  pattern: RegExp,
  markdown: string,
): { label: string; target: string }[] => {
  const matches: { label: string; target: string }[] = [];
  const scanner = new RegExp(pattern.source, pattern.flags);

  let match = scanner.exec(markdown);
  while (match !== null) {
    matches.push({ label: match[1], target: match[2] });
    match = scanner.exec(markdown);
  }

  return matches;
};

export const readNotionExportZip = (
  entries: readonly DocumentsTransferEntry[],
): NotionExportTree => {
  const warnings: DocumentImportWarning[] = [];
  const normalizedEntries = entries.map((entry) => ({
    ...entry,
    path: normalizeEntryPath(entry.path),
  }));
  const rootPrefix = findSingleRootPrefix(normalizedEntries);
  const entryByPath = new Map<string, DocumentsTransferEntry>();

  for (const entry of normalizedEntries) {
    entryByPath.set(stripEntryRootPrefix(entry.path, rootPrefix), entry);
  }

  const workingPages: WorkingPage[] = [];

  for (const [path, entry] of entryByPath) {
    if (!hasMarkdownExtension(path)) {
      continue;
    }

    const assetFolder = path.replace(/\.(md|markdown)$/i, '');
    const rawTitle = stripNotionEntryHash(getEntryBaseName(assetFolder));
    const markdown = decodeBytes(entry.bytes);
    const headingTitle = firstHeadingTitle(markdown);
    const page: WorkingPage = {
      assetFolder,
      directory: getEntryDirectory(path),
      title: rawTitle,
      titleFromHeading: false,
      markdown,
      images: [],
      children: [],
    };

    if (rawTitle === '' && isNonEmptyString(headingTitle)) {
      page.title = headingTitle;
      page.titleFromHeading = true;
      warnings.push({
        kind: 'page-title-from-heading',
        element: getEntryBaseName(path),
      });
    }

    workingPages.push(page);
  }

  const pageByAssetFolder = new Map<string, WorkingPage>(
    workingPages.map((page) => [page.assetFolder, page]),
  );

  const resolveReference = (
    page: WorkingPage,
    target: string,
  ): DocumentsTransferEntry | null => {
    if (isAbsoluteEntryTarget(target)) {
      return null;
    }

    const decodedTarget = decodeEntryTarget(target).replace(/^\.\//, '');
    const candidates = [
      joinEntryPath(page.assetFolder, decodedTarget),
      joinEntryPath(page.directory, decodedTarget),
      decodedTarget,
      joinEntryPath(page.assetFolder, getEntryBaseName(decodedTarget)),
    ];

    for (const candidate of candidates) {
      const resolved = entryByPath.get(candidate);

      if (resolved !== undefined) {
        return resolved;
      }
    }

    return null;
  };

  for (const page of workingPages) {
    const seenImagePaths = new Set<string>();

    for (const image of collectMatches(
      IMAGE_REFERENCE_PATTERN,
      page.markdown,
    )) {
      const resolved = resolveReference(page, image.target);

      if (resolved === null || !isImageEntryPath(resolved.path)) {
        warnings.push({ kind: 'image-unmapped', element: image.target });
        continue;
      }

      if (seenImagePaths.has(resolved.path)) {
        continue;
      }

      seenImagePaths.add(resolved.path);
      page.images.push({
        fileName: getEntryBaseName(resolved.path),
        archivePath: resolved.path,
        bytes: resolved.bytes,
        alt: image.label,
      });
    }

    for (const link of collectMatches(LINK_REFERENCE_PATTERN, page.markdown)) {
      const resolved = resolveReference(page, link.target);

      if (resolved !== null && !isImageEntryPath(resolved.path)) {
        warnings.push({ kind: 'attachment-skipped', element: resolved.path });
      }
    }
  }

  const toNotionPage = (page: WorkingPage): NotionPage => ({
    title: page.title,
    markdown: page.markdown,
    images: page.images,
    children: page.children
      .sort((left, right) => left.assetFolder.localeCompare(right.assetFolder))
      .map(toNotionPage),
  });

  const rootPages = workingPages.filter(
    (page) => !pageByAssetFolder.has(page.directory),
  );

  for (const page of workingPages) {
    const parent = pageByAssetFolder.get(page.directory);

    if (parent !== undefined) {
      parent.children.push(page);
    }
  }

  return {
    pages: rootPages
      .sort((left, right) => left.assetFolder.localeCompare(right.assetFolder))
      .map(toNotionPage),
    warnings,
  };
};
