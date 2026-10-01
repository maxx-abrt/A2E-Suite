import {
  type DocumentsTransferEntry,
  getEntryBaseName,
  joinEntryPath,
} from '@/blocknote-editor/import/utils/documentsTransferEntries';
import { slugifyExportFileName } from '@/blocknote-editor/export/utils/exportBlocksToMarkdown';

// Page-subtree zip export (M8g). Turns a document subtree into a flat list of
// archive entries — one `.md` per page, its images under the page's asset
// folder, child pages nested inside that same folder. The shape mirrors a
// Notion markdown export on purpose so `readNotionExportZip` can read it back
// (the export round-trip).

export type DocumentExportImage = {
  fileName: string;
  bytes: Uint8Array;
};

export type DocumentExportNode = {
  id: string;
  title: string;
  markdown: string;
  images: DocumentExportImage[];
  children: DocumentExportNode[];
};

const uniqueSlug = (title: string, usedSlugs: Set<string>): string => {
  const baseSlug = slugifyExportFileName(title);

  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;

  while (usedSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  usedSlugs.add(candidate);

  return candidate;
};

const rewriteImageReferences = (
  markdown: string,
  assetFolderName: string,
  images: readonly DocumentExportImage[],
): string => {
  const imageFileNames = new Set(images.map((image) => image.fileName));

  return markdown.replace(
    /(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g,
    (fullMatch, prefix, target, suffix) => {
      const decodedTarget = (() => {
        try {
          return decodeURIComponent(target);
        } catch {
          return target;
        }
      })();

      if (!imageFileNames.has(getEntryBaseName(decodedTarget))) {
        return fullMatch;
      }

      return `${prefix}${assetFolderName}/${getEntryBaseName(decodedTarget)}${suffix}`;
    },
  );
};

const buildNodeEntries = (
  node: DocumentExportNode,
  directory: string,
  usedSlugs: Set<string>,
  entries: DocumentsTransferEntry[],
): void => {
  const slug = uniqueSlug(node.title, usedSlugs);
  const assetFolderName = slug;
  const assetFolder = joinEntryPath(directory, assetFolderName);
  const markdown = rewriteImageReferences(
    node.markdown,
    assetFolderName,
    node.images,
  );

  entries.push({
    path: joinEntryPath(directory, `${slug}.md`),
    bytes: new TextEncoder().encode(markdown),
  });

  for (const image of node.images) {
    entries.push({
      path: joinEntryPath(assetFolder, image.fileName),
      bytes: image.bytes,
    });
  }

  const childSlugs = new Set<string>();

  for (const child of node.children) {
    buildNodeEntries(child, assetFolder, childSlugs, entries);
  }
};

export const buildDocumentSubtreeExportEntries = (
  node: DocumentExportNode,
): DocumentsTransferEntry[] => {
  const entries: DocumentsTransferEntry[] = [];

  buildNodeEntries(node, '', new Set<string>(), entries);

  return entries;
};
