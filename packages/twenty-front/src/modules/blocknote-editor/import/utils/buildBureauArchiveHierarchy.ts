import { type BureauArchivePage } from '@/blocknote-editor/import/utils/bureauArchiveImport';
import {
  getEntryBaseName,
  getEntryDirectory,
  stripNotionEntryHash,
} from '@/blocknote-editor/import/utils/documentsTransferEntries';

const withoutExtension = (path: string) =>
  path.replace(/\.(html?|md|markdown|csv)$/i, '');

export const buildBureauArchiveHierarchy = (
  pages: BureauArchivePage[],
  rootPrefix: string,
): BureauArchivePage[] => {
  const pagesByFolder = new Map<string, Set<BureauArchivePage>>();
  const addFolder = (folder: string, page: BureauArchivePage) => {
    const candidates = pagesByFolder.get(folder) ?? new Set();
    candidates.add(page);
    pagesByFolder.set(folder, candidates);
  };
  for (const page of pages) {
    for (const path of page.sourcePaths ?? [page.path]) {
      const stem = withoutExtension(path);
      addFolder(stem, page);
      addFolder(
        `${getEntryDirectory(path)}/${stripNotionEntryHash(getEntryBaseName(stem))}`.replace(
          /^\//,
          '',
        ),
        page,
      );
    }
  }
  const rootFolder = rootPrefix.replace(/\/$/, '');
  const folders = new Set<string>();
  for (const page of pages) {
    let directory = getEntryDirectory(page.path);
    while (directory !== '' && directory !== rootFolder) {
      folders.add(directory);
      directory = getEntryDirectory(directory);
    }
  }
  // Bureau has a page tree rather than filesystem folders. Keep source grouping
  // as container pages when the export has no document for that directory.
  for (const folder of folders) {
    if (pagesByFolder.get(folder)?.size === 1) continue;
    let path = `${folder}/.bureau-import-folder.md`;
    while (pages.some((page) => page.path === path)) path = `${path}.md`;
    const page: BureauArchivePage = {
      path,
      title: getEntryBaseName(folder),
      parentPath: null,
      format: 'markdown',
      content: '',
      sourcePaths: [],
    };
    pages.push(page);
    pagesByFolder.set(folder, new Set([page]));
  }
  for (const page of pages) {
    const directory = getEntryDirectory(page.path);
    // A generated container represents its directory, so its parent is above it.
    const parentFolder =
      page.sourcePaths?.length === 0 ? getEntryDirectory(directory) : directory;
    const candidates = pagesByFolder.get(parentFolder);
    const parent = candidates?.size === 1 ? [...candidates][0] : undefined;
    page.parentPath = parent && parent !== page ? parent.path : null;
  }
  const childrenByParent = new Map<string | null, BureauArchivePage[]>();
  for (const page of pages) {
    const children = childrenByParent.get(page.parentPath) ?? [];
    children.push(page);
    childrenByParent.set(page.parentPath, children);
  }
  const result: BureauArchivePage[] = [];
  const pending = [...(childrenByParent.get(null) ?? [])].reverse();
  while (pending.length > 0) {
    const page = pending.pop();
    if (!page) break;
    result.push(page);
    pending.push(...[...(childrenByParent.get(page.path) ?? [])].reverse());
  }
  if (result.length !== pages.length)
    throw new Error('Invalid archive hierarchy');
  return result;
};
