import { isNonEmptyString } from '@sniptt/guards';
import { isDefined, isPlainObject } from 'twenty-shared/utils';

import { type HtmlImportWarning } from '@/blocknote-editor/import/utils/htmlImportWarnings';

export type ImportedBlock = Record<string, unknown>;

export type ImportedUrlResolvers = {
  // Returns the workspace URL a remote attachment resolves to, or null when it
  // cannot be imported (the block is then dropped, fail-closed).
  resolveAttachmentUrl?: (url: string) => string | null;
  // Returns the workspace URL a link resolves to, or null when it cannot be
  // imported (the link mark is flattened, its text kept).
  resolveLinkUrl?: (url: string) => string | null;
};

export type MappedImportedBlocks = {
  blocks: ImportedBlock[];
  warnings: HtmlImportWarning[];
};

const ATTACHMENT_BLOCK_TYPES = new Set(['image', 'file', 'video', 'audio']);

export const mapImportedAttachmentsAndLinks = (
  blocks: readonly unknown[],
  resolvers: ImportedUrlResolvers = {},
): MappedImportedBlocks => {
  const warnings: HtmlImportWarning[] = [];
  const resolveAttachmentUrl =
    resolvers.resolveAttachmentUrl ?? ((url: string) => url);
  const resolveLinkUrl = resolvers.resolveLinkUrl ?? ((url: string) => url);

  const mapInlineContent = (content: unknown): unknown => {
    if (!Array.isArray(content)) {
      return content;
    }

    return content.flatMap((inlineContent) => {
      if (
        !isPlainObject(inlineContent) ||
        inlineContent.type !== 'link' ||
        typeof inlineContent.href !== 'string'
      ) {
        return [inlineContent];
      }

      const resolvedHref = resolveLinkUrl(inlineContent.href);

      if (!isNonEmptyString(resolvedHref)) {
        warnings.push({ kind: 'link-unmapped', element: 'a' });

        return Array.isArray(inlineContent.content)
          ? inlineContent.content
          : [];
      }

      return [{ ...inlineContent, href: resolvedHref }];
    });
  };

  const mapBlock = (block: unknown): ImportedBlock | undefined => {
    if (!isPlainObject(block)) {
      return undefined;
    }

    let mappedBlock: ImportedBlock = { ...block };
    const blockType = typeof block.type === 'string' ? block.type : '';

    if (ATTACHMENT_BLOCK_TYPES.has(blockType)) {
      const props = isPlainObject(block.props) ? block.props : {};
      const url = typeof props.url === 'string' ? props.url : '';
      const resolvedUrl = resolveAttachmentUrl(url);

      if (isNonEmptyString(url) && !isNonEmptyString(resolvedUrl)) {
        warnings.push({ kind: 'attachment-unmapped', element: blockType });

        return undefined;
      }

      if (isNonEmptyString(resolvedUrl)) {
        mappedBlock = { ...mappedBlock, props: { ...props, url: resolvedUrl } };
      }
    }

    mappedBlock.content = mapInlineContent(block.content);

    if (Array.isArray(block.children)) {
      mappedBlock.children = block.children.map(mapBlock).filter(isDefined);
    }

    return mappedBlock;
  };

  return { blocks: blocks.map(mapBlock).filter(isDefined), warnings };
};
