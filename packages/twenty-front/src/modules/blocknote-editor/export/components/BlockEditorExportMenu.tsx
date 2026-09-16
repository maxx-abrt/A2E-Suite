import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';

import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { exportBlocksToDocxBlob } from '@/blocknote-editor/export/utils/exportBlocksToDocxBlob';
import {
  exportBlocksToMarkdown,
  slugifyExportFileName,
  triggerFileDownload,
} from '@/blocknote-editor/export/utils/exportBlocksToMarkdown';
import {
  collectExportFidelityWarnings,
  isDocumentEmptyForExport,
  type ExportFidelityWarning,
} from '@/blocknote-editor/export/utils/exportFidelity';
import { IconFileExport } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { isDefined } from 'twenty-shared/utils';

const StyledExportMenu = styled.div`
  background-color: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  bottom: 28px;
  box-shadow: ${themeCssVariables.boxShadow.superHeavy};
  display: flex;
  flex-direction: column;
  padding: ${themeCssVariables.spacing[1]};
  position: absolute;
  right: ${themeCssVariables.spacing[2]};
  z-index: 10;
`;

const StyledExportActionButton = styled.button`
  background: none;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-align: left;
  white-space: nowrap;

  &:hover {
    background-color: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledExportContainer = styled.div`
  position: relative;
`;

const StyledExportWarning = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  display: block;
  font-size: ${themeCssVariables.font.size.xs};
  padding: 0 ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[1]};
  white-space: normal;
`;

const MARKDOWN_MIME_TYPE = 'text/markdown;charset=utf-8';
const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type BlockEditorExportMenuProps = {
  editor: typeof BLOCK_SCHEMA.BlockNoteEditor | null;
  documentTitle: string;
};

export const BlockEditorExportMenu = ({
  editor,
  documentTitle,
}: BlockEditorExportMenuProps) => {
  const { t } = useLingui();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const baseFileName = slugifyExportFileName(documentTitle);

  // Computed per render on purpose: `editor.document` identity changes with the
  // document and the scans are linear in a typically small block count.
  const documentBlocks = editor?.document ?? [];

  const isEmptyDocument = isDocumentEmptyForExport(documentBlocks);

  const formatWarnings = {
    pdf: collectExportFidelityWarnings(documentBlocks, 'pdf'),
    docx: collectExportFidelityWarnings(documentBlocks, 'docx'),
    markdown: collectExportFidelityWarnings(documentBlocks, 'markdown'),
  };

  const formatWarningLabels: Record<ExportFidelityWarning, string> = {
    'callout-degrades': t`Callouts degrade to plain paragraphs`,
    'file-omitted': t`File blocks are omitted`,
    'mention-degrades': t`Mentions degrade to plain text`,
  };

  const renderWarnings = (format: keyof typeof formatWarnings) =>
    formatWarnings[format].map((warning) => (
      <StyledExportWarning key={warning}>
        {formatWarningLabels[warning]}
      </StyledExportWarning>
    ));

  const handleExportMarkdown = useCallback(async () => {
    if (!isDefined(editor)) {
      return;
    }

    triggerFileDownload(
      await exportBlocksToMarkdown(editor),
      `${baseFileName}.md`,
      MARKDOWN_MIME_TYPE,
    );
    setIsMenuOpen(false);
  }, [editor, baseFileName]);

  const handleExportDocx = useCallback(async () => {
    if (!isDefined(editor)) {
      return;
    }

    triggerFileDownload(
      await exportBlocksToDocxBlob(editor),
      `${baseFileName}.docx`,
      DOCX_MIME_TYPE,
    );
    setIsMenuOpen(false);
  }, [editor, baseFileName]);

  // PDF via the browser print pipeline on the editor DOM: no extra runtime
  // dependency, reuses the browser's print-to-PDF, and degrades to whatever
  // the user's print stylesheet provides.
  const handleExportPdf = useCallback(() => {
    if (!isDefined(editor)) {
      return;
    }

    editor.domElement?.closest('body')?.classList.add('a2e-print-editor');

    window.print();

    setIsMenuOpen(false);
  }, [editor]);

  if (!isDefined(editor)) {
    return null;
  }

  if (isEmptyDocument) {
    return null;
  }

  return (
    <StyledExportContainer>
      {isMenuOpen && (
        <StyledExportMenu>
          <StyledExportActionButton onClick={handleExportPdf}>
            {t`Export as PDF (print)`}
            {renderWarnings('pdf')}
          </StyledExportActionButton>
          <StyledExportActionButton onClick={handleExportDocx}>
            {t`Export as DOCX`}
            {renderWarnings('docx')}
          </StyledExportActionButton>
          <StyledExportActionButton onClick={handleExportMarkdown}>
            {t`Export as Markdown`}
            {renderWarnings('markdown')}
          </StyledExportActionButton>
        </StyledExportMenu>
      )}
      <StyledExportActionButton
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        title={t`Export document`}
      >
        <IconFileExport size={14} />
      </StyledExportActionButton>
    </StyledExportContainer>
  );
};
