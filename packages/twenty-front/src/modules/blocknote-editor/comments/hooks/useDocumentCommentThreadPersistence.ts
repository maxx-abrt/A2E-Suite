import { useCallback } from 'react';
import { gql } from '@apollo/client';

import { type EditorCommentsThreadPersistence } from '@/blocknote-editor/comments/EditorCommentsThreadStore';
import {
  mapDocumentCommentThreadRecordToThreadData,
  mapThreadDataToDocumentCommentThreadInput,
  type DocumentCommentThreadRecord,
} from '@/blocknote-editor/comments/utils/mapDocumentCommentThread';
import { type ThreadData } from '@blocknote/core/comments';
import { isDefined } from 'twenty-shared/utils';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

// Hand-written document: the a2e-documents app objects are workspace-schema
// objects, absent from the checked-in generated metadata — same codegen note
// as the a2e-workspace hand-written documents. Regenerate with
// npx nx run twenty-front:graphql:generate and switch to the generated
// *Document once the object ships in the schema fixtures.
const FIND_DOCUMENT_COMMENT_THREADS = gql`
  query FindDocumentCommentThreads($documentId: ID!) {
    documentCommentThreads(filter: { documentId: { eq: $documentId } }) {
      edges {
        node {
          id
          threadId
          comments
          resolved
          resolvedBy
          metadata
          createdAt
          updatedAt
        }
      }
    }
  }
`;

const CREATE_DOCUMENT_COMMENT_THREAD = gql`
  mutation CreateDocumentCommentThread(
    $data: DocumentCommentThreadCreateInput!
  ) {
    createDocumentCommentThread(data: $data) {
      id
      threadId
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_DOCUMENT_COMMENT_THREAD = gql`
  mutation UpdateDocumentCommentThread(
    $id: ID!
    $data: DocumentCommentThreadUpdateInput!
  ) {
    updateDocumentCommentThread(id: $id, data: $data) {
      id
      updatedAt
    }
  }
`;

const DELETE_DOCUMENT_COMMENT_THREAD = gql`
  mutation DeleteDocumentCommentThread($idToDelete: ID!) {
    deleteDocumentCommentThread(idToDelete: $idToDelete) {
      id
    }
  }
`;

// One server row per blocknote thread (P3.2): threadId carries the editor-side
// thread id, comments/resolved/resolvedBy/metadata project ThreadData, and the
// row hangs off the document by the relation's scalar join column documentId.
// Thread rows are created on first save and reused afterwards; CASCADE on the
// document relation removes them with their document.
type DocumentCommentThreadConnection = {
  documentCommentThreads: {
    edges: { node: DocumentCommentThreadRecord }[];
  } | null;
};

export const useDocumentCommentThreadPersistence = ({
  documentId,
}: {
  documentId: string;
}): EditorCommentsThreadPersistence => {
  const apolloCoreClient = useApolloCoreClient();

  const loadThreads = useCallback(async (): Promise<ThreadData[]> => {
    const result =
      await apolloCoreClient.query<DocumentCommentThreadConnection>({
        query: FIND_DOCUMENT_COMMENT_THREADS,
        variables: { documentId },
        // Thread lists are re-read per editor mount; caching them here would
        // show stale resolution state after another session resolves a thread.
        fetchPolicy: 'no-cache',
      });

    return (
      result.data?.documentCommentThreads?.edges?.map((edge) =>
        mapDocumentCommentThreadRecordToThreadData(edge.node),
      ) ?? []
    );
  }, [apolloCoreClient, documentId]);

  const findServerRowByThreadId = useCallback(
    async (threadId: string): Promise<DocumentCommentThreadRecord | null> => {
      const result =
        await apolloCoreClient.query<DocumentCommentThreadConnection>({
          query: FIND_DOCUMENT_COMMENT_THREADS,
          variables: { documentId },
          fetchPolicy: 'no-cache',
        });

      return (
        result.data?.documentCommentThreads?.edges
          ?.map((edge) => edge.node)
          .find((node) => node.threadId === threadId) ?? null
      );
    },
    [apolloCoreClient, documentId],
  );

  const saveThread = useCallback(
    async (thread: ThreadData): Promise<void> => {
      const serverRow = await findServerRowByThreadId(thread.id);
      const data = mapThreadDataToDocumentCommentThreadInput(thread);

      if (isDefined(serverRow)) {
        await apolloCoreClient.mutate({
          mutation: UPDATE_DOCUMENT_COMMENT_THREAD,
          variables: { id: serverRow.id, data },
        });

        return;
      }

      await apolloCoreClient.mutate({
        mutation: CREATE_DOCUMENT_COMMENT_THREAD,
        variables: {
          data: { ...data, threadId: thread.id, documentId },
        },
      });
    },
    [apolloCoreClient, documentId, findServerRowByThreadId],
  );

  const deleteThread = useCallback(
    async (threadId: string): Promise<void> => {
      const serverRow = await findServerRowByThreadId(threadId);

      if (!isDefined(serverRow)) {
        return;
      }

      await apolloCoreClient.mutate({
        mutation: DELETE_DOCUMENT_COMMENT_THREAD,
        variables: { idToDelete: serverRow.id },
      });
    },
    [apolloCoreClient, findServerRowByThreadId],
  );

  return { loadThreads, saveThread, deleteThread };
};
