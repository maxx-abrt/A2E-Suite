import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtom, useStore } from 'jotai';

import { BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { EditorCommentsThreadStore } from '@/blocknote-editor/comments/EditorCommentsThreadStore';
import { useDocumentCommentThreadPersistence } from '@/blocknote-editor/comments/hooks/useDocumentCommentThreadPersistence';
import { useResolveCommentUsers } from '@/blocknote-editor/comments/hooks/useResolveCommentUsers';
import { BlockEditor } from '@/blocknote-editor/components/BlockEditor';
import { BlockEditorSaveConflictBanner } from '@/blocknote-editor/co-editing/components/BlockEditorSaveConflictBanner';
import { useDocumentSaveConflictGuard } from '@/blocknote-editor/co-editing/hooks/useDocumentSaveConflictGuard';
import { BLOCK_EDITOR_GLOBAL_HOTKEYS_CONFIG } from '@/blocknote-editor/constants/BlockEditorGlobalHotkeysConfig';
import { useAttachmentSync } from '@/blocknote-editor/hooks/useAttachmentSync';
import { useReplaceBlockEditorContent } from '@/blocknote-editor/hooks/useReplaceBlockEditorContent';
import { parseInitialBlocknote } from '@/blocknote-editor/utils/parseInitialBlocknote';
import { useDocumentRevisionPersistence } from '@/blocknote-editor/version-history/hooks/useDocumentRevisionPersistence';
import { prepareBodyWithSignedUrls } from '@/blocknote-editor/utils/prepareBodyWithSignedUrls';
import { type Attachment } from '@/activities/files/types/Attachment';
import { CommentsExtension } from '@blocknote/core/comments';
import { useUploadAttachmentFile } from '@/activities/files/hooks/useUploadAttachmentFile';
import { getActivityTargetObjectFieldIdName } from '@/activities/utils/getActivityTargetObjectFieldIdName';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { modifyRecordFromCache } from '@/object-record/cache/utils/modifyRecordFromCache';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useRecordSeededDraft } from '@/object-record/record-seeded-draft/hooks/useRecordSeededDraft';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useIsRecordFieldReadOnly } from '@/object-record/read-only/hooks/useIsRecordFieldReadOnly';
import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { t } from '@lingui/core/macro';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/react/style.css';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { Key } from 'ts-key-enum';
import { isDefined } from 'twenty-shared/utils';
import { useDebouncedCallback } from 'use-debounce';
import { isDeeplyEqual } from '~/utils/isDeeplyEqual';

