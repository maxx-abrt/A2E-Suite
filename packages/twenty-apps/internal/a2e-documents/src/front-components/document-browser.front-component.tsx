import { useCallback, useEffect, useMemo, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate } from 'twenty-sdk/front-component';

import { DOCUMENT_KIND } from '../constants/field-vocabulary.ts';
import { OBJECT_IDS } from '../constants/universal-identifiers.ts';
import {
  buildMoveDocumentPayload,
  type TreeDocument,
} from '../lib/document-tree.ts';
import { buildAppendPosition } from '../lib/fractional-position.ts';
import { buildTemplateCopyPayload } from '../lib/instantiate-template.ts';
import { isPastTrashRetention } from '../lib/trash-retention.ts';

// LE NAVIGATEUR DE DOCUMENTS.
//
// Metadata views list flat records; the tree needs a recursive explorer, so
// this is the sanctioned front-component escape hatch (04-twenty-native-law
// §2 decision order, step 3: metadata views first, front component for the
// genuinely novel tree UX). Sections: quick search, favorites, tree
// (drag to reparent/reorder via fractional index), trash with restore —
// the 7-day purge itself runs as the purge-archived-documents cron.

export const DOCUMENT_BROWSER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31a0000-0013-4000-8000-000000000001';

type DocumentNode = {
  id: string;
  title: string;
  kind: string;
  icon?: string | null;
  isFavorite: boolean;
  archivedAt: string | null;
  parentDocumentId?: string | null;
  position?: string | null;
  content?: {
    blocknote?: string | null;
    markdown?: string | null;
  } | null;
  children?: { edges: { node: DocumentNode }[] };
};

const appTheme = {
  font: 'var(--t-font-family)',
  text: 'var(--t-font-color-primary)',
  textSecondary: 'var(--t-font-color-secondary)',
  background: 'var(--t-background-primary)',
  border: 'var(--t-border-color-light)',
  danger: 'var(--t-color-red)',
  radius: 'var(--t-border-radius-sm)',
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
  spacing4: 'var(--t-spacing-4)',
} as const;

const openDocument = (documentId: string): void => {
  // NavigateFunction is positional: (to, params, queryParams, options)
  void navigate(AppPath.RecordShowPage, {
    objectNameSingular: 'documents',
    objectRecordId: documentId,
  });
};

const flattenNodes = (nodes: DocumentNode[]): DocumentNode[] => {
  const flattened: DocumentNode[] = [];

  for (const node of nodes) {
    flattened.push(node);
    flattened.push(
      ...flattenNodes(node.children?.edges?.map((edge) => edge.node) ?? []),
    );
  }

  return flattened;
};

