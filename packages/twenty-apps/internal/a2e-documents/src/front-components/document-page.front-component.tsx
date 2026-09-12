import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  navigate,
  openSidePanelPage,
  SidePanelPages,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { buildAppendPosition } from '../lib/fractional-position.ts';
import { extractOutline } from '../lib/document-outline.ts';

// LA PAGE DOCUMENT (P3.3 task 2).
//
// The record page already renders the title (Fields widget) and the blocknote
// editor (FIELD_RICH_TEXT widget) at an addressable URL
// (AppPath.RecordShowPage). This widget adds the Notion-like page furniture
// the metadata widgets cannot provide: the color cover, the heading outline
// extracted from the markdown projection, and the child pages list with
// inline creation. It reads the current document id from the host-provided
// selected record ids (FrontComponentWidgetRenderer passes the record page
// record).

export const DOCUMENT_PAGE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31a0000-0013-4000-8000-000000000002';

type DocumentChildNode = {
  id: string;
  title: string;
  icon?: string | null;
};

type DocumentPageRecord = {
  id: string;
  title: string;
  icon?: string | null;
  coverColor?: string | null;
  content?: { markdown?: string | null } | null;
  children?: { edges: { node: DocumentChildNode }[] };
};

const appTheme = {
  font: 'var(--t-font-family)',
  text: 'var(--t-font-color-primary)',
  textSecondary: 'var(--t-font-color-secondary)',
  border: 'var(--t-border-color-light)',
  blue: 'var(--t-color-blue)',
  radius: 'var(--t-border-radius-sm)',
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
  spacing4: 'var(--t-spacing-4)',
} as const;

const COVER_HEIGHT = '96px';
const COVER_FALLBACK = 'var(--t-color-blue)';

const openDocument = (documentId: string): void => {
  // NavigateFunction is positional: (to, params, queryParams, options)
  void navigate(AppPath.RecordShowPage, {
    objectNameSingular: 'documents',
    objectRecordId: documentId,
  });
};

const openDocumentInSidePanel = (documentId: string): void => {
  void openSidePanelPage({
    page: SidePanelPages.ViewRecord,
    recordId: documentId,
    objectNameSingular: 'documents',
    pageTitle: 'Document',
  });
};

const sectionTitleStyle = {
  color: appTheme.textSecondary,
  fontSize: '0.8em',
  textTransform: 'uppercase',
} as const;

const ghostButtonStyle = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
} as const;

const DocumentPage = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const documentId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const [record, setRecord] = useState<DocumentPageRecord | null>(null);

  const loadRecord = useCallback(async () => {
    if (documentId === null) {
      setRecord(null);
      return;
    }

    const client = new CoreApiClient();

    const result = await client.query({
      document: {
        __args: { id: documentId },
        id: true,
        title: true,
        icon: true,
        coverColor: true,
        content: true,
        children: { edges: { node: { id: true, title: true, icon: true } } },
      },
    } as never);

    setRecord(
      (result as { document?: DocumentPageRecord | null }).document ?? null,
    );
  }, [documentId]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  const outline = extractOutline(record?.content?.markdown);

  const createChildPage = async (): Promise<void> => {
    if (documentId === null) {
      return;
    }

    const client = new CoreApiClient();

    await client.mutation({
      createDocuments: {
        __args: {
          data: [
            {
              title: 'Nouvelle sous-page',
              parentDocumentId: documentId,
              position: buildAppendPosition(undefined),
            },
          ],
        },
        id: true,
      },
    } as never);

    await loadRecord();
  };

  if (documentId === null) {
    return null;
  }

  const childNodes = record?.children?.edges ?? [];

  return (
    <div
      style={{
        fontFamily: appTheme.font,
        color: appTheme.text,
        display: 'flex',
        flexDirection: 'column',
        gap: appTheme.spacing4,
      }}
    >
      <div
        style={{
          height: COVER_HEIGHT,
          borderRadius: appTheme.radius,
          background: record?.coverColor || COVER_FALLBACK,
          opacity: record?.coverColor ? 1 : 0.15,
        }}
      />
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: appTheme.spacing1,
        }}
      >
        <div style={sectionTitleStyle}>Plan</div>
        {outline.length === 0 ? (
          <span style={{ color: appTheme.textSecondary }}>
            Aucun titre dans ce document
          </span>
        ) : (
          outline.map((entry, index) => (
            <div
              key={`outline-${index}`}
              style={{
                paddingLeft: `${(entry.level - 1) * 12}px`,
                color: appTheme.textSecondary,
              }}
            >
              {entry.text}
            </div>
          ))
        )}
      </section>
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: appTheme.spacing1,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            ...sectionTitleStyle,
          }}
        >
          <span>Sous-pages</span>
          <button
            type="button"
            onClick={() => void createChildPage()}
            style={{ ...ghostButtonStyle, color: appTheme.blue }}
          >
            + Ajouter
          </button>
        </div>
        {childNodes.length === 0 ? (
          <span style={{ color: appTheme.textSecondary }}>
            Aucune sous-page
          </span>
        ) : (
          childNodes.map((edge) => (
            <div
              key={edge.node.id}
              style={{ display: 'flex', gap: appTheme.spacing1 }}
            >
              <button
                type="button"
                onClick={() => openDocument(edge.node.id)}
                style={{ ...ghostButtonStyle, color: appTheme.text }}
              >
                {edge.node.icon ?? '📄'} {edge.node.title}
              </button>
              <button
                type="button"
                onClick={() => openDocumentInSidePanel(edge.node.id)}
                style={{ ...ghostButtonStyle, color: appTheme.textSecondary }}
                aria-label={`Ouvrir ${edge.node.title} dans le panneau latéral`}
              >
                panneau
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: DOCUMENT_PAGE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'document-page',
  description:
    'Couverture, plan des titres et sous-pages sur la page d’un document.',
  component: DocumentPage,
});
