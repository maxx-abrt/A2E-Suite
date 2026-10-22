import { useUploadAttachmentFile } from '@/activities/files/hooks/useUploadAttachmentFile';
import { mapImportedAttachmentsAndLinks } from '@/blocknote-editor/import/utils/mapImportedAttachmentsAndLinks';
import {
  planBureauArchiveImport,
  runBureauArchiveImport,
  type BureauArchiveImportPlan,
  type BureauArchiveImportSession,
} from '@/blocknote-editor/import/utils/bureauArchiveImport';
import { readZipEntries } from '@/blocknote-editor/import/utils/zipArchiveCodec';
import { BureauModal } from '@/bureau/components/BureauModal';
import { BUREAU_IMPORT_MODAL_ID } from '@/bureau/constants/BureauImportModalId';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { getBureauPagePath } from '@/bureau/utils/getBureauPagePath';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { Button } from 'twenty-ui/input';

const MAX_IMPORT_FILE_BYTES = 100 * 1024 * 1024;

export const BureauImportModal = () => {
  const [isImporting, setIsImporting] = useState(false);

  return (
    <BureauModal modalId={BUREAU_IMPORT_MODAL_ID} isBusy={isImporting}>
      <BureauImportContent onBusyChange={setIsImporting} />
    </BureauModal>
  );
};

type BureauImportContentProps = { onBusyChange: (isBusy: boolean) => void };

