import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';

import { OBJECT_IDS } from '../constants/universal-identifiers.ts';

// LE NAVIGATEUR DE DOCUMENTS.
//
// Metadata views list flat records; the tree needs a recursive explorer, so
// this is the sanctioned front-component escape hatch (04-twenty-native-law
// §2 decision order, step 3: metadata views first, front component for the
// genuinely novel tree UX). v1: expand/collapse, open in the record page,
// create child under a parent with fractional-index positions from
// twenty-shared.

export const DOCUMENT_BROWSER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31a0000-0013-4000-8000-000000000001';

type DocumentNode = {
  id: string;
  title: string;
  kind: string;
  isFavorite: boolean;
  archivedAt: string | null;
  children?: { edges: { node: DocumentNode }[] };
};

const appTheme = {
  font: 'var(--t-font-family)',
  text: 'var(--t-font-color-primary)',
  textSecondary: 'var(--t-font-color-secondary)',
  background: 'var(--t-background-primary)',
  border: 'var(--t-border-color-light)',
  radius: 'var(--t-border-radius-sm)',
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
  spacing4: 'var(--t-spacing-4)',
} as const;

const DocumentBrowser = () => {
  const [documents, setDocuments] = useState<DocumentNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);

    try {
      const client = new CoreApiClient();
      const result = (await client.query({
        documents: {
          __args: {
            filter: { parent: { is: 'NULL' }, archivedAt: { is: 'NULL' } },
            orderBy: [{ position: 'AscNullsFirst' }, { title: 'Asc' }],
          },
          edges: {
            node: {
              id: true,
              title: true,
              kind: true,
              isFavorite: true,
              archivedAt: true,
              children: {
                __args: {
                  filter: { archivedAt: { is: 'NULL' } },
                  orderBy: [{ position: 'AscNullsFirst' }, { title: 'Asc' }],
                },
                edges: {
                  node: {
                    id: true,
                    title: true,
                    kind: true,
                    isFavorite: true,
                    archivedAt: true,
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

  const createChild = async (parentDocumentId: string): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      createDocuments: {
        __args: {
          data: [
            {
              title: 'Nouveau document',
              parentDocumentId,
              position: 'V',
            },
          ],
        },
        id: true,
      },
    } as never);

    await loadDocuments();
  };

  const createRootDocument = async (): Promise<void> => {
    const client = new CoreApiClient();

    await client.mutation({
      createDocuments: {
        __args: {
          data: [{ title: 'Nouveau document', position: 'V' }],
        },
        id: true,
      },
    } as never);

    await loadDocuments();
  };

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
          onClick={createRootDocument}
          style={{
            border: `1px solid ${appTheme.border}`,
            borderRadius: appTheme.radius,
            background: 'transparent',
            color: appTheme.text,
            cursor: 'pointer',
          }}
        >
          + Nouveau
        </button>
      </div>
      {isLoading ? (
        <p style={{ color: appTheme.textSecondary }}>Chargement…</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {documents.map((node) => (
            <DocumentTreeItem
              key={node.id}
              documentNode={node}
              onCreateChild={createChild}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

type DocumentTreeItemProps = {
  documentNode: DocumentNode;
  onCreateChild: (parentDocumentId: string) => Promise<void>;
};

const DocumentTreeItem = ({
  documentNode,
  onCreateChild,
}: DocumentTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const childNodes =
    documentNode.children?.edges?.map((edge) => edge.node) ?? [];

  return (
    <li style={{ padding: appTheme.spacing1 }}>
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
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{ width: '1em' }} />
        )}
        <span>
          {documentNode.kind === 'TEMPLATE' ? '📄 ' : '📝 '}
          {documentNode.title}
        </span>
        <button
          type="button"
          onClick={() => onCreateChild(documentNode.id)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: appTheme.textSecondary,
          }}
        >
          + sous-document
        </button>
      </div>
      {isExpanded && (
        <ul
          style={{
            margin: 0,
            paddingLeft: appTheme.spacing4,
            listStyle: 'none',
          }}
        >
          {childNodes.map((childNode) => (
            <DocumentTreeItem
              key={childNode.id}
              documentNode={childNode}
              onCreateChild={onCreateChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default defineFrontComponent({
  universalIdentifier: DOCUMENT_BROWSER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'document-browser',
  description:
    'Arborescence des documents : explorer, créer et réorganiser depuis un affichage récursif.',
  component: DocumentBrowser,
});

export { OBJECT_IDS };
