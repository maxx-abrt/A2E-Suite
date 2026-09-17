import { useCallback } from 'react';
import { gql } from '@apollo/client';

import { type EditorVersionHistoryPersistence } from '@/blocknote-editor/version-history/EditorVersionHistoryStore';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { isDefined } from 'twenty-shared/utils';

// Hand-written document: the a2e-documents app objects are workspace-schema
// objects, absent from the checked-in generated metadata — same codegen note
// as the a2e-workspace hand-written documents. Regenerate with
// npx nx run twenty-front:graphql:generate and switch to the generated
// *Document once the object ships in the schema fixtures.
const FIND_DOCUMENT_REVISIONS = gql`
  query FindDocumentRevisions($documentId: ID!) {
    documentRevisions(filter: { documentId: { eq: $documentId } }) {
      edges {
        node {
          id
          versionId
          body
          createdAt
        }
      }
    }
  }
`;

const CREATE_DOCUMENT_REVISION = gql`
  mutation CreateDocumentRevision($data: DocumentRevisionCreateInput!) {
    createDocumentRevision(data: $data) {
      id
      versionId
      createdAt
    }
  }
`;

const DELETE_DOCUMENT_REVISION = gql`
  mutation DeleteDocumentRevision($idToDelete: ID!) {
    deleteDocumentRevision(idToDelete: $idToDelete) {
      id
    }
  }
`;

// Server row backing one editor snapshot: `versionId` is the editor-side id and
// `body` the serialized blocknote document. The engine-provided createdAt is
// the snapshot time; rows are ordered client-side by it.
type DocumentRevisionRecord = {
  id: string;
  versionId: string;
  body: string;
  createdAt: string;
};

type DocumentRevisionConnection = {
  documentRevisions: {
    edges: { node: DocumentRevisionRecord }[];
  } | null;
};

export const useDocumentRevisionPersistence = ({
  documentId,
}: {
  documentId: string;
}): EditorVersionHistoryPersistence => {
  const apolloCoreClient = useApolloCoreClient();

  const findServerRows = useCallback(async (): Promise<
    DocumentRevisionRecord[]
  > => {
    const result = await apolloCoreClient.query<DocumentRevisionConnection>({
      query: FIND_DOCUMENT_REVISIONS,
      variables: { documentId },
      // History is re-read per editor mount; caching it would let a second
      // session prune or add versions without this editor ever noticing.
      fetchPolicy: 'no-cache',
    });

    return (
      result.data?.documentRevisions?.edges?.map((edge) => edge.node) ?? []
    );
  }, [apolloCoreClient, documentId]);

  const loadVersions = useCallback(async () => {
    const rows = await findServerRows();

    return rows
      .filter((row) => isDefined(row.versionId) && isDefined(row.body))
      .map((row) => ({
        versionId: row.versionId,
        createdAt: row.createdAt,
        body: row.body,
      }));
  }, [findServerRows]);

  const saveVersion = useCallback(
    async (snapshot: {
      versionId: string;
      createdAt: string;
      body: string;
    }): Promise<void> => {
      const existingRow = (await findServerRows()).find(
        (row) => row.versionId === snapshot.versionId,
      );

      // The versionId is generated client-side and unique: a re-save of the
      // same snapshot is a no-op, never a second row.
      if (isDefined(existingRow)) {
        return;
      }

      await apolloCoreClient.mutate({
        mutation: CREATE_DOCUMENT_REVISION,
        variables: {
          data: {
            versionId: snapshot.versionId,
            body: snapshot.body,
            documentId,
          },
        },
      });
    },
    [apolloCoreClient, documentId, findServerRows],
  );

  const deleteVersions = useCallback(
    async (versionIds: string[]): Promise<void> => {
      if (versionIds.length === 0) {
        return;
      }

      const versionIdSet = new Set(versionIds);
      const rowsToDelete = (await findServerRows()).filter((row) =>
        versionIdSet.has(row.versionId),
      );

      for (const row of rowsToDelete) {
        await apolloCoreClient.mutate({
          mutation: DELETE_DOCUMENT_REVISION,
          variables: { idToDelete: row.id },
        });
      }
    },
    [apolloCoreClient, findServerRows],
  );

  return { loadVersions, saveVersion, deleteVersions };
};
