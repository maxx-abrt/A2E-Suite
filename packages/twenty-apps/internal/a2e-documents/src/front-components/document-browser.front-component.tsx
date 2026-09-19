import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, copyToClipboard, navigate } from 'twenty-sdk/front-component';

import { DOCUMENT_KIND } from '../constants/field-vocabulary.ts';
import { OBJECT_IDS } from '../constants/universal-identifiers.ts';
import {
  buildCreateDocumentShareRequest,
  buildDocumentSharePath,
  buildExpiryIso,
  findDocumentShareForDocument,
  INITIAL_DOCUMENT_SHARE_PANEL_STATE,
  reduceDocumentSharePanel,
  type DocumentShareRecord,
} from '../lib/document-share-management.ts';
import { encryptShareBody } from '../lib/share-crypto.ts';
import {
  buildMoveDocumentPayload,
  collectDocumentsByIdFromSiblings,
  collectSiblingsByParentId,
  type TreeDocument,
} from '../lib/document-tree.ts';
import {
  buildKeyboardMovePayload,
  type TreeMoveDirection,
} from '../lib/document-tree-keyboard.ts';
import {
  hasNextChildrenPage,
  mergeTreeChildrenPage,
  needsInitialChildrenFetch,
  nestTreeFromChildrenMap,
  TREE_CHILDREN_PAGE_SIZE,
  type TreeChildrenPage,
  type TreeNestedNode,
  type TreeParentPageState,
} from '../lib/document-tree-loading.ts';
import { buildAppendPosition } from '../lib/fractional-position.ts';
import {
  buildTemplateCopyPayload,
  readAuthorizedTemplateCopySource,
} from '../lib/instantiate-template.ts';
import { collectGalleryTemplates } from '../lib/template-gallery.ts';
import {
  buildSaveAsTemplatePayload,
  buildTemplateDuplicatePayload,
} from '../lib/save-document-as-template.ts';
import { isPastTrashRetention } from '../lib/trash-retention.ts';

// LE NAVIGATEUR DE DOCUMENTS.
//
// Metadata views list flat records; the tree needs a recursive explorer, so
// this is the sanctioned front-component escape hatch (04-twenty-native-law
// §2 decision order, step 3: metadata views first, front component for the
// genuinely novel tree UX). Sections: quick search, favorites, tree
// (drag to reparent/reorder via fractional index), trash with restore —
// the 7-day purge itself runs as the purge-archived-documents cron.
//
// The tree loads lazily: only root pages are fetched up front, and expanding
// a node fetches that parent's children through its own cursor page. Deep
// trees therefore cost no more than the levels the user actually opens.

export const DOCUMENT_BROWSER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31a0000-0013-4000-8000-000000000001';

type DocumentNode = {
  id: string;
  title: string;
  kind: string;
  icon?: string | null;
  isFavorite: boolean;
  archivedAt: string | null;
  position?: string | null;
  content?: {
    blocknote?: string | null;
    markdown?: string | null;
  } | null;
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
    objectNameSingular: 'document',
    objectRecordId: documentId,
  });
};

// Siblings are ordered by the fractional index, then title, then id — the
// final id tiebreaker keeps cursor pages stable when position and title tie.
const SIBLING_ORDER_BY = [
  { position: 'AscNullsFirst' },
  { title: 'Asc' },
  { id: 'Asc' },
];

