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

import { DOCUMENT_KIND } from '../constants/field-vocabulary.ts';
import { buildAppendPosition } from '../lib/fractional-position.ts';
import { extractOutline } from '../lib/document-outline.ts';
import {
  buildTemplateCopyPayload,
  readAuthorizedTemplateCopySource,
} from '../lib/instantiate-template.ts';

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
  kind?: string | null;
  icon?: string | null;
  coverColor?: string | null;
  content?: {
    blocknote?: string | null;
    markdown?: string | null;
  } | null;
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
        kind: true,
        icon: true,
        coverColor: true,
        content: { blocknote: true, markdown: true },
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

  // First-open entrypoint: instantiating from the template's own page creates
  // the DOCUMENT copy and lands on it, so editing the copy can never mutate
  // the template (same contract as the browser's "utiliser" action).
  const instantiateTemplate = async (): Promise<void> => {
    if (record === null) {
      return;
    }

    const client = new CoreApiClient();
    const copySource = readAuthorizedTemplateCopySource(record);

    // The record was read through the caller's authorized query, so a null
    // source would mean the body is no longer readable — fail closed.
    if (copySource === null) {
      return;
    }

    const copyPayload = buildTemplateCopyPayload(copySource);

    const result = await client.mutation({
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

    const created = (
      result as {
        createDocuments?: { id?: string }[];
      }
    ).createDocuments?.[0];

    if (created?.id === undefined) {
      return;
    }

    await navigate(AppPath.RecordShowPage, {
      objectNameSingular: 'documents',
      objectRecordId: created.id,
    });
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
      {record?.kind === DOCUMENT_KIND.TEMPLATE && (
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: appTheme.spacing2,
            padding: appTheme.spacing2,
            border: `1px solid ${appTheme.border}`,
            borderRadius: appTheme.radius,
          }}
        >
          <span style={{ color: appTheme.textSecondary }}>
            Ceci est un modèle — le modifier ne touche pas les copies créées.
          </span>
          <button
            type="button"
            onClick={() => void instantiateTemplate()}
            style={{ ...ghostButtonStyle, color: appTheme.blue }}
          >
            Utiliser ce modèle
          </button>
        </section>
      )}
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
