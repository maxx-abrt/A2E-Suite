import { type AttachmentUploadSession } from '@/activities/files/types/AttachmentUploadSession';
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
import { stripNotionEntryHash } from '@/blocknote-editor/import/utils/documentsTransferEntries';
import { BureauImportReview } from '@/bureau/components/BureauImportReview';
import { BUREAU_TREE_RECORD_GQL_FIELDS } from '@/bureau/constants/BureauTreeRecordGqlFields';
import { getBureauAncestors } from '@/bureau/utils/getBureauAncestors';
import { getBureauAppendPosition } from '@/bureau/utils/getBureauAppendPosition';
import { Select } from '@/ui/input/components/Select';
import { styled } from '@linaria/react';
import { IconUpload } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
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

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: 0;
`;
const StyledChoices = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
`;
const StyledDestination = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;
const StyledDropZone = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border: 1px dashed ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[4]};
  &[data-has-preview='true'] {
    flex-direction: row;
    flex-wrap: wrap;
    padding: ${themeCssVariables.spacing[3]};
    strong {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    > p {
      display: none;
    }
  }
  &:focus-within {
    border-color: ${themeCssVariables.color.blue};
  }
`;
const StyledFooter = styled.footer`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[3]};
  > p {
    flex: 1;
    min-width: 180px;
  }
`;
const StyledError = styled.p`
  color: ${themeCssVariables.color.red};
`;
const StyledProgress = styled.progress`
  accent-color: ${themeCssVariables.color.blue};
  width: 100%;