const BureauImportContent = ({ onBusyChange }: BureauImportContentProps) => {
  const { t } = useLingui();
  const { permissions, resyncDocuments } = useBureauWorkspace();
  const navigate = useNavigate();
  const { closeModal } = useModal();
  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: 'document',
    recordGqlFields: { id: true, title: true, parentId: true },
  });
  const { updateOneRecord } = useUpdateOneRecord();
  const { uploadAttachmentFile } = useUploadAttachmentFile();
  const [plan, setPlan] = useState<BureauArchiveImportPlan | null>(null);
  const [session, setSession] = useState<BureauArchiveImportSession | null>(
    null,
  );
  const [status, setStatus] = useState<
    'idle' | 'reading' | 'importing' | 'complete' | 'failed'
  >('idle');
  const [completedCount, setCompletedCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const readFile = async (file: File) => {
    setStatus('reading');
    onBusyChange(true);
    setErrorMessage('');
    setPlan(null);
    setSession(null);
    setCompletedCount(0);
    try {
      if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error('File too large');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const entries = /\.zip$/i.test(file.name)
        ? readZipEntries(bytes)
        : [{ path: file.name, bytes }];
      const nextPlan = planBureauArchiveImport(entries);
      if (nextPlan.pages.length === 0) throw new Error('No pages');
      setPlan(nextPlan);
      setSession({
        documentIdsByPath: new Map(
          nextPlan.pages.map((page) => [page.path, v4()]),
        ),
        createdPaths: new Set(),
        completedPaths: new Set(),
        attachmentUrls: new Map(),
      });
      setStatus('idle');
    } catch {
      setStatus('failed');
      setErrorMessage(
        t`Could not read this export. Choose an HTML or Markdown file, or a ZIP containing them (up to 100 MB, 5,000 entries and 250 MB uncompressed).`,
      );
    } finally {
      onBusyChange(false);
    }
  };

  const startImport = async () => {
    if (!plan || !session || !permissions.canUpdateObjectRecords) return;
    setStatus('importing');
    onBusyChange(true);
    setErrorMessage('');
    try {
      const { parseHtmlWithBlockNote, parseMarkdownWithBlockNote } =
        await import('@/blocknote-editor/import/adapters/parseHtmlWithBlockNote');
      const result = await runBureauArchiveImport({
        plan,
        session,
        createPage: async (page, id, parentId) => {
          await createOneRecord({
            id,
            title: page.title,
            kind: 'DOCUMENT',
            parentId,
          });
        },
        parsePage: async (page) =>
          page.format === 'html'
            ? parseHtmlWithBlockNote(page.content)
            : parseMarkdownWithBlockNote(page.content),
        mapBlocks: (blocks, resolveUrl) =>
          mapImportedAttachmentsAndLinks(blocks, {
            resolveAttachmentUrl: resolveUrl,
            resolveLinkUrl: resolveUrl,
          }),
        uploadAttachment: async (entry, documentId) => {
          const file = new File(
            [new Uint8Array(entry.bytes)],
            entry.path.split('/').pop() ?? 'attachment',
          );
          const uploaded = await uploadAttachmentFile(file, {
            id: documentId,
            targetObjectNameSingular: 'document',
          });
          return uploaded.attachmentAbsoluteURL;
        },
        savePage: async (documentId, blocks) => {
          await updateOneRecord({
            objectNameSingular: 'document',
            idToUpdate: documentId,
            recordGqlFields: { id: true, content: true, updatedAt: true },
            updateOneRecordInput: {
              content: { blocknote: JSON.stringify(blocks), markdown: null },
            },
          });
        },
        getPageUrl: getBureauPagePath,
        onProgress: (completed) => setCompletedCount(completed),
      });
      setWarningCount(result.warningCount);
      setStatus('complete');
      resyncDocuments();
    } catch {
      setStatus('failed');
      resyncDocuments();
      setErrorMessage(
        t`Import paused. Your completed pages are saved. Retry to continue without creating duplicate pages. If you close this window, review the imported pages before starting a new import.`,
      );
    } finally {
      onBusyChange(false);
    }
  };

  const isBusy = status === 'reading' || status === 'importing';

  return (
    <>
      <h2>{t`Import from Notion`}</h2>
      <p>{t`Export your Notion pages as HTML or Markdown with sub-pages and files included, then choose the ZIP. You can also import a single HTML or Markdown file.`}</p>
      <p>{t`Pages, nested structure, supported blocks, local images, attachments and page links are imported. Extra files are attached to the first page. Notion permissions, comments, database formulas and view settings are not converted. CSV databases remain attachments.`}</p>
      <input
        type="file"
        accept=".zip,.html,.htm,.md,.markdown"
        aria-label={t`Notion export file`}
        disabled={isBusy || (session?.createdPaths.size ?? 0) > 0}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readFile(file);
        }}
      />
      {plan && <p>{t`${plan.pages.length} pages ready to import`}</p>}
      {plan && plan.unsupportedPaths.length > 0 && (
        <p>{t`This archive includes CSV, JSON or nested ZIP files. These are preserved as attachments; their database behavior is not converted.`}</p>
      )}
      {isBusy && (
        <p role="status">
          {status === 'reading'
            ? t`Reading export…`
            : t`Imported ${completedCount} of ${plan?.pages.length ?? 0} pages…`}
        </p>
      )}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {status === 'complete' ? (
        <>
          <p role="status">{t`Import complete: ${completedCount} pages.`}</p>
          {warningCount > 0 && (
            <p>{t`${warningCount} items need review. Some unsupported or missing content could not be converted. Keep your original export.`}</p>
          )}
          <Button
            title={t`Open imported pages`}
            ariaLabel={t`Open imported pages`}
            onClick={() => {
              const firstId = session?.documentIdsByPath.get(
                plan?.pages[0]?.path ?? '',
              );
              closeModal(BUREAU_IMPORT_MODAL_ID);
              if (firstId) navigate(getBureauPagePath(firstId));
            }}
          />
        </>
      ) : (
        <Button
          title={status === 'failed' ? t`Retry import` : t`Import pages`}
          ariaLabel={status === 'failed' ? t`Retry import` : t`Import pages`}
          disabled={!plan || isBusy || !permissions.canUpdateObjectRecords}
          onClick={() => {
            void startImport();
          }}
        />
      )}
    </>
  );
};
