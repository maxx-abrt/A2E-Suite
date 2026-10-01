import {
  markdownToImportedBlocks,
  type MarkdownImportedBlock,
} from '@/blocknote-editor/import/utils/markdownToImportedBlocks';
import { stripNotionEntryHash } from '@/blocknote-editor/import/utils/documentsTransferEntries';
import {
  type NotionExportTree,
  type NotionPage,
} from '@/blocknote-editor/import/utils/notionExportZip';

// Import planning for a read Notion tree: flatten the pages into the ordered
// create list the caller will persist, and fail closed with a typed error when
// the chosen destination rejects creation. No mutation happens here — the
// caller owns transport and record creation.

export type BureauImportDenialReason =
  | 'create-not-permitted'
  | 'unsupported-tree';

export type BureauImportPermissionError = {
  name: 'BureauImportPermissionError';
  reason: BureauImportDenialReason;
  message: string;
};

export type BureauImportPlanNode = {
  title: string;
  markdown: string;
  blocks: MarkdownImportedBlock[];
  imageFileNames: string[];
  // `null` means "create under the chosen import parent"; a number points at an
  // earlier plan node (the page's new parent) in the same flattened list.
  parentIndex: number | null;
};

export type BureauImportPlanResult =
  | {
      status: 'planned';
      parentId: string | null;
      nodes: BureauImportPlanNode[];
    }
  | { status: 'denied'; error: BureauImportPermissionError };

export const createBureauImportPermissionError = (
  reason: BureauImportDenialReason,
  message: string,
): BureauImportPermissionError => ({
  name: 'BureauImportPermissionError',
  reason,
  message,
});

export const planBureauImport = (args: {
  tree: NotionExportTree;
  parentId: string | null;
  canCreateInParent: (parentId: string | null) => boolean;
}): BureauImportPlanResult => {
  if (!args.canCreateInParent(args.parentId)) {
    return {
      status: 'denied',
      error: createBureauImportPermissionError(
        'create-not-permitted',
        'You are not allowed to create documents in this parent.',
      ),
    };
  }

  const nodes: BureauImportPlanNode[] = [];

  const visit = (page: NotionPage, parentIndex: number | null): void => {
    const nodeIndex = nodes.length;

    nodes.push({
      title: page.title,
      markdown: page.markdown,
      blocks: markdownToImportedBlocks(page.markdown),
      imageFileNames: page.images.map((image) => image.fileName),
      parentIndex,
    });

    for (const child of page.children) {
      visit(child, nodeIndex);
    }
  };

  for (const page of args.tree.pages) {
    visit(page, null);
  }

  return { status: 'planned', parentId: args.parentId, nodes };
};

// Plain `.md` import is the single-page special case of the same plan: one
// root node whose title falls back to the file name (Notion's hash suffix
// stripped) when the markdown has no top-level heading. It funnels through
// `planBureauImport` so permission handling stays in one place.
export const planBureauMarkdownFileImport = (args: {
  fileName: string;
  markdown: string;
  parentId: string | null;
  canCreateInParent: (parentId: string | null) => boolean;
}): BureauImportPlanResult => {
  const title = stripNotionEntryHash(
    args.fileName.replace(/\.(md|markdown)$/i, ''),
  );

  return planBureauImport({
    tree: {
      pages: [
        {
          title,
          markdown: args.markdown,
          images: [],
          children: [],
        },
      ],
      warnings: [],
    },
    parentId: args.parentId,
    canCreateInParent: args.canCreateInParent,
  });
};