// A parent is filtered through the relation's target id, not the join column
// key: the workspace schema exposes `parent { id }` while a custom join column
// name (parentDocumentId) is not a valid filter key.
const fetchDocumentsPage = async (options: {
  parentId: string | null;
  after: string | null;
}): Promise<TreeChildrenPage<DocumentNode>> => {
  const client = new CoreApiClient();

  const filter =
    options.parentId === null
      ? { parent: { id: { is: 'NULL' } } }
      : { parent: { id: { eq: options.parentId } } };

  const result = (await client.query({
    documents: {
      __args: {
        filter,
        orderBy: SIBLING_ORDER_BY,
        first: TREE_CHILDREN_PAGE_SIZE,
        ...(options.after === null ? {} : { after: options.after }),
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
          content: { blocknote: true, markdown: true },
        },
      },
      pageInfo: { hasNextPage: true, endCursor: true },
    },
  } as never)) as {
    documents?: {
      edges?: { node: DocumentNode }[];
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    };
  };

  return {
    nodes: result?.documents?.edges?.map((edge) => edge.node) ?? [],
    hasNextPage: result?.documents?.pageInfo?.hasNextPage ?? false,
    endCursor: result?.documents?.pageInfo?.endCursor ?? null,
  };
};

type DocumentTreeNode = TreeNestedNode<DocumentNode>;

const flattenNodes = (nodes: DocumentTreeNode[]): DocumentTreeNode[] => {
  const flattened: DocumentTreeNode[] = [];

  for (const node of nodes) {
    flattened.push(node);
    flattened.push(
      ...flattenNodes(node.children?.edges?.map((edge) => edge.node) ?? []),
    );
  }

  return flattened;
};

type DocumentTreeState = {
  childrenByParentId: Map<string | null, DocumentNode[]>;
  pageStateByParentId: Map<string | null, TreeParentPageState>;
  loadingParentIds: Set<string | null>;
  expandedIds: Set<string>;
  onToggleExpanded: (documentId: string) => void;
  onLoadMoreChildren: (parentId: string | null) => void;
};

