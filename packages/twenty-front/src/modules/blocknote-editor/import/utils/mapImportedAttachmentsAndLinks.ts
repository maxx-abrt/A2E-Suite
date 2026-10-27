import { isNonEmptyString } from '@sniptt/guards';
import { isDefined, isPlainObject, isSafeUrl } from 'twenty-shared/utils';

import { type HtmlImportWarning } from '@/blocknote-editor/import/utils/htmlImportWarnings';
import { decodeEntryTarget } from '@/blocknote-editor/import/utils/documentsTransferEntries';

export type ImportedBlock = Record<string, unknown>;

export type ImportedUrlResolvers = {
  preserveUnmappedAttachments?: boolean;
  // Returns the workspace URL a remote attachment resolves to, or null when it
  // cannot be imported (the block is then dropped, fail-closed).
  resolveAttachmentUrl?: (url: string) => string | null;
  // Returns the workspace URL a link resolves to, or null when it cannot be
  // imported (the link mark is flattened, its text kept).
  resolveLinkUrl?: (url: string) => string | null;
  // Resolves a page-link placeholder to a created record id; absent means the
  // caller needs placeholders preserved (e.g. the reference-discovery pass).
  resolvePageLink?: (target: string) => string | null;
  // Degrades placeholders that stayed unresolved (preview comes here before
  // record ids exist) to their title text instead of a creation input row.
  flattenUnresolvedPageLinks?: boolean;
  // The preview serves local media through object URLs, which the saved
  // content must never carry; only callers that display offline previews may
  // accept them.
  allowTemporaryObjectUrls?: boolean;
  // Only the parser's intermediate pass may retain archive paths, before the
  // runner replaces them with workspace URLs.
  allowArchiveRelativeUrls?: boolean;
};

export type MappedImportedBlocks = {
  blocks: ImportedBlock[];
  warnings: HtmlImportWarning[];
};

const ATTACHMENT_BLOCK_TYPES = new Set(['image', 'file', 'video', 'audio']);