type RichTextFieldEditorProps = {
  recordId: string;
  objectNameSingular: string;
  fieldName: string;
  onPersistBody?: (blocknote: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  editorRef?: React.MutableRefObject<
    typeof BLOCK_SCHEMA.BlockNoteEditor | null
  >;
};

export const RichTextFieldEditor = ({
  recordId,
  objectNameSingular,
  fieldName,
  onPersistBody,
  onFocus: onFocusOverride,
  onBlur: onBlurOverride,
  editorRef,
}: RichTextFieldEditorProps) => {
  const resolveCommentUsers = useResolveCommentUsers();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const store = useStore();
  const [recordInStore] = useAtom(recordStoreFamilyState.atomFamily(recordId));

  const cache = useApolloCoreClient().cache;

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular,
  });

  const fieldMetadataItem = objectMetadataItem.fields.find(
    (field) => field.name === fieldName,
  );

  const { updateOneRecord } = useUpdateOneRecord();

  const isRecordFieldReadOnly = useIsRecordFieldReadOnly({
    recordId,
    objectMetadataId: objectMetadataItem.id,
    fieldMetadataId: fieldMetadataItem?.id ?? '',
  });

  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();

  const focusId = `${recordId}-${fieldName}`;

  const attachmentTargetFieldIdName = getActivityTargetObjectFieldIdName({
    nameSingular: objectNameSingular,
  });

  const { records: attachments } = useFindManyRecords<Attachment>({
    objectNameSingular: CoreObjectNameSingular.Attachment,
    filter: {
      [attachmentTargetFieldIdName]: {
        eq: recordId,
      },
    },
  });

  const { syncAttachments } = useAttachmentSync(attachments);

  const { uploadAttachmentFile } = useUploadAttachmentFile();

  const handleUploadAttachment = async (file: File) => {
    return await uploadAttachmentFile(file, {
      id: recordId,
      targetObjectNameSingular: objectNameSingular,
    });
  };

  const handleEditorBuiltInUploadFile = async (file: File) => {
    const { attachmentAbsoluteURL } = await handleUploadAttachment(file);

    return attachmentAbsoluteURL;
  };

  const fieldValue = isDefined(recordInStore)
    ? (recordInStore as Record<string, { blocknote?: string | null }>)?.[
        fieldName
      ]
    : null;

  const initialBody = useMemo(() => {
    if (!isDefined(fieldValue)) {
      return undefined;
    }

    return parseInitialBlocknote(
      fieldValue?.blocknote,
      `Failed to parse body for field ${fieldName} on record ${recordId}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldName, recordId]);

  // Thread persistence only exists for a2e-documents `document` records; the
  // same editor also renders core note/email bodies whose schema has no
  // documentCommentThread object, so those keep the in-memory store.
  const isDocumentRecord = objectNameSingular === 'document';
  const documentThreadPersistence = useDocumentCommentThreadPersistence({
    documentId: recordId,
  });
  const documentRevisionPersistence = useDocumentRevisionPersistence({
    documentId: recordId,
  });

  // Expected-revision save guard: only the a2e-documents editor gets conflict
  // feedback; note/email rich text keeps the plain last-write-wins draft.
  const saveConflictGuard = useDocumentSaveConflictGuard(isDocumentRecord);
  // A conflict is read inside the debounced persist, which can fire after the
  // render that raised it; the ref keeps the gate current without retriggering
  // the debounce.
  // oxlint-disable-next-line twenty/no-state-useref
  const isSaveConflictActiveRef = useRef(false);

  const commentThreadStore = useMemo(
    () =>
      new EditorCommentsThreadStore({
        currentUserId: currentWorkspaceMember?.id ?? '',
        persistence: isDocumentRecord ? documentThreadPersistence : undefined,
      }),
    // Editor (and its captured thread store) is created once per record field;
    // identity changes would orphan existing threads. The persistence
    // callbacks are useCallback-stable and close over recordId-scoped state,
    // so capturing the first instance is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recordId, fieldName, currentWorkspaceMember?.id, isDocumentRecord],
  );

  useEffect(() => {
    if (!isDocumentRecord) {
      return;
    }

    void commentThreadStore.loadFromPersistence();
  }, [commentThreadStore, isDocumentRecord]);

  const commentsExtension = useMemo(
    () =>
      CommentsExtension({
        threadStore: commentThreadStore,
        resolveUsers: resolveCommentUsers,
      }),
    [commentThreadStore, resolveCommentUsers],
  );

  const editor = useCreateBlockNote(
    {
      initialContent: initialBody,
      domAttributes: { editor: { class: 'editor' } },
      schema: BLOCK_SCHEMA,
      uploadFile: handleEditorBuiltInUploadFile,
      placeholders: {
        default: t`Type '/' for commands, '@' for mentions`,
      },
      extensions: [commentsExtension],
    },
    [commentsExtension],
  );

  if (editorRef) {
    editorRef.current = editor;
  }

  const { replaceBlockEditorContent } = useReplaceBlockEditorContent(
    editor,
    fieldName,
  );

  // Shared by the normal persist and the conflict "keep my changes" action so
  // both write the exact same prepared body; returns it so the conflict guard's
  // expected revision matches what lands in the cache.
  const persistBlocknoteBody = useCallback(
    (blocknote: string): string => {
      const preparedBlocknote = prepareBodyWithSignedUrls(blocknote);

      if (onPersistBody) {
        onPersistBody(preparedBlocknote);
        return preparedBlocknote;
      }

      updateOneRecord({
        idToUpdate: recordId,
        objectNameSingular,
        updateOneRecordInput: {
          [fieldName]: {
            blocknote: preparedBlocknote,
            markdown: null,
          },
        },
      });

      return preparedBlocknote;
    },
    [fieldName, objectNameSingular, onPersistBody, recordId, updateOneRecord],
  );

  const { draft, updateDraft, markDirty, flush, draftResyncKey } =
    useRecordSeededDraft({
      upstreamDraft: { blocknote: fieldValue?.blocknote ?? '' },
      persistDebounceMs: 300,
      resetKey: recordId,
      onPersist: ({ blocknote }) => {
        if (isRecordFieldReadOnly === true) return;

        // A concurrent revision overlap holds the save until the user picks a
        // side; the draft stays in the editor and is never silently dropped.
        if (isSaveConflictActiveRef.current) return;

        const persistedBody = persistBlocknoteBody(blocknote);
        saveConflictGuard.notePersisted(persistedBody);
      },
    });

  // The BlockNote editor is uncontrolled; when a remote value is adopted,
  // replace its content in place instead of remounting to keep the instance.
  const [lastAppliedResyncKey, setLastAppliedResyncKey] =
    useState(draftResyncKey);

  // The editor reports programmatic replacements through the same change
  // callback as typing, so latch around the adoption: without it the adopted
  // body would be treated as a local edit, marked dirty and written straight
  // back, blocking the next remote update from being adopted.
  // oxlint-disable-next-line twenty/no-state-useref
  const isApplyingUpstreamBodyRef = useRef(false);

  useEffect(() => {
    if (draftResyncKey === lastAppliedResyncKey) {
      return;
    }

    setLastAppliedResyncKey(draftResyncKey);

    isApplyingUpstreamBodyRef.current = true;
    try {
      replaceBlockEditorContent(recordId);
    } finally {
      isApplyingUpstreamBodyRef.current = false;
    }
  }, [
    draftResyncKey,
    lastAppliedResyncKey,
    replaceBlockEditorContent,
    recordId,
  ]);

  // Keep the debounced persist gate current with the latest conflict state.
  useEffect(() => {
    isSaveConflictActiveRef.current = saveConflictGuard.conflict !== null;
  }, [saveConflictGuard.conflict]);

  // Observe the record body against the local draft. The cache also carries our
  // own optimistic writes, so a body equal to the draft is an echo and only a
  // differing body is classified as a concurrent revision.
  const remoteRecordBody = fieldValue?.blocknote ?? '';
  const { observeRevision } = saveConflictGuard;

  useEffect(() => {
    observeRevision(remoteRecordBody, draft.blocknote);
  }, [remoteRecordBody, draft.blocknote, observeRevision]);

  const handleKeepLocalChanges = () => {
    const localBody = JSON.stringify(editor.document);
    const persistedBody = persistBlocknoteBody(localBody);

    saveConflictGuard.notePersisted(persistedBody);
    saveConflictGuard.clearConflict();
  };

  const handleUseSavedVersion = () => {
    const remoteBody = saveConflictGuard.conflict?.remoteBody;

    if (!isDefined(remoteBody)) {
      return;
    }

    const remoteBlocks = parseInitialBlocknote(remoteBody) ?? [
      { type: 'paragraph' as const, content: '' },
    ];

    isApplyingUpstreamBodyRef.current = true;
    try {
      if (
        !isDeeplyEqual(editor.document, remoteBlocks as typeof editor.document)
      ) {
        editor.replaceBlocks(
          editor.document,
          remoteBlocks as typeof editor.document,
        );
      }
    } finally {
      isApplyingUpstreamBodyRef.current = false;
    }

    updateDraft({ blocknote: remoteBody });
    saveConflictGuard.resetBase(remoteBody);
    saveConflictGuard.clearConflict();
  };

  const handleBodyChange = async (newStringifiedBody: string) => {
    const oldRecord = store.get(recordStoreFamilyState.atomFamily(recordId));

    store.set(
      recordStoreFamilyState.atomFamily(recordId),
      (prev: typeof oldRecord) => ({
        ...prev,
        id: recordId,
        [fieldName]: {
          blocknote: newStringifiedBody,
          markdown: null,
        },
        __typename: prev?.__typename ?? objectNameSingular,
      }),
    );

    modifyRecordFromCache({
      recordId,
      fieldModifiers: {
        [fieldName]: () => ({
          blocknote: newStringifiedBody,
          markdown: null,
        }),
      },
      cache,
      objectMetadataItem,
    });

    const oldFieldValue = oldRecord?.[fieldName] as
      | { blocknote?: string | null }
      | undefined;

    // Only schedule the persist once the pre-edit body is captured above:
    // persisting optimistically rewrites the record, and doing that earlier
    // would make the attachment diff below compare the new body with itself,
    // leaving attachments removed from the body undeleted.
    updateDraft({ blocknote: newStringifiedBody });

    await syncAttachments(newStringifiedBody, oldFieldValue?.blocknote);
  };

  const handleBodyChangeDebounced = useDebouncedCallback(handleBodyChange, 500);

  const handleEditorChange = () => {
    if (isApplyingUpstreamBodyRef.current) {
      return;
    }

    // Serialization is debounced, so mark the draft dirty synchronously: a
    // remote adoption arriving in that window would otherwise replace content
    // the user is actively typing.
    markDirty();

    handleBodyChangeDebounced(JSON.stringify(editor.document) ?? '');
  };

  useHotkeysOnFocusedElement({
    keys: Key.Escape,
    callback: () => {
      editor.domElement?.blur();
    },
    focusId,
    dependencies: [editor],
  });

  const handleBlockEditorFocus = useCallback(() => {
    if (onFocusOverride) {
      onFocusOverride();
      return;
    }

    pushFocusItemToFocusStack({
      component: {
        instanceId: focusId,
        type: FocusComponentType.ACTIVITY_RICH_TEXT_EDITOR,
      },
      focusId,
      globalHotkeysConfig: BLOCK_EDITOR_GLOBAL_HOTKEYS_CONFIG,
    });
  }, [focusId, pushFocusItemToFocusStack, onFocusOverride]);

  const handleBlockEditorBlur = () => {
    handleBodyChangeDebounced.flush();
    flush();

    if (onBlurOverride) {
      onBlurOverride();
      return;
    }

    removeFocusItemFromFocusStackById({ focusId });
  };

  return (
    <>
      {isDocumentRecord && saveConflictGuard.conflict !== null ? (
        <BlockEditorSaveConflictBanner
          conflictingBlockCount={
            saveConflictGuard.conflict.conflictingBlockIds.length
          }
          onKeepLocal={handleKeepLocalChanges}
          onUseRemote={handleUseSavedVersion}
        />
      ) : null}
      <BlockEditor
        onFocus={handleBlockEditorFocus}
        onBlur={handleBlockEditorBlur}
        onChange={handleEditorChange}
        editor={editor}
        documentRecordId={recordId}
        versionHistoryPersistence={
          isDocumentRecord ? documentRevisionPersistence : undefined
        }
        readonly={isRecordFieldReadOnly}
      />
    </>
  );
};