const DocumentBrowser = () => {
  const [documents, setDocuments] = useState<DocumentNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(
    null,
  );

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);

    try {
      const client = new CoreApiClient();
      const result = (await client.query({
        documents: {
          __args: {
            filter: { parent: { is: 'NULL' } },
            orderBy: [{ position: 'AscNullsFirst' }, { title: 'Asc' }],
          },
          edges: {
            node: {
              id: true,
              title: true,
              kind: true,
              icon: true,
              isFavorite: true,
              archivedAt: true,
              position: true,
              children: {
                __args: {
                  orderBy: [{ position: 'AscNullsFirst' }, { title: 'Asc' }],
                },
                edges: {
                  node: {
                    id: true,
                    title: true,
                    kind: true,
                    icon: true,
                    isFavorite: true,
                    archivedAt: true,
                    position: true,
                  },
                },
              },
            },
          },
        },
      } as never)) as { documents?: { edges: { node: DocumentNode }[] } };

      setDocuments(result?.documents?.edges?.map((edge) => edge.node) ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  // Instantiation = copy the template body into a fresh DOCUMENT record, so
  // editing the copy never mutates the template.
  const instantiateTemplate = async (
    templateDocument: DocumentNode,
  ): Promise<void> => {
    const client = new CoreApiClient();
    const copyPayload = buildTemplateCopyPayload(templateDocument);

    await client.mutation({
      createDocuments: {
        __args: {
          data: [
            {
              title: copyPayload.title,
              kind: copyPayload.kind,
              position: copyPayload.position,
              content: copyPayload.content,
            },
          ],
        },
        id: true,
      },
    } as never);

    await loadDocuments();
  };

  const createChild = async (
    parentDocumentId: string | null,
  ): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      createDocuments: {
        __args: {
          data: [
            {
              title: 'Nouveau document',
              ...(parentDocumentId === null
                ? { position: buildAppendPosition(lastRootPosition(documents)) }
                : {
                    parentDocumentId,
                    position: buildAppendPosition(
                      lastChildPosition(documents, parentDocumentId),
                    ),
                  }),
            },
          ],
        },
        id: true,
      },
    } as never);

    await loadDocuments();
  };

  // Drop semantics: dropping ON a node makes it a child (append last);
  // dropping BESIDE a node inserts at that index under the same parent.
  const moveDocument = async (options: {
    documentId: string;
    targetParentId: string | null;
    targetSiblings: TreeDocument[];
    insertIndex: number;
  }): Promise<void> => {
    const documentsById = collectDocumentsById(documents);

    let payload;

    try {
      payload = buildMoveDocumentPayload({
        documentId: options.documentId,
        targetParentId: options.targetParentId,
        targetSiblings: options.targetSiblings,
        insertIndex: options.insertIndex,
        documentsById,
      });
    } catch {
      return;
    }

    const client = new CoreApiClient();

    await client.mutation({
      updateDocument: {
        __args: { id: options.documentId, data: payload },
        id: true,
      },
    } as never);

    await loadDocuments();
  };

  const toggleFavorite = async (documentNode: DocumentNode): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      updateDocument: {
        __args: {
          id: documentNode.id,
          data: { isFavorite: !documentNode.isFavorite },
        },
        id: true,
      },
    } as never);

    await loadDocuments();
  };

  const archiveDocument = async (documentNode: DocumentNode): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      updateDocument: {
        __args: {
          id: documentNode.id,
          data: { archivedAt: new Date().toISOString() },
        },
        id: true,
      },
    } as never);

    await loadDocuments();
  };

  const restoreDocument = async (
    documentNode: DocumentNode,
    targetParentId: string | null,
  ): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      updateDocument: {
        __args: {
          id: documentNode.id,
          data: {
            archivedAt: null,
            parentDocumentId: targetParentId,
            position: buildAppendPosition(
              targetParentId === null
                ? lastRootPosition(documents)
                : lastChildPosition(documents, targetParentId),
            ),
          },
        },
        id: true,
      },
    } as never);

    await loadDocuments();
  };

  const destroyDocument = async (documentNode: DocumentNode): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      deleteDocument: {
        __args: { id: documentNode.id },
        id: true,
      },
    } as never);

    await loadDocuments();
  };

  // Shares snapshot the CURRENT body: later edits stay private until a new
  // link is created. v1 keeps shares unencrypted; passphrase UI arrives with
  // the share-management surface (typed DocumentShare mutation fields are not
  // in the generated CoreApiClient schema yet, hence the raw client call).
  const shareDocument = async (documentNode: DocumentNode): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      createDocumentShare: {
        __args: {
          createDocumentShareInput: {
            documentRecordId: documentNode.id,
            titleSnapshot: documentNode.title,
            bodySnapshot: documentNode.content?.blocknote ?? '',
          },
        },
        id: true,
        shareToken: true,
      },
    } as never);

    await loadDocuments();
  };

  const archivedNodes = useMemo(
    () => collectArchivedNodes(documents),
    [documents],
  );

  const searchableNodes = useMemo(() => flattenNodes(documents), [documents]);

  const matchingSearch = searchInput.trim().toLowerCase();

  return (
    <div
      style={{
        fontFamily: appTheme.font,
        color: appTheme.text,
        background: appTheme.background,
        padding: appTheme.spacing4,
        display: 'flex',
        flexDirection: 'column',
        gap: appTheme.spacing2,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>Documents</strong>
        <button
          type="button"
          onClick={() => createChild(null)}
          style={ghostButtonStyle}
        >
          + Nouveau
        </button>
      </div>
      <input
        type="search"
        placeholder="Recherche rapide…"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        style={searchInputStyle}
      />
      {isLoading ? (
        <p style={{ color: appTheme.textSecondary }}>Chargement…</p>
      ) : (
        <>
          {matchingSearch !== '' && (
            <DocumentSection title="Résultats">
              {searchableNodes
                .filter((node) =>
                  node.title.toLowerCase().includes(matchingSearch),
                )
                .map((node) => (
                  <DocumentRow
                    key={`search-${node.id}`}
                    documentNode={node}
                    onOpen={openDocument}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
            </DocumentSection>
          )}
          <DocumentSection title="Favoris">
            {searchableNodes.filter((node) => node.isFavorite).length === 0 ? (
              <DocumentEmpty label="Aucun favori" />
            ) : (
              searchableNodes
                .filter((node) => node.isFavorite)
                .map((node) => (
                  <DocumentRow
                    key={`favorite-${node.id}`}
                    documentNode={node}
                    onOpen={openDocument}
                    onToggleFavorite={toggleFavorite}
                  />
                ))
            )}
          </DocumentSection>
          <DocumentSection title="Arborescence">
            {documents.map((node) => (
              <DocumentTreeItem
                key={node.id}
                documentNode={node}
                depth={0}
                draggedDocumentId={draggedDocumentId}
                onDragStart={setDraggedDocumentId}
                onDragEnd={() => setDraggedDocumentId(null)}
                onOpen={openDocument}
                onCreateChild={createChild}
                onInstantiate={instantiateTemplate}
                onShare={shareDocument}
                onArchive={archiveDocument}
                onMove={moveDocument}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </DocumentSection>
          <DocumentSection title="Corbeille">
            {archivedNodes.length === 0 ? (
              <DocumentEmpty label="La corbeille est vide" />
            ) : (
              archivedNodes.map((node) => (
                <DocumentTrashRow
                  key={`trash-${node.id}`}
                  documentNode={node}
                  onRestore={restoreDocument}
                  onDestroy={destroyDocument}
                />
              ))
            )}
          </DocumentSection>
        </>
      )}
    </div>
  );
};

const lastRootPosition = (documents: DocumentNode[]): string | undefined =>
  documents[documents.length - 1]?.position ?? undefined;

const lastChildPosition = (
  documents: DocumentNode[],
  parentDocumentId: string,
): string | undefined => {
  const parentNode = documents.find((node) => node.id === parentDocumentId);
  const childNodes =
    parentNode?.children?.edges?.map((edge) => edge.node) ?? [];

  return childNodes[childNodes.length - 1]?.position ?? undefined;
};

const collectDocumentsById = (
  documents: DocumentNode[],
): Map<string, TreeDocument> => {
  const documentsById = new Map<string, TreeDocument>();

  for (const node of flattenNodes(documents)) {
    documentsById.set(node.id, {
      id: node.id,
      parentDocumentId: node.parentDocumentId ?? null,
      position: node.position ?? null,
    });
  }

  return documentsById;
};

const collectArchivedNodes = (documents: DocumentNode[]): DocumentNode[] =>
  flattenNodes(documents).filter((node) => node.archivedAt !== null);

const ghostButtonStyle = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--t-font-color-secondary)',
} as const;

const searchInputStyle = {
  border: `1px solid ${appTheme.border}`,
  borderRadius: appTheme.radius,
  background: 'transparent',
  color: appTheme.text,
  padding: appTheme.spacing1,
} as const;

type DocumentSectionProps = {
  title: string;
  children: React.ReactNode;
};

const DocumentSection = ({ title, children }: DocumentSectionProps) => (
  <section
    style={{ display: 'flex', flexDirection: 'column', gap: appTheme.spacing1 }}
  >
    <div
      style={{
        color: appTheme.textSecondary,
        fontSize: '0.8em',
        textTransform: 'uppercase',
      }}
    >
      {title}
    </div>
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>{children}</ul>
  </section>
);

const DocumentEmpty = ({ label }: { label: string }) => (
  <li style={{ color: appTheme.textSecondary, padding: appTheme.spacing1 }}>
    {label}
  </li>
);

type DocumentRowProps = {
  documentNode: DocumentNode;
  onOpen: (documentId: string) => void;
  onToggleFavorite: (documentNode: DocumentNode) => Promise<void>;
};

const DocumentRow = ({
  documentNode,
  onOpen,
  onToggleFavorite,
}: DocumentRowProps) => (
  <li style={{ padding: appTheme.spacing1 }}>
    <button
      type="button"
      onClick={() => onOpen(documentNode.id)}
      style={ghostButtonStyle}
    >
      {documentNode.kind === DOCUMENT_KIND.TEMPLATE ? '📄 ' : '📝 '}
      {documentNode.title}
    </button>
    <button
      type="button"
      onClick={() => onToggleFavorite(documentNode)}
      style={ghostButtonStyle}
      aria-label="Favori"
    >
      {documentNode.isFavorite ? '★' : '☆'}
    </button>
  </li>
);

type DocumentTreeItemProps = {
  documentNode: DocumentNode;
  depth: number;
  draggedDocumentId: string | null;
  onDragStart: (documentId: string) => void;
  onDragEnd: () => void;
  onOpen: (documentId: string) => void;
  onCreateChild: (parentDocumentId: string | null) => Promise<void>;
  onInstantiate: (templateDocument: DocumentNode) => Promise<void>;
  onShare: (documentNode: DocumentNode) => Promise<void>;
  onArchive: (documentNode: DocumentNode) => Promise<void>;
  onMove: (options: {
    documentId: string;
    targetParentId: string | null;
    targetSiblings: TreeDocument[];
    insertIndex: number;
  }) => Promise<void>;
  onToggleFavorite: (documentNode: DocumentNode) => Promise<void>;
};

const DocumentTreeItem = ({
  documentNode,
  depth,
  draggedDocumentId,
  onDragStart,
  onDragEnd,
  onOpen,
  onCreateChild,
  onInstantiate,
  onShare,
  onArchive,
  onMove,
  onToggleFavorite,
}: DocumentTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const childNodes =
    documentNode.children?.edges?.map((edge) => edge.node) ?? [];

  const handleDropOnSelf = async (event: React.DragEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    onDragEnd();

    const droppedId = event.dataTransfer.getData('text/a2e-document-id');

    if (droppedId === '' || droppedId === documentNode.id) {
      return;
    }

    await onMove({
      documentId: droppedId,
      targetParentId: documentNode.id,
      targetSiblings: childNodes,
      insertIndex: childNodes.length,
    });
  };

  return (
    <li
      style={{ padding: appTheme.spacing1 }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={handleDropOnSelf}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: appTheme.spacing1,
        }}
      >
        {childNodes.length > 0 ? (
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
            style={ghostButtonStyle}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{ width: '1em' }} />
        )}
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData('text/a2e-document-id', documentNode.id);
            onDragStart(documentNode.id);
          }}
          onDragEnd={onDragEnd}
          onClick={() => onOpen(documentNode.id)}
          style={ghostButtonStyle}
        >
          {documentNode.kind === DOCUMENT_KIND.TEMPLATE ? '📄 ' : '📝 '}
          {documentNode.title}
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(documentNode)}
          style={ghostButtonStyle}
          aria-label="Favori"
        >
          {documentNode.isFavorite ? '★' : '☆'}
        </button>
        <button
          type="button"
          onClick={() => onCreateChild(documentNode.id)}
          style={ghostButtonStyle}
        >
          + sous-document
        </button>
        {documentNode.kind === DOCUMENT_KIND.TEMPLATE ? (
          <button
            type="button"
            onClick={() => onInstantiate(documentNode)}
            style={ghostButtonStyle}
          >
            dupliquer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onShare(documentNode)}
            style={ghostButtonStyle}
          >
            partager
          </button>
        )}
        <button
          type="button"
          onClick={() => onArchive(documentNode)}
          style={ghostButtonStyle}
        >
          corbeille
        </button>
      </div>
      {isExpanded && (
        <ul
          style={{
            margin: 0,
            paddingLeft: appTheme.spacing4,
            listStyle: 'none',
          }}
          onDragOver={(event) => event.preventDefault()}
        >
          {childNodes.map((childNode, childIndex) => (
            <div
              key={childNode.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDragEnd();

                const droppedId = event.dataTransfer.getData(
                  'text/a2e-document-id',
                );

                if (droppedId === '' || droppedId === childNode.id) {
                  return;
                }

                void onMove({
                  documentId: droppedId,
                  targetParentId: documentNode.id,
                  targetSiblings: childNodes,
                  insertIndex: childIndex,
                });
              }}
            >
              <DocumentTreeItem
                documentNode={childNode}
                depth={depth + 1}
                draggedDocumentId={draggedDocumentId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onOpen={onOpen}
                onCreateChild={onCreateChild}
                onInstantiate={onInstantiate}
                onShare={onShare}
                onArchive={onArchive}
                onMove={onMove}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))}
        </ul>
      )}
    </li>
  );
};

