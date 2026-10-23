import { useUploadAttachmentFile } from '@/activities/files/hooks/useUploadAttachmentFile';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
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
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useFindOneRecordQuery } from '@/object-record/hooks/useFindOneRecordQuery';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useLingui } from '@lingui/react/macro';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useStore } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { Button } from 'twenty-ui/input';

const MAX_IMPORT_FILE_BYTES = 100 * 1024 * 1024;

export const BureauImportModal = () => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  return (
    <WorkspaceBureauImportModal key={currentWorkspace?.id ?? 'signed-out'} />
  );
};

const WorkspaceBureauImportModal = () => {
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
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const store = useStore();
  const apolloCoreClient = useApolloCoreClient();
  const { findOneRecordQuery } = useFindOneRecordQuery({
    objectNameSingular: 'document',
    recordGqlFields: { id: true, title: true, parentId: true, kind: true },
  });
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
  // Awaiting transports must observe unmount synchronously, even if the same
  // workspace is opened again; this guard never participates in rendering.
  // oxlint-disable-next-line twenty/no-state-useref
  const isActive = useRef(true);
  useEffect(() => {
    isActive.current = true;
    return () => {
      isActive.current = false;
    };
  }, []);
  const isCurrentWorkspace = () =>
    isActive.current &&
    currentWorkspace?.id !== undefined &&
    store.get(currentWorkspaceState.atom)?.id === currentWorkspace.id;
  const assertCanContinue = () => {
    if (!isCurrentWorkspace()) throw new Error('Import workspace changed');
  };

  const readFile = async (file: File) => {
    setStatus('reading');
    onBusyChange(true);
    setErrorMessage('');
    setPlan(null);
    setSession(null);
    setCompletedCount(0);
    try {
      assertCanContinue();
      if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error('File too large');
      const bytes = new Uint8Array(await file.arrayBuffer());
      assertCanContinue();
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
      if (!isCurrentWorkspace()) return;
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
      assertCanContinue();
      const { parseHtmlWithBlockNote, parseMarkdownWithBlockNote } =
        await import('@/blocknote-editor/import/adapters/parseHtmlWithBlockNote');
      const result = await runBureauArchiveImport({
        plan,
        session,
        assertCanContinue,
        createPage: async (page, id, parentId) => {
          try {
            await createOneRecord({
              id,
              title: page.title,
              kind: 'DOCUMENT',
              parentId,
            });
          } catch (error) {
            assertCanContinue();
            // A lost response can follow a committed create; only recover the
            // exact identity this session allocated, never merge by title.
            const result = await apolloCoreClient.query<{
              document: {
                id: string;
                title: string;
                parentId: string | null;
                kind: string;
              } | null;
            }>({
              query: findOneRecordQuery,
              variables: { objectRecordId: id },
              fetchPolicy: 'network-only',
            });
            assertCanContinue();
            const document = result.data?.document;
            if (
              document?.id !== id ||
              document.title !== page.title ||
              document.parentId !== parentId ||
              document.kind !== 'DOCUMENT'
            )
              throw error;
          }
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
          const uploaded = await uploadAttachmentFile(
            file,
            { id: documentId, targetObjectNameSingular: 'document' },
            { assertCanContinue },
          );
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
      if (!isCurrentWorkspace()) return;
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
  const destinationName = currentWorkspace?.displayName ?? t`This workspace`;

  return (
    <>
      <h2>{t`Import from Notion`}</h2>
      <p>{t`Destination: ${destinationName}`}</p>
      <p>{t`In the workspace where you want these pages, choose a Notion HTML export with sub-pages and files included. HTML preserves more layout information, including columns. Markdown files and ZIP exports are also supported.`}</p>
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
            <details>
              <summary>{t`${warningCount} items need review`}</summary>
              <p>{t`Some unsupported or missing content could not be converted. Keep your original export.`}</p>
              <ul>
                {plan?.pages
                  .filter(
                    (page) =>
                      (session?.warningCountsByPath?.get(page.path) ?? 0) > 0,
                  )
                  .map((page) => (
                    <li key={page.path}>{page.path}</li>
                  ))}
                {plan?.unsupportedPaths.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            </details>
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