`;

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
    <BureauModal
      modalId={BUREAU_IMPORT_MODAL_ID}
      isBusy={isImporting}
      width="min(1040px, calc(100vw - 32px))"
    >
      <BureauImportContent onBusyChange={setIsImporting} />
    </BureauModal>
  );
};

type BureauImportContentProps = { onBusyChange: (isBusy: boolean) => void };

const BureauImportContent = ({ onBusyChange }: BureauImportContentProps) => {
  const { t } = useLingui();
  const {
    permissions,
    resyncDocuments,
    tree,
    activeDocumentId,
    isLoading,
    error: treeError,
    expandPageIds,
  } = useBureauWorkspace();
  const navigate = useNavigate();
  const { closeModal } = useModal();
  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: 'document',
    recordGqlFields: BUREAU_TREE_RECORD_GQL_FIELDS,
    shouldMatchRootQueryFilter: true,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentUploads] = useState(
    () => new Map<string, AttachmentUploadSession>(),
  );
  const [activeOperation, setActiveOperation] = useState('');
  const [source, setSource] = useState<'notion' | 'files'>('notion');
  const [destinationParentId, setDestinationParentId] = useState<string | null>(
    activeDocumentId,
  );
  const [fileName, setFileName] = useState('');
  const [hasStartedImport, setHasStartedImport] = useState(false);
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
  // Prevent overlapping mutation runs before React can disable the import action.
  // oxlint-disable-next-line twenty/no-state-useref
  const isRunning = useRef(false);
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
    attachmentUploads.clear();
    setActiveOperation('');
    setCompletedCount(0);
    setWarningCount(0);
    setFileName(file.name);
    try {
      assertCanContinue();
      if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error('File too large');
      const bytes = new Uint8Array(await file.arrayBuffer());
      assertCanContinue();
      const entries = /\.zip$/i.test(file.name)
        ? readZipEntries(bytes)
        : [{ path: file.name, bytes }];
      const nextPlan = planBureauArchiveImport(entries);
      nextPlan.sourceFile = { path: file.name, bytes };
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

  const destinationExists =
    destinationParentId === null || tree.documentsById.has(destinationParentId);

  const startImport = async () => {
    if (
      !plan ||
      !session ||
      !permissions.canUpdateObjectRecords ||
      !destinationExists ||
      isLoading ||
      treeError ||
      isBusy ||
      isRunning.current
    )
      return;
    isRunning.current = true;
    setHasStartedImport(true);
    setStatus('importing');
    onBusyChange(true);
    setErrorMessage('');
    let operationPath = '';
    try {
      assertCanContinue();
      const {
        parseHtmlWithBlockNote,
        parseMarkdownWithBlockNote,
        importedBlocksToMarkdown,
      } =
        await import('@/blocknote-editor/import/adapters/parseHtmlWithBlockNote');
      const result = await runBureauArchiveImport({
        plan,
        session,
        assertCanContinue,
        destinationParentId,
        onOperation: (path) => {
          operationPath = path;
          setActiveOperation(path);
        },
        createPage: async (page, id, parentId) => {
          try {
            await createOneRecord({
              id,
              title: page.title,
              kind: 'DOCUMENT',
              ...(page.icon ? { icon: page.icon } : {}),
              parentId,
              position:
                getBureauAppendPosition(
                  tree.childrenByParentId.get(parentId) ?? [],
                ) + plan.pages.indexOf(page),
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
        mapBlocks: (blocks, resolveUrl, pageLinkResolvers) =>
          mapImportedAttachmentsAndLinks(blocks, {
            preserveUnmappedAttachments: true,
            resolveAttachmentUrl: resolveUrl,
            resolveLinkUrl: resolveUrl,
            ...(pageLinkResolvers ?? {}),
          }),
        uploadAttachment: async (entry, documentId) => {
          const file = new File(
            [new Uint8Array(entry.bytes)],
            entry.path.split('/').pop() ?? 'attachment',
          );
          const attachmentKey = `${documentId}:${entry === plan.sourceFile ? 'original-export' : 'archive-entry'}:${entry.path}`;
          const uploadSession = attachmentUploads.get(attachmentKey) ?? {
            attachmentId: v4(),
          };
          attachmentUploads.set(attachmentKey, uploadSession);
          const uploaded = await uploadAttachmentFile(
            file,
            { id: documentId, targetObjectNameSingular: 'document' },
            { assertCanContinue, session: uploadSession },
          );
          return uploaded.attachmentAbsoluteURL;
        },
        applyPageCover: async (page, documentId, url) => {
          // Attachment host URLs are absolute; anything else would not render
          // as a cover image, so it is treated as unavailable.
          if (!/^https?:\/\//i.test(url)) {
            throw new Error('Cover URL is not renderable');
          }
          await updateOneRecord({
            objectNameSingular: 'document',
            idToUpdate: documentId,
            recordGqlFields: { id: true, coverImage: true },
            updateOneRecordInput: { coverImage: url },
          });
        },
        savePage: async (documentId, blocks) => {
          await updateOneRecord({
            objectNameSingular: 'document',
            idToUpdate: documentId,
            recordGqlFields: { id: true, content: true, updatedAt: true },
            updateOneRecordInput: {
              content: {
                blocknote: JSON.stringify(blocks),
                markdown: await importedBlocksToMarkdown(blocks),
              },
            },
          });
        },
        getPageUrl: getBureauPagePath,
        onProgress: (completed) => setCompletedCount(completed),
      });
      setWarningCount(result.warningCount);
      const allPagesFailed = session.completedPaths.size === 0;
      setStatus(allPagesFailed ? 'failed' : 'complete');
      if (allPagesFailed)
        setErrorMessage(
          t`None of the pages received their content. The page structure was created; Retry import continues without duplicates once the import can reach the workspace.`,
        );
      if (destinationParentId) expandPageIds([destinationParentId]);
      resyncDocuments();
    } catch (error) {
      if (!isCurrentWorkspace()) return;
      setStatus('failed');
      resyncDocuments();
      const detail = error instanceof Error ? error.message : t`Unknown error`;
      setErrorMessage(
        t`Could not finish ${operationPath}: ${detail}` +
          ' ' +
          t`Import paused. Your completed pages are saved. Retry to continue without creating duplicate pages. If you close this window, review the imported pages before starting a new import.`,
      );
    } finally {
      isRunning.current = false;
      onBusyChange(false);
    }
  };

  const isBusy = status === 'reading' || status === 'importing';
  const destinationName = currentWorkspace?.displayName ?? t`This workspace`;

  const destinationOptions = [
    { value: '', label: t`Bureau root` },
    ...[...tree.documentsById.values()]
      .filter((page) => page.kind !== 'TEMPLATE' && !page.deletedAt)
      .map((page) => ({
        value: page.id,
        label: [...getBureauAncestors(page.id, tree), page]
          .map((ancestor) => ancestor.title?.trim() || t`Untitled`)
          .join(' / '),
      }))
      .sort((first, second) => first.label.localeCompare(second.label)),
  ];
  const canChooseFile = !isBusy && !hasStartedImport;
  const attachmentCount = plan
    ? [...plan.entriesByPath.keys()].filter(
        (path) => !plan.canonicalPathByPath?.has(path) || /\.csv$/i.test(path),
      ).length
    : 0;

  return (
    <>
      <header>
        <h2>{t`Import`}</h2>
        <StyledDescription>{t`Bring your pages into Bureau. Preview everything before importing.`}</StyledDescription>
      </header>
      <StyledChoices aria-label={t`Import source`}>
        <Button
          title={t`Notion`}
          ariaLabel={t`Notion`}
          variant={source === 'notion' ? 'primary' : 'secondary'}
          disabled={!canChooseFile}
          onClick={() => setSource('notion')}
        />
        <Button
          title={t`Markdown & HTML`}
          ariaLabel={t`Markdown & HTML`}
          variant={source === 'files' ? 'primary' : 'secondary'}
          disabled={!canChooseFile}
          onClick={() => setSource('files')}
        />
      </StyledChoices>
      <StyledDescription>
        {source === 'notion'
          ? t`In Notion, export as HTML or Markdown & CSV with subpages and files included. Drop the ZIP below. HTML preserves more layout information.`
          : t`Drop a ZIP containing HTML or Markdown pages and their files, or choose a single page. Folders matching a page name become its children.`}
      </StyledDescription>
      <StyledDestination>
        <span>{t`Destination: ${destinationName}`}</span>
        <Select
          dropdownId="bureau-import-destination"
          label={t`Import into`}
          fullWidth
          withSearchInput
          isDropdownInModal
          disabled={isBusy || hasStartedImport || isLoading || !!treeError}
          value={destinationParentId ?? ''}
          options={destinationOptions}
          onChange={(value) => setDestinationParentId(value || null)}
        />
        {!destinationExists && (
          <p role="alert">{t`The destination page is no longer available. Choose another destination.`}</p>
        )}
        {treeError && (
          <p role="alert">{t`Could not load destination pages. Close this window and retry after reloading Bureau.`}</p>
        )}
      </StyledDestination>
      <StyledDropZone
        aria-label={t`Drop export here`}
        aria-disabled={!canChooseFile}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = canChooseFile ? 'copy' : 'none';
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (!canChooseFile) return;
          if (event.dataTransfer.files.length !== 1) {
            setErrorMessage(t`Choose one export file at a time.`);
            return;
          }
          const file = event.dataTransfer.files[0];
          void readFile(file);
        }}
        data-has-preview={!!plan}
      >
        <IconUpload size={24} />
        <strong>{fileName || t`Drop your export here`}</strong>
        <StyledDescription>{t`ZIP, HTML or Markdown · Up to 100 MB`}</StyledDescription>
        <Button
          title={t`Choose file`}
          ariaLabel={t`Choose file`}
          variant="secondary"
          disabled={!canChooseFile}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept=".zip,.html,.htm,.md,.markdown"
          aria-label={t`Export file`}
          disabled={!canChooseFile}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void readFile(file);
          }}
        />
      </StyledDropZone>
      {plan && (
        <>
          <StyledChoices>
            <strong>{t`${plan.pages.length} pages ready to import`}</strong>
            <span>{t`${attachmentCount} files`}</span>
          </StyledChoices>
          <BureauImportReview key={fileName} plan={plan} />
          <details>
            <summary>{t`Compatibility and review`}</summary>
            <StyledDescription>{t`The original export is kept as an attachment for recovery. Page structure, supported formatting, columns, tables, checklists, local media and page links are preserved. CSV databases become editable table snapshots with the original CSV attached. Large or malformed CSVs stay as attachments. Formulas, relations, database views, comments and sharing permissions are not recreated. Preview links are disabled until import.`}</StyledDescription>
            {plan.unsupportedPaths.length > 0 && (
              <ul>
                {plan.unsupportedPaths.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            )}
          </details>
        </>
      )}
      {isBusy && (
        <div role="status" aria-live="polite">
          {activeOperation && (
            <StyledDescription>{activeOperation}</StyledDescription>
          )}
          <p>
            {status === 'reading'
              ? t`Reading export…`
              : t`Imported ${completedCount} of ${plan?.pages.length ?? 0} pages…`}
          </p>
          {status === 'importing' && (
            <StyledProgress
              aria-label={t`Import progress`}
              max={plan?.pages.length ?? 1}
              value={completedCount}
            />
          )}
        </div>
      )}
      {errorMessage && <StyledError role="alert">{errorMessage}</StyledError>}
      {status === 'complete' && (
        <>
          <p role="status">
            {t`Import complete: ${completedCount} pages.`}
            {(session?.failedPagesByPath?.size ?? 0) > 0 &&
              t` ${session?.failedPagesByPath?.size ?? 0} page(s) need retry.`}
          </p>
          {(session?.failedPagesByPath?.size ?? 0) > 0 && (
            <details>
              <summary>
                {t`${session?.failedPagesByPath?.size} pages need retry`}
              </summary>
              <StyledDescription>
                {t`These pages have pending content, links, files or covers. Retry import continues the missing work without duplicating completed uploads or pages.`}
              </StyledDescription>
              <ul>
                {[...(session?.failedPagesByPath?.entries() ?? [])].map(
                  ([path, message]) => (
                    <li
                      key={path}
                    >{`${stripNotionEntryHash(path)} — ${message}`}</li>
                  ),
                )}
              </ul>
            </details>
          )}
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
        </>
      )}
      <StyledFooter>
        <StyledDescription>
          {hasStartedImport
            ? t`Keep this window open until the import finishes.`
            : t`Nothing is created until you accept the import.`}
        </StyledDescription>
        <Button
          title={t`Close`}
          ariaLabel={t`Close`}
          variant="secondary"
          disabled={isBusy}
          onClick={() => closeModal(BUREAU_IMPORT_MODAL_ID)}
        />
        {status === 'complete' &&
        (session?.failedPagesByPath?.size ?? 0) === 0 ? (
          <Button
            title={t`Open imported pages`}
            ariaLabel={t`Open imported pages`}
            accent="blue"
            onClick={() => {
              const firstId = session?.documentIdsByPath.get(
                plan?.pages[0]?.path ?? '',
              );
              closeModal(BUREAU_IMPORT_MODAL_ID);
              if (firstId) navigate(getBureauPagePath(firstId));
            }}
          />
        ) : (
          <Button
            title={hasStartedImport ? t`Retry import` : t`Import pages`}
            ariaLabel={hasStartedImport ? t`Retry import` : t`Import pages`}
            accent="blue"
            disabled={
              !plan ||
              isBusy ||
              !permissions.canUpdateObjectRecords ||
              !destinationExists ||
              isLoading ||
              !!treeError
            }
            onClick={() => {
              void startImport();
            }}
          />
        )}
      </StyledFooter>
    </>
  );
};