type DocumentTrashRowProps = {
  documentNode: DocumentNode;
  onRestore: (
    documentNode: DocumentNode,
    targetParentId: string | null,
  ) => Promise<void>;
  onDestroy: (documentNode: DocumentNode) => Promise<void>;
};

const DocumentTrashRow = ({
  documentNode,
  onRestore,
  onDestroy,
}: DocumentTrashRowProps) => {
  const isExpired = isPastTrashRetention(documentNode.archivedAt);

  return (
    <li
      style={{
        padding: appTheme.spacing1,
        display: 'flex',
        gap: appTheme.spacing1,
      }}
    >
      <span style={{ color: appTheme.textSecondary }}>
        🗑 {documentNode.title}
        {isExpired ? ' (purge imminente)' : ''}
      </span>
      <button
        type="button"
        onClick={() => onRestore(documentNode, null)}
        style={ghostButtonStyle}
      >
        restaurer
      </button>
      <button
        type="button"
        onClick={() => onDestroy(documentNode)}
        style={{ ...ghostButtonStyle, color: appTheme.danger }}
      >
        supprimer définitivement
      </button>
    </li>
  );
};

export default defineFrontComponent({
  universalIdentifier: DOCUMENT_BROWSER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'document-browser',
  description:
    'Arborescence des documents : recherche, favoris, glisser-déposer, corbeille et partage.',
  component: DocumentBrowser,
});

export { OBJECT_IDS };
