import { BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import {
  parseHtmlWithBlockNote,
  parseMarkdownWithBlockNote,
} from '@/blocknote-editor/import/adapters/parseHtmlWithBlockNote';
import {
  type BureauArchiveImportPlan,
  type BureauArchivePage,
  resolveBureauArchivePath,
} from '@/blocknote-editor/import/utils/bureauArchiveImport';
import { mapImportedAttachmentsAndLinks } from '@/blocknote-editor/import/utils/mapImportedAttachmentsAndLinks';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import {
  themeCssVariables,
  useThemeColorScheme,
} from 'twenty-ui/theme-constants';
import '@blocknote/mantine/style.css';
import '@blocknote/react/style.css';

const StyledPreview = styled.div`
  min-width: 0;
  padding: ${themeCssVariables.spacing[4]};
  .bn-editor {
    background: transparent;
    color: ${themeCssVariables.font.color.primary};
    padding-inline: 0;
  }
`;

type BureauImportPagePreviewProps = {
  page: BureauArchivePage;
  plan: BureauArchiveImportPlan;
};

const ConvertedPage = ({ blocks }: { blocks: Record<string, unknown>[] }) => {
  const colorScheme = useThemeColorScheme();
  const editor = useCreateBlockNote({
    schema: BLOCK_SCHEMA,
    initialContent:
      blocks.length > 0
        ? (blocks as (typeof BLOCK_SCHEMA.PartialBlock)[])
        : [{ type: 'paragraph' }],
  });
  return (
    <BlockNoteView
      editor={editor}
      theme={colorScheme}
      editable={false}
      slashMenu={false}
      sideMenu={false}
      formattingToolbar={false}
    />
  );
};

export const BureauImportPagePreview = ({
  page,
  plan,
}: BureauImportPagePreviewProps) => {
  const { t } = useLingui();
  const [preview, setPreview] = useState<{
    blocks: Record<string, unknown>[];
    warningCount: number;
  } | null>(null);
  const [hasError, setHasError] = useState(false);

  // Local preview URLs must be released on page changes and modal dismissal.
  useEffect(() => {
    const urls = new Map<string, string>();
    try {
      const blocks =
        page.format === 'html'
          ? parseHtmlWithBlockNote(page.content)
          : parseMarkdownWithBlockNote(page.content);
      const mapped = mapImportedAttachmentsAndLinks(blocks, {
        preserveUnmappedAttachments: true,
        resolveAttachmentUrl: (target) => {
          const path = resolveBureauArchivePath(page.path, target);
          if (path === null)
            return /^(?:https?:|\/\/)/i.test(target) ? target : null;
          const entry = plan.entriesByPath.get(path);
          if (!entry) return null;
          if (!urls.has(path))
            urls.set(
              path,
              URL.createObjectURL(new Blob([new Uint8Array(entry.bytes)])),
            );
          return urls.get(path) ?? null;
        },
        resolveLinkUrl: (target) => {
          const path = resolveBureauArchivePath(page.path, target);
          return path !== null ? '#' : target;
        },
      });
      setPreview({
        blocks: mapped.blocks,
        warningCount:
          mapped.warnings.length +
          (plan.reviewCountsByPath?.get(page.path) ?? 0),
      });
    } catch {
      setHasError(true);
    }
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [page, plan]);

  return (
    <StyledPreview
      onClickCapture={(event) => {
        if (event.target instanceof Element && event.target.closest('a'))
          event.preventDefault();
      }}
    >
      <h2>{page.title}</h2>
      <p>{t`Preview of the converted page. Use the page tree to browse; links become active after import.`}</p>
      {hasError ? (
        <p role="alert">{t`This page could not be previewed. Check the source file before importing.`}</p>
      ) : preview ? (
        <>
          {preview.warningCount > 0 && (
            <p role="status">{t`${preview.warningCount} items on this page need review.`}</p>
          )}
          <ConvertedPage blocks={preview.blocks} />
        </>
      ) : (
        <p role="status">{t`Preparing preview…`}</p>
      )}
    </StyledPreview>
  );
};
