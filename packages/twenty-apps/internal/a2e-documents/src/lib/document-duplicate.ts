import { DOCUMENT_KIND } from '../constants/field-vocabulary.ts';
import { generateFractionalIndexBetween } from './fractional-position.ts';
import {
  buildTemplateCopyPayload,
  buildTemplateCopyTitle,
  DEFAULT_TEMPLATE_COPY_POSITION,
  type TemplateRichTextBody,
} from './instantiate-template.ts';

// Subtree duplication request building only: the browser owns persistence, so
// the plan stays free of transport concerns and unit-testable. Content copies
// go through buildTemplateCopyPayload — the same helper the template apply path
// uses — so a duplicate never aliases block anchors, and each child page is
// re-created under a fresh parent id at create time (parentIndex, server-minted
// ids cannot be referenced before the parent exists).

export type DuplicateSourceNode = {
  id: string;
  title: string;
  content?: TemplateRichTextBody | null;
};

export type DocumentDuplicatePlanNode = {
  title: string;
  kind: string;
  position: string;
  content: {
    blocknote: string | null;
    markdown: string | null;
  };
  // Index of this node's parent in the plan array, null for the duplicated
  // root. The caller creates nodes in order, so a parent is always persisted
  // before its children.
  parentIndex: number | null;
};

export type DocumentDuplicatePlan = {
  nodes: DocumentDuplicatePlanNode[];
};

export const buildDocumentDuplicateTitle = (title: string): string =>
  `${buildTemplateCopyTitle(title)} (copie)`;

export const buildDocumentSubtreeDuplicatePlan = (options: {
  root: DuplicateSourceNode;
  childrenByParentId: Map<string | null, DuplicateSourceNode[]>;
  position?: string;
  createBlockId?: () => string;
}): DocumentDuplicatePlan => {
  const nodes: DocumentDuplicatePlanNode[] = [];

  const appendNode = (
    source: DuplicateSourceNode,
    parentIndex: number | null,
    title: string,
    position: string,
  ): void => {
    const copyPayload = buildTemplateCopyPayload(source, {
      position,
      createBlockId: options.createBlockId,
    });
    const nodeIndex = nodes.length;

    nodes.push({
      title,
      kind: DOCUMENT_KIND.DOCUMENT,
      position: copyPayload.position,
      content: copyPayload.content,
      parentIndex,
    });

    const children = options.childrenByParentId.get(source.id) ?? [];
    let previousPosition: string | undefined;

    for (const child of children) {
      const childPosition = generateFractionalIndexBetween({
        previous: previousPosition,
      });

      previousPosition = childPosition;
      appendNode(
        child,
        nodeIndex,
        buildTemplateCopyTitle(child.title),
        childPosition,
      );
    }
  };

  appendNode(
    options.root,
    null,
    buildDocumentDuplicateTitle(options.root.title),
    options.position ?? DEFAULT_TEMPLATE_COPY_POSITION,
  );

  return { nodes };
};