// Page-link and mention placeholders carry either a `notion:` source id or an
// archive-relative file path; workspace record ids match neither pattern.
export const isImportedPagePlaceholder = (value: string): boolean => {
  if (/^notion:/i.test(value)) return true;
  if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(value)) return true;
  return /\.(?:html?|md|markdown|csv)$/i.test(
    decodeEntryTarget(value.split(/[?#]/)[0]),
  );
};

export const isUsableImportUrl = isSafeUrl;

const isUsableResolvedUrl = (
  url: string,
  allowObjectUrls: boolean,
  allowArchiveRelativeUrls: boolean,
): boolean => {
  if (/^blob:/i.test(url)) return allowObjectUrls;
  if (
    allowArchiveRelativeUrls &&
    url.length > 0 &&
    !/^(?:[a-z][a-z\d+.-]*:|[\s/#])/i.test(url)
  )
    return true;
  return isUsableImportUrl(url);
};
export const mapImportedAttachmentsAndLinks = (
  blocks: readonly unknown[],
  resolvers: ImportedUrlResolvers = {},
): MappedImportedBlocks => {
  const warnings: HtmlImportWarning[] = [];
  const resolveAttachmentUrl =
    resolvers.resolveAttachmentUrl ?? ((url: string) => url);
  const resolveLinkUrl = resolvers.resolveLinkUrl ?? ((url: string) => url);
  const allowObjectUrls = resolvers.allowTemporaryObjectUrls === true;
  const allowArchiveRelativeUrls = resolvers.allowArchiveRelativeUrls === true;

  const mapInlineContent = (content: unknown): unknown => {
    if (
      isPlainObject(content) &&
      content.type === 'tableContent' &&
      Array.isArray(content.rows)
    ) {
      return {
        ...content,
        rows: content.rows.map((row: unknown) => {
          if (!isPlainObject(row) || !Array.isArray(row.cells)) return row;
          return {
            ...row,
            cells: row.cells.map((cell: unknown) =>
              isPlainObject(cell)
                ? { ...cell, content: mapInlineContent(cell.content) }
                : mapInlineContent(cell),
            ),
          };
        }),
      };
    }
    if (!Array.isArray(content)) {
      return content;
    }

    return content.flatMap((inlineContent) => {
      if (
        isPlainObject(inlineContent) &&
        inlineContent.type === 'mention' &&
        typeof inlineContent.props === 'object' &&
        inlineContent.props !== null &&
        typeof (inlineContent.props as Record<string, unknown>).recordId ===
          'string'
      ) {
        return resolveMentionInlineContent(
          inlineContent as {
            type: 'mention';
            props: Record<string, unknown>;
          },
        );
      }
      if (
        !isPlainObject(inlineContent) ||
        inlineContent.type !== 'link' ||
        typeof inlineContent.href !== 'string'
      ) {
        return [inlineContent];
      }

      const resolvedHref = resolveLinkUrl(inlineContent.href);

      if (
        !isNonEmptyString(resolvedHref) ||
        !isUsableResolvedUrl(
          resolvedHref,
          allowObjectUrls,
          allowArchiveRelativeUrls,
        )
      ) {
        warnings.push({ kind: 'link-unmapped', element: 'a' });

        return Array.isArray(inlineContent.content)
          ? inlineContent.content
          : [];
      }

      return [{ ...inlineContent, href: resolvedHref }];
    });
  };

  const resolveMentionInlineContent = (mention: {
    type: 'mention';
    props: Record<string, unknown>;
  }) => {
    // Relation chips carry the same placeholder contract as page-link blocks:
    // the runner resolves them once record ids exist, and the preview degrades
    // unresolved ones to their label instead of a dead chip. Record ids that
    // are already workspace ids are never placeholders.
    const recordId = mention.props.recordId;
    const isPlaceholder =
      isNonEmptyString(recordId) && isImportedPagePlaceholder(recordId);
    if (isPlaceholder) {
      const resolvedId = resolvers.resolvePageLink?.(recordId);
      if (isNonEmptyString(resolvedId)) {
        return [
          {
            ...mention,
            props: { ...mention.props, recordId: resolvedId },
          },
        ];
      }
      if (resolvers.flattenUnresolvedPageLinks) return flattenMention(mention);
      return [mention];
    }
    if (isNonEmptyString(typeof recordId === 'string' ? recordId : undefined)) {
      return [mention];
    }
    if (!resolvers.flattenUnresolvedPageLinks) {
      return [mention];
    }
    return flattenMention(mention);
  };

  const flattenMention = (mention: {
    type: 'mention';
    props: Record<string, unknown>;
  }) => {
    warnings.push({ kind: 'mention-unmapped', element: 'mention' });
    const label = mention.props.label;
    if (!isNonEmptyString(typeof label === 'string' ? label : undefined)) {
      return [];
    }
    return [{ type: 'text', text: label }];
  };

  const mapBlock = (block: unknown): ImportedBlock | undefined => {
    if (!isPlainObject(block)) {
      return undefined;
    }

    let mappedBlock: ImportedBlock = { ...block };
    const blockType = typeof block.type === 'string' ? block.type : '';

    if (blockType === 'pageLink') {
      // Placeholders only carry their target until a resolver maps them to a
      // created record id. Without a resolver the block stays untouched so a
      // later pass can resolve it; with `flattenUnresolvedPageLinks` a chip
      // without a record degrades to its title text instead of rendering a
      // creation input row in a read-only document.
      const pageLinkProps = isPlainObject(block.props)
        ? (block.props as Record<string, unknown>)
        : {};
      const pageLinkDocumentId = pageLinkProps.documentId;
      const isResolvedWorkspaceId =
        isNonEmptyString(
          typeof pageLinkDocumentId === 'string'
            ? pageLinkDocumentId
            : undefined,
        ) && !isImportedPagePlaceholder(pageLinkDocumentId as string);
      if (!isResolvedWorkspaceId) {
        const resolvePageLink = resolvers.resolvePageLink;
        if (
          resolvePageLink &&
          isNonEmptyString(
            typeof pageLinkDocumentId === 'string'
              ? pageLinkDocumentId
              : undefined,
          )
        ) {
          const resolvedId = resolvePageLink(pageLinkDocumentId as string);
          if (isNonEmptyString(resolvedId)) {
            mappedBlock = {
              ...mappedBlock,
              props: { ...pageLinkProps, documentId: resolvedId },
            };
            return mappedBlock;
          }
        }
        if (resolvers.flattenUnresolvedPageLinks) {
          warnings.push({ kind: 'page-link-unmapped', element: 'pageLink' });
          const title = pageLinkProps.title;
          if (isNonEmptyString(typeof title === 'string' ? title : undefined)) {
            return {
              ...(isNonEmptyString(mappedBlock.id)
                ? { id: mappedBlock.id }
                : {}),
              type: 'paragraph',
              content: [{ type: 'text', text: title as string }],
              children: [],
            };
          }
          return undefined;
        }
      }
    }

    if (ATTACHMENT_BLOCK_TYPES.has(blockType)) {
      const props = isPlainObject(block.props) ? block.props : {};
      const url = typeof props.url === 'string' ? props.url : '';
      const resolvedUrl = resolveAttachmentUrl(url);

      if (
        isNonEmptyString(url) &&
        (!isNonEmptyString(resolvedUrl) ||
          !isUsableResolvedUrl(
            resolvedUrl,
            allowObjectUrls,
            allowArchiveRelativeUrls,
          ))
      ) {
        warnings.push({ kind: 'attachment-unmapped', element: blockType });
        if (!resolvers.preserveUnmappedAttachments) return undefined;

        const label = [props.name, props.caption, url]
          .filter(isNonEmptyString)
          .join(' — ');
        return {
          ...(typeof block.id === 'string' ? { id: block.id } : {}),
          type: 'paragraph',
          content: [{ type: 'text', text: label }],
          children: Array.isArray(block.children)
            ? block.children.map(mapBlock).filter(isDefined)
            : [],
        };
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