const DocumentBrowser = () => {
  const [childrenByParentId, setChildrenByParentId] = useState<
    Map<string | null, DocumentNode[]>
  >(new Map());
  const [pageStateByParentId, setPageStateByParentId] = useState<
    Map<string | null, TreeParentPageState>
  >(new Map());
  const [loadingParentIds, setLoadingParentIds] = useState<Set<string | null>>(
    new Set(),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(
    null,
  );
  const [shareTarget, setShareTarget] = useState<DocumentNode | null>(null);

  // Async readers (the page loader and the post-mutation reload) must observe
  // the latest maps without being re-created on every keystroke.
  const pageStateByParentIdRef = useRef(pageStateByParentId);
  const loadingParentIdsRef = useRef(loadingParentIds);
  const expandedIdsRef = useRef(expandedIds);

  const loadChildrenPage = useCallback(
    async (parentId: string | null, options?: { append?: boolean }) => {
      if (loadingParentIdsRef.current.has(parentId)) {
        return;
      }

      const isAppend = options?.append === true;
      const currentState = pageStateByParentIdRef.current.get(parentId);
      const after = isAppend ? (currentState?.endCursor ?? null) : null;

      loadingParentIdsRef.current = new Set([
        ...loadingParentIdsRef.current,
        parentId,
      ]);
      setLoadingParentIds(loadingParentIdsRef.current);

      try {
        const page = await fetchDocumentsPage({ parentId, after });

        setChildrenByParentId((current) => {
          const next = new Map(current);
          const loaded = isAppend ? (next.get(parentId) ?? []) : [];

          next.set(parentId, mergeTreeChildrenPage(loaded, page.nodes));

          return next;
        });

        pageStateByParentIdRef.current = new Map(
          pageStateByParentIdRef.current,
        ).set(parentId, {
          isLoaded: true,
          endCursor: page.endCursor,
          hasNextPage: page.hasNextPage,
        });
        setPageStateByParentId(pageStateByParentIdRef.current);
      } finally {
        const nextLoadingParentIds = new Set(loadingParentIdsRef.current);

        nextLoadingParentIds.delete(parentId);
        loadingParentIdsRef.current = nextLoadingParentIds;
        setLoadingParentIds(nextLoadingParentIds);
      }
    },
    [],
  );

  useEffect(() => {
    void loadChildrenPage(null);
  }, [loadChildrenPage]);

  // A mutation can move a node across parents or change sibling order, so the
  // cached pages are dropped and the roots plus the currently open levels are
  // refetched — collapsed subtrees stay unloaded.
  const reloadTree = useCallback(async () => {
    const expandedDocumentIds = [...expandedIdsRef.current];

    setChildrenByParentId(new Map());
    pageStateByParentIdRef.current = new Map();
    setPageStateByParentId(pageStateByParentIdRef.current);

    await loadChildrenPage(null);

    for (const documentId of expandedDocumentIds) {
      await loadChildrenPage(documentId);
    }
  }, [loadChildrenPage]);

  const toggleExpanded = useCallback(
    (documentId: string) => {
      const isCurrentlyExpanded = expandedIdsRef.current.has(documentId);
      const nextExpandedIds = new Set(expandedIdsRef.current);

      if (isCurrentlyExpanded) {
        nextExpandedIds.delete(documentId);
      } else {
        nextExpandedIds.add(documentId);
      }

      expandedIdsRef.current = nextExpandedIds;
      setExpandedIds(nextExpandedIds);

      if (
        !isCurrentlyExpanded &&
        needsInitialChildrenFetch(
          pageStateByParentIdRef.current.get(documentId),
        )
      ) {
        void loadChildrenPage(documentId);
      }
    },
    [loadChildrenPage],
  );

  const loadMoreChildren = useCallback(
    (parentId: string | null) => {
      void loadChildrenPage(parentId, { append: true });
    },
    [loadChildrenPage],
  );

  const treeState = useMemo<DocumentTreeState>(
    () => ({
      childrenByParentId,
      pageStateByParentId,
      loadingParentIds,
      expandedIds,
      onToggleExpanded: toggleExpanded,
      onLoadMoreChildren: loadMoreChildren,
    }),
    [
      childrenByParentId,
      pageStateByParentId,
      loadingParentIds,
      expandedIds,
      toggleExpanded,
      loadMoreChildren,
    ],
  );

  const documents = useMemo(
    () => nestTreeFromChildrenMap(childrenByParentId),
    [childrenByParentId],
  );
  const rootNodes = childrenByParentId.get(null) ?? [];

  const siblingsByParentId = useMemo(
    () => collectSiblingsByParentId(documents),
    [documents],
  );

  // Instantiation = copy the template body into a fresh DOCUMENT record, so
  // editing the copy never mutates the template. The body was fetched through
  // the caller's authorized tree query; a null source fails closed.
  const instantiateTemplate = async (
    templateDocument: DocumentNode,
  ): Promise<void> => {
    const client = new CoreApiClient();
    const copySource = readAuthorizedTemplateCopySource(templateDocument);

    if (copySource === null) {
      return;
    }

    const copyPayload = buildTemplateCopyPayload(copySource);

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

    await reloadTree();
  };

  // Save-as-template = copy the document body into a fresh TEMPLATE record:
  // promoting never moves the source, and editing either side afterwards
  // stays independent (C1 reuse contract).
  const saveDocumentAsTemplate = async (
    documentNode: DocumentNode,
  ): Promise<void> => {
    const client = new CoreApiClient();
    const templatePayload = buildSaveAsTemplatePayload(documentNode);

    await client.mutation({
      createDocuments: {
        __args: {
          data: [
            {
              title: templatePayload.title,
              kind: templatePayload.kind,
              position: templatePayload.position,
              content: templatePayload.content,
            },
          ],
        },
        id: true,
      },
    } as never);

    await reloadTree();
  };

  const duplicateTemplate = async (
    templateDocument: DocumentNode,
  ): Promise<void> => {
    const client = new CoreApiClient();
    const duplicatePayload = buildTemplateDuplicatePayload(templateDocument);

    await client.mutation({
      createDocuments: {
        __args: {
          data: [
            {
              title: duplicatePayload.title,
              kind: duplicatePayload.kind,
              position: duplicatePayload.position,
              content: duplicatePayload.content,
            },
          ],
        },
        id: true,
      },
    } as never);

    await reloadTree();
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
                    parentId: parentDocumentId,
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

    await reloadTree();
  };

  // Drop semantics: dropping ON a node makes it a child (append last);
  // dropping BESIDE a node inserts at that index under the same parent.
  const moveDocument = async (options: {
    documentId: string;
    targetParentId: string | null;
    targetSiblings: TreeDocument[];
    insertIndex: number;
  }): Promise<void> => {
    const documentsById = collectDocumentsByIdFromSiblings(siblingsByParentId);

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
        __args: {
          id: options.documentId,
          data: {
            parentId: payload.parentDocumentId,
            position: payload.position,
          },
        },
        id: true,
      },
    } as never);

    await reloadTree();
  };

  // Non-drag equivalent of the drop handlers, for keyboard users (C7). The
  // payload builder returns null at the bounds so the buttons stay inert there.
  const moveDocumentByKeyboard = async (
    documentNode: DocumentNode,
    parentId: string | null,
    direction: TreeMoveDirection,
  ): Promise<void> => {
    const payload = buildKeyboardMovePayload({
      documentId: documentNode.id,
      direction,
      parentId,
      siblingsByParentId,
    });

    if (payload === null) {
      return;
    }

    const client = new CoreApiClient();

    await client.mutation({
      updateDocument: {
        __args: {
          id: documentNode.id,
          data: {
            parentId: payload.parentDocumentId,
            position: payload.position,
          },
        },
        id: true,
      },
    } as never);

    await reloadTree();
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

    await reloadTree();
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

    await reloadTree();
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
            parentId: targetParentId,
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

    await reloadTree();
  };

  const destroyDocument = async (documentNode: DocumentNode): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      deleteDocument: {
        __args: { id: documentNode.id },
        id: true,
      },
    } as never);

    await reloadTree();
  };

  const archivedNodes = useMemo(
    () => collectArchivedNodes(documents),
    [documents],
  );

  const searchableNodes = useMemo(() => flattenNodes(documents), [documents]);

  const galleryTemplates = useMemo(
    () => collectGalleryTemplates(searchableNodes),
    [searchableNodes],
  );

  const matchingSearch = searchInput.trim().toLowerCase();
  const isLoadingRoots = rootNodes.length === 0 && loadingParentIds.has(null);

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
      {shareTarget !== null && (
        <DocumentSharePanel
          documentNode={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
      {isLoadingRoots ? (
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
          <DocumentSection title="Modèles">
            {galleryTemplates.length === 0 ? (
              <DocumentEmpty label="Aucun modèle — créez-en un depuis l'arborescence" />
            ) : (
              galleryTemplates.map((templateNode) => (
                <DocumentRow
                  key={`gallery-${templateNode.id}`}
                  documentNode={templateNode}
                  onOpen={openDocument}
                  onToggleFavorite={toggleFavorite}
                  onInstantiate={instantiateTemplate}
                />
              ))
            )}
          </DocumentSection>
          <DocumentSection title="Arborescence">
            {rootNodes.map((node) => (
              <DocumentTreeItem
                key={node.id}
                documentNode={node}
                depth={0}
                parentId={null}
                treeState={treeState}
                draggedDocumentId={draggedDocumentId}
                onDragStart={setDraggedDocumentId}
                onDragEnd={() => setDraggedDocumentId(null)}
                onOpen={openDocument}
                onCreateChild={createChild}
                onInstantiate={instantiateTemplate}
                onSaveAsTemplate={saveDocumentAsTemplate}
                onDuplicateTemplate={duplicateTemplate}
                onShare={setShareTarget}
                onArchive={archiveDocument}
                onMove={moveDocument}
                onKeyboardMove={moveDocumentByKeyboard}
                onToggleFavorite={toggleFavorite}
              />
            ))}
            {hasNextChildrenPage(pageStateByParentId.get(null)) && (
              <li style={{ padding: appTheme.spacing1 }}>
                <button
                  type="button"
                  onClick={() => loadMoreChildren(null)}
                  style={ghostButtonStyle}
                >
                  Charger plus
                </button>
              </li>
            )}
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

const lastRootPosition = (documents: DocumentTreeNode[]): string | undefined =>
  documents[documents.length - 1]?.position ?? undefined;

const lastChildPosition = (
  documents: DocumentTreeNode[],
  parentDocumentId: string,
): string | undefined => {
  const parentNode = flattenNodes(documents).find(
    (node) => node.id === parentDocumentId,
  );
  const childNodes =
    parentNode?.children?.edges?.map((edge) => edge.node) ?? [];

  return childNodes[childNodes.length - 1]?.position ?? undefined;
};

const collectArchivedNodes = (
  documents: DocumentTreeNode[],
): DocumentTreeNode[] =>
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

const sharePanelStyle = {
  border: `1px solid ${appTheme.border}`,
  borderRadius: appTheme.radius,
  display: 'flex',
  flexDirection: 'column',
  gap: appTheme.spacing1,
  padding: appTheme.spacing2,
} as const;

type DocumentSharePanelProps = {
  documentNode: DocumentNode;
  onClose: () => void;
};

// Owner-side share management: the passphrase never leaves the browser (the
// body is encrypted before upload), and the returned token is what the owner
// displays, copies and later revokes.
const DocumentSharePanel = ({
  documentNode,
  onClose,
}: DocumentSharePanelProps) => {
  const [panelState, dispatch] = useReducer(
    reduceDocumentSharePanel,
    INITIAL_DOCUMENT_SHARE_PANEL_STATE,
  );
  const [passphrase, setPassphrase] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // An owner who already shared this document must see that link, otherwise
  // create would fail ALREADY_EXISTS with no way to revoke. The lookup is
  // best-effort: a failure still leaves the create form available.
  useEffect(() => {
    let isCancelled = false;

    dispatch({ type: 'loadStarted' });

    void (async () => {
      const client = new CoreApiClient();

      try {
        const result = (await client.query({
          findManyDocumentShares: {
            id: true,
            shareToken: true,
            documentRecordId: true,
            expiresAt: true,
            isPassphraseProtected: true,
            createdAt: true,
          },
        } as never)) as { findManyDocumentShares?: DocumentShareRecord[] };

        if (isCancelled) {
          return;
        }

        dispatch({
          type: 'loadSucceeded',
          share: findDocumentShareForDocument(
            result?.findManyDocumentShares ?? [],
            documentNode.id,
          ),
        });
      } catch {
        if (!isCancelled) {
          dispatch({ type: 'loadSucceeded', share: null });
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [documentNode.id]);

  const handleCreate = async (): Promise<void> => {
    dispatch({ type: 'createStarted' });

    const client = new CoreApiClient();

    try {
      const request = await buildCreateDocumentShareRequest({
        documentRecordId: documentNode.id,
        titleSnapshot: documentNode.title,
        bodySnapshot: documentNode.content?.blocknote ?? '',
        passphrase,
        expiresAt: buildExpiryIso(expiryDate),
        encryptShareBody,
      });

      const result = (await client.mutation({
        createDocumentShare: {
          __args: { createDocumentShareInput: request },
          id: true,
          shareToken: true,
          isPassphraseProtected: true,
          expiresAt: true,
        },
      } as never)) as {
        createDocumentShare?: {
          shareToken: string;
          isPassphraseProtected: boolean;
          expiresAt: string | null;
        };
      };

      const createdShare = result?.createDocumentShare;

      if (createdShare === undefined) {
        throw new Error('missing share');
      }

      dispatch({
        type: 'createSucceeded',
        share: {
          shareToken: createdShare.shareToken,
          isPassphraseProtected: createdShare.isPassphraseProtected,
          expiresAt: createdShare.expiresAt,
        },
      });
    } catch {
      dispatch({ type: 'failed', message: 'La création du lien a échoué.' });
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (panelState.shareToken === null) {
      return;
    }

    try {
      await copyToClipboard(buildDocumentSharePath(panelState.shareToken));
      dispatch({ type: 'copySucceeded' });
    } catch {
      dispatch({ type: 'failed', message: 'La copie a échoué.' });
    }
  };

  const handleRevoke = async (): Promise<void> => {
    if (panelState.shareToken === null) {
      return;
    }

    dispatch({ type: 'revokeStarted' });

    const client = new CoreApiClient();

    try {
      await client.mutation({
        deleteDocumentShare: {
          __args: { shareToken: panelState.shareToken },
        },
      } as never);

      dispatch({ type: 'revokeSucceeded' });
    } catch {
      dispatch({ type: 'failed', message: 'La révocation a échoué.' });
    }
  };

  const isBusy =
    panelState.status === 'creating' || panelState.status === 'revoking';

  return (
    <section style={sharePanelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>Partager « {documentNode.title} »</strong>
        <button type="button" onClick={onClose} style={ghostButtonStyle}>
          fermer
        </button>
      </div>
      {panelState.status === 'loading' ? (
        <span style={{ color: appTheme.textSecondary }}>
          Chargement du lien…
        </span>
      ) : panelState.shareToken !== null ? (
        <>
          {panelState.isExisting && (
            <span style={{ color: appTheme.textSecondary }}>
              Un lien existe déjà pour ce document.
            </span>
          )}
          <input
            type="text"
            readOnly
            aria-label="Lien de partage"
            value={buildDocumentSharePath(panelState.shareToken)}
            style={searchInputStyle}
          />
          <span style={{ color: appTheme.textSecondary }}>
            {panelState.isPassphraseProtected
              ? 'Protégé par une phrase secrète'
              : 'Sans phrase secrète'}
            {panelState.expiresAt === null
              ? ''
              : ` — expire le ${panelState.expiresAt.slice(0, 10)}`}
          </span>
          <div style={{ display: 'flex', gap: appTheme.spacing2 }}>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleCopy()}
              style={ghostButtonStyle}
            >
              {panelState.hasCopied ? 'copié' : 'copier'}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleRevoke()}
              style={{ ...ghostButtonStyle, color: appTheme.danger }}
            >
              révoquer
            </button>
          </div>
        </>
      ) : (
        <>
          <label style={{ color: appTheme.textSecondary }}>
            Phrase secrète (facultative)
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              style={searchInputStyle}
            />
          </label>
          <label style={{ color: appTheme.textSecondary }}>
            Expiration (facultative)
            <input
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              style={searchInputStyle}
            />
          </label>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleCreate()}
            style={ghostButtonStyle}
          >
            {panelState.status === 'creating'
              ? 'Création…'
              : 'Créer le lien de partage'}
          </button>
          <span style={{ color: appTheme.textSecondary }}>
            La phrase secrète est chiffrée dans le navigateur et n’est jamais
            transmise.
          </span>
        </>
      )}
      {panelState.error !== null && (
        <span style={{ color: appTheme.danger }}>{panelState.error}</span>
      )}
    </section>
  );
};

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
  onInstantiate?: (templateDocument: DocumentNode) => Promise<void>;
};

const DocumentRow = ({
  documentNode,
  onOpen,
  onToggleFavorite,
  onInstantiate,
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
    {documentNode.kind === DOCUMENT_KIND.TEMPLATE && onInstantiate && (
      <button
        type="button"
        onClick={() => void onInstantiate(documentNode)}
        style={ghostButtonStyle}
      >
        utiliser
      </button>
    )}
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
  parentId: string | null;
  treeState: DocumentTreeState;
  draggedDocumentId: string | null;
  onDragStart: (documentId: string) => void;
  onDragEnd: () => void;
  onOpen: (documentId: string) => void;
  onCreateChild: (parentDocumentId: string | null) => Promise<void>;
  onInstantiate: (templateDocument: DocumentNode) => Promise<void>;
  onSaveAsTemplate: (documentNode: DocumentNode) => Promise<void>;
  onDuplicateTemplate: (templateDocument: DocumentNode) => Promise<void>;
  onShare: (documentNode: DocumentNode) => void;
  onArchive: (documentNode: DocumentNode) => Promise<void>;
  onMove: (options: {
    documentId: string;
    targetParentId: string | null;
    targetSiblings: TreeDocument[];
    insertIndex: number;
  }) => Promise<void>;
  onKeyboardMove: (
    documentNode: DocumentNode,
    parentId: string | null,
    direction: TreeMoveDirection,
  ) => Promise<void>;
  onToggleFavorite: (documentNode: DocumentNode) => Promise<void>;
};

const DocumentTreeItem = ({
  documentNode,
  depth,
  parentId,
  treeState,
  draggedDocumentId,
  onDragStart,
  onDragEnd,
  onOpen,
  onCreateChild,
  onInstantiate,
  onSaveAsTemplate,
  onDuplicateTemplate,
  onShare,
  onArchive,
  onMove,
  onKeyboardMove,
  onToggleFavorite,
}: DocumentTreeItemProps) => {
  const childNodes = treeState.childrenByParentId.get(documentNode.id) ?? [];
  const isExpanded = treeState.expandedIds.has(documentNode.id);
  const areChildrenLoading = treeState.loadingParentIds.has(documentNode.id);
  const hasMoreChildren = hasNextChildrenPage(
    treeState.pageStateByParentId.get(documentNode.id),
  );

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
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={`Afficher les sous-documents de ${documentNode.title}`}
          onClick={() => treeState.onToggleExpanded(documentNode.id)}
          style={ghostButtonStyle}
        >
          {isExpanded ? '▾' : '▸'}
        </button>
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
          onClick={() => void onKeyboardMove(documentNode, parentId, 'up')}
          style={ghostButtonStyle}
          aria-label={`Monter ${documentNode.title}`}
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => void onKeyboardMove(documentNode, parentId, 'down')}
          style={ghostButtonStyle}
          aria-label={`Descendre ${documentNode.title}`}
        >
          ▼
        </button>
        <button
          type="button"
          onClick={() => void onKeyboardMove(documentNode, parentId, 'indent')}
          style={ghostButtonStyle}
          aria-label={`Indenter ${documentNode.title}`}
        >
          ⇥
        </button>
        <button
          type="button"
          onClick={() => void onKeyboardMove(documentNode, parentId, 'outdent')}
          style={ghostButtonStyle}
          aria-label={`Désindenter ${documentNode.title}`}
        >
          ⇤
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
          <>
            <button
              type="button"
              onClick={() => onInstantiate(documentNode)}
              style={ghostButtonStyle}
            >
              utiliser
            </button>
            <button
              type="button"
              onClick={() => onDuplicateTemplate(documentNode)}
              style={ghostButtonStyle}
            >
              dupliquer
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSaveAsTemplate(documentNode)}
              style={ghostButtonStyle}
            >
              créer un modèle
            </button>
            <button
              type="button"
              onClick={() => onShare(documentNode)}
              style={ghostButtonStyle}
            >
              partager
            </button>
          </>
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
                parentId={documentNode.id}
                treeState={treeState}
                draggedDocumentId={draggedDocumentId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onOpen={onOpen}
                onCreateChild={onCreateChild}
                onInstantiate={onInstantiate}
                onSaveAsTemplate={onSaveAsTemplate}
                onDuplicateTemplate={onDuplicateTemplate}
                onShare={onShare}
                onArchive={onArchive}
                onMove={onMove}
                onKeyboardMove={onKeyboardMove}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))}
          {areChildrenLoading && (
            <li style={{ color: appTheme.textSecondary }}>Chargement…</li>
          )}
          {hasMoreChildren && (
            <li>
              <button
                type="button"
                onClick={() => treeState.onLoadMoreChildren(documentNode.id)}
                style={ghostButtonStyle}
              >
                Charger plus
              </button>
            </li>
          )}
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
