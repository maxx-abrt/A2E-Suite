import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  navigate,
  openSidePanelPage,
  SidePanelPages,
  useSelectedRecordIds,
  useUserId,
} from 'twenty-sdk/front-component';

import { DOCUMENT_KIND } from '../constants/field-vocabulary.ts';
import {
  buildBreadcrumbTrail,
  type DocumentBreadcrumbNode,
} from '../lib/document-breadcrumbs.ts';
import {
  buildDocumentChromeUpdatePayload,
  DOCUMENT_COVER_COLOR_CHOICES,
  readDocumentChromePreferences,
  resolveDocumentCover,
  type DocumentChromePatch,
} from '../lib/document-chrome.ts';
import {
  buildDocumentFavoriteToggle,
  mapDocumentFavoriteRecords,
  type DocumentFavoriteRecord,
} from '../lib/document-favorites.ts';
import {
  DOCUMENT_PAGE_ICON_CHOICES,
  resolveDocumentPageIcon,
} from '../lib/document-page-icons.ts';
import {
  countDocumentCharacters,
  countDocumentWords,
} from '../lib/document-word-count.ts';
import { buildFindOneByIdArgs } from '../lib/find-one-record-args.ts';
import { buildAppendPosition } from '../lib/fractional-position.ts';
import { extractOutline } from '../lib/document-outline.ts';
import {
  buildTemplateCopyPayload,
  readAuthorizedTemplateCopySource,
} from '../lib/instantiate-template.ts';

// LA PAGE DOCUMENT (P3.3 task 2, M8c chrome).
//
// The record page already renders the title (Fields widget) and the blocknote
// editor (FIELD_RICH_TEXT widget) at an addressable URL
// (AppPath.RecordShowPage). This widget adds the Notion-like page furniture the
// metadata widgets cannot provide: breadcrumbs from the tree, the page icon and
// cover, the reading controls (full width / small text), the last-edited line,
// the word count, per-member favourites and a managed page lock, plus the
// heading outline and the child pages list with inline creation. It reads the
// current document id from the host-provided selected record ids
// (FrontComponentWidgetRenderer passes the record page record).
//
// The chrome fields are app-owned standalone manifests (src/fields, no server
// migration) and are presentation-only (C5). The lock gates only these write
// controls; it never touches the content or its revision token, so the durable
// save contract (P3.2) is unaffected.

export const DOCUMENT_PAGE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31a0000-0013-4000-8000-000000000002';

type DocumentChildNode = {
  id: string;
  title: string;
  icon?: string | null;
};

type DocumentParentNode = {
  id: string;
};

type DocumentPageRecord = {
  id: string;
  title: string;
  kind?: string | null;
  icon?: string | null;
  coverColor?: string | null;
  coverImage?: string | null;
  isFullWidth?: boolean | null;
  isSmallText?: boolean | null;
  isLocked?: boolean | null;
  updatedAt?: string | null;
  updatedBy?: { name?: string | null } | null;
  content?: {
    blocknote?: string | null;
    markdown?: string | null;
  } | null;
  children?: { edges: { node: DocumentChildNode }[] };
  parent?: DocumentParentNode | null;
};

type AncestorRecord = {
  id: string;
  title: string;
  parent?: DocumentParentNode | null;
};

const appTheme = {
  font: 'var(--t-font-family)',
  text: 'var(--t-font-color-primary)',
  textSecondary: 'var(--t-font-color-secondary)',
  border: 'var(--t-border-color-light)',
  blue: 'var(--t-color-blue)',
  danger: 'var(--t-color-red)',
  radius: 'var(--t-border-radius-sm)',
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
  spacing4: 'var(--t-spacing-4)',
} as const;

const COVER_HEIGHT = '96px';
const COVER_FALLBACK = 'var(--t-color-blue)';
const MAX_ANCESTOR_DEPTH = 32;
const WIDE_MEASURE = '960px';
const NARROW_MEASURE = '720px';
const SMALL_TEXT_SCALE = '0.875em';

const openDocument = (documentId: string): void => {
  // NavigateFunction is positional: (to, params, queryParams, options)
  void navigate(AppPath.RecordShowPage, {
    objectNameSingular: 'document',
    objectRecordId: documentId,
  });
};

const openDocumentInSidePanel = (documentId: string): void => {
  void openSidePanelPage({
    page: SidePanelPages.ViewRecord,
    recordId: documentId,
    objectNameSingular: 'document',
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

const controlButtonStyle = {
  border: `1px solid ${appTheme.border}`,
  borderRadius: appTheme.radius,
  background: 'transparent',
  color: appTheme.text,
  cursor: 'pointer',
  padding: `${appTheme.spacing1} ${appTheme.spacing2}`,
} as const;

const textInputStyle = {
  border: `1px solid ${appTheme.border}`,
  borderRadius: appTheme.radius,
  background: 'transparent',
  color: appTheme.text,
  padding: appTheme.spacing1,
} as const;

const fetchDocumentRecord = async (
  documentId: string,
): Promise<DocumentPageRecord | null> => {
  const client = new CoreApiClient();

  const result = await client.query({
    document: {
      __args: buildFindOneByIdArgs(documentId),
      id: true,
      title: true,
      kind: true,
      icon: true,
      coverColor: true,
      coverImage: true,
      isFullWidth: true,
      isSmallText: true,
      isLocked: true,
      updatedAt: true,
      updatedBy: { name: true },
      content: { blocknote: true, markdown: true },
      children: { edges: { node: { id: true, title: true, icon: true } } },
      parent: { id: true },
    },
  } as never);

  return (
    (result as { document?: DocumentPageRecord | null }).document ?? null
  );
};

// Walk the parent relation upward one page at a time. A depth cap and a
// visited guard make a malformed or cyclic tree safe to render.
const fetchAncestorChain = async (
  firstParentId: string | null,
): Promise<Map<string, DocumentBreadcrumbNode>> => {
  const ancestorsById = new Map<string, DocumentBreadcrumbNode>();
  const client = new CoreApiClient();
  let parentId = firstParentId;
  let depth = 0;

  while (parentId !== null && depth < MAX_ANCESTOR_DEPTH) {
    if (ancestorsById.has(parentId)) {
      break;
    }

    const result = (await client.query({
      document: {
        __args: buildFindOneByIdArgs(parentId),
        id: true,
        title: true,
        parent: { id: true },
      },
    } as never)) as { document?: AncestorRecord | null };

    const ancestor = result?.document;

    if (ancestor === undefined || ancestor === null) {
      break;
    }

    ancestorsById.set(ancestor.id, {
      id: ancestor.id,
      title: ancestor.title,
      parentId: ancestor.parent?.id ?? null,
    });

    parentId = ancestor.parent?.id ?? null;
    depth += 1;
  }

  return ancestorsById;
};

const fetchFavoritesForDocument = async (
  userId: string,
  documentId: string,
): Promise<DocumentFavoriteRecord[]> => {
  const client = new CoreApiClient();

  const result = (await client.query({
    documentFavorites: {
      __args: {
        filter: {
          userId: { eq: userId },
          document: { id: { eq: documentId } },
        },
        first: 10,
      },
      edges: { node: { id: true, userId: true, document: { id: true } } },
    },
  } as never)) as {
    documentFavorites?: {
      edges?: {
        node: {
          id: string;
          userId?: string | null;
          document?: { id?: string | null } | null;
        };
      }[];
    };
  };

  return mapDocumentFavoriteRecords(
    result?.documentFavorites?.edges?.map((edge) => edge.node) ?? [],
  );
};

const DocumentPage = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const documentId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;
  const userId = useUserId();

  const [record, setRecord] = useState<DocumentPageRecord | null>(null);
  const [ancestorsById, setAncestorsById] = useState<
    Map<string, DocumentBreadcrumbNode>
  >(new Map());
  const [favorites, setFavorites] = useState<DocumentFavoriteRecord[]>([]);
  const [coverDraft, setCoverDraft] = useState('');

  const loadRecord = useCallback(async () => {
    if (documentId === null) {
      setRecord(null);
      setAncestorsById(new Map());
      setFavorites([]);
      return;
    }

    const nextRecord = await fetchDocumentRecord(documentId);

    setRecord(nextRecord);

    setAncestorsById(
      await fetchAncestorChain(nextRecord?.parent?.id ?? null),
    );

    if (userId !== null) {
      try {
        setFavorites(await fetchFavoritesForDocument(userId, documentId));
      } catch {
        // A failed favourite read must not blank the rest of the chrome.
        setFavorites([]);
      }
    }
  }, [documentId, userId]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  // One write path for every chrome control: send only the changed keys,
  // never the content or the revision token.
  const updateChrome = async (patch: DocumentChromePatch): Promise<void> => {
    if (documentId === null) {
      return;
    }

    const client = new CoreApiClient();

    await client.mutation({
      updateDocument: {
        __args: {
          id: documentId,
          data: buildDocumentChromeUpdatePayload(patch),
        },
        id: true,
      },
    } as never);

    await loadRecord();
  };

  const toggleFavorite = async (): Promise<void> => {
    if (documentId === null) {
      return;
    }

    const toggle = buildDocumentFavoriteToggle({
      favorites,
      userId,
      documentId,
    });

    if (toggle.action === 'none') {
      return;
    }

    const client = new CoreApiClient();

    if (toggle.action === 'delete') {
      await client.mutation({
        deleteDocumentFavorite: {
          __args: { id: toggle.favoriteId },
          id: true,
        },
      } as never);
    } else {
      await client.mutation({
        createDocumentFavorites: {
          __args: { data: [toggle.data] },
          id: true,
        },
      } as never);
    }

    await loadRecord();
  };

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
      objectNameSingular: 'document',
      objectRecordId: created.id,
    });
  };

  if (documentId === null) {
    return null;
  }

  const chrome = readDocumentChromePreferences(record ?? {});
  const cover = resolveDocumentCover(record ?? {});
  const pageIcon = resolveDocumentPageIcon(record?.icon);
  const outline = extractOutline(record?.content?.markdown);
  const wordCount = countDocumentWords(record?.content?.markdown);
  const characterCount = countDocumentCharacters(record?.content?.markdown);
  const childNodes = record?.children?.edges ?? [];
  const isFavorite = favorites.some(
    (favorite) =>
      favorite.userId === userId && favorite.documentId === documentId,
  );

  const breadcrumbTrail =
    record === null
      ? []
      : buildBreadcrumbTrail({
          current: {
            id: record.id,
            title: record.title,
            parentId: record.parent?.id ?? null,
          },
          ancestorsById,
        });

  const updatedByName = record?.updatedBy?.name;
  const lastEditedBy =
    typeof updatedByName === 'string' && updatedByName.trim() !== ''
      ? updatedByName.trim()
      : null;
  const updatedAtValue = record?.updatedAt;
  const lastEditedAt =
    typeof updatedAtValue === 'string' && updatedAtValue !== ''
      ? new Date(updatedAtValue).toLocaleString()
      : null;

  const applyCoverDraft = async (): Promise<void> => {
    await updateChrome({ coverImage: coverDraft });
    setCoverDraft('');
  };

  return (
    <div
      style={{
        fontFamily: appTheme.font,
        color: appTheme.text,
        display: 'flex',
        flexDirection: 'column',
        gap: appTheme.spacing4,
        fontSize: chrome.isSmallText ? SMALL_TEXT_SCALE : undefined,
      }}
    >
      <nav
        aria-label="Fil d’Ariane"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: appTheme.spacing1,
          color: appTheme.textSecondary,
        }}
      >
        {breadcrumbTrail.map((crumb, index) => (
          <span key={crumb.id} style={{ display: 'flex', gap: appTheme.spacing1 }}>
            {index > 0 && <span aria-hidden>/</span>}
            {index === breadcrumbTrail.length - 1 ? (
              <span style={{ color: appTheme.text }}>{crumb.title}</span>
            ) : (
              <button
                type="button"
                onClick={() => openDocument(crumb.id)}
                style={{ ...ghostButtonStyle, color: appTheme.textSecondary }}
              >
                {crumb.title}
              </button>
            )}
          </span>
        ))}
      </nav>

      {chrome.isLocked && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: appTheme.spacing2,
            padding: appTheme.spacing2,
            border: `1px solid ${appTheme.border}`,
            borderRadius: appTheme.radius,
            color: appTheme.textSecondary,
          }}
        >
          🔒 Cette page est verrouillée — les réglages sont en lecture seule.
        </div>
      )}

      <div
        style={{
          height: COVER_HEIGHT,
          borderRadius: appTheme.radius,
          overflow: 'hidden',
          background: cover.kind === 'color' ? cover.color : COVER_FALLBACK,
          opacity: cover.kind === 'none' ? 0.15 : 1,
        }}
      >
        {cover.kind === 'image' && (
          <img
            src={cover.source}
            alt="Couverture"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: appTheme.spacing2,
          width: '100%',
          maxWidth: chrome.isFullWidth ? WIDE_MEASURE : NARROW_MEASURE,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: appTheme.spacing2 }}>
          <span aria-hidden style={{ fontSize: '1.5em' }}>
            {pageIcon}
          </span>
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            disabled={userId === null}
            style={{ ...ghostButtonStyle, color: appTheme.text }}
            aria-label="Favori"
          >
            {isFavorite ? '★' : '☆'}
          </button>
          <button
            type="button"
            onClick={() => void updateChrome({ isLocked: !chrome.isLocked })}
            style={{ ...ghostButtonStyle, color: appTheme.textSecondary }}
            aria-label={chrome.isLocked ? 'Déverrouiller la page' : 'Verrouiller la page'}
          >
            {chrome.isLocked ? '🔒' : '🔓'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: appTheme.spacing2, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={chrome.isLocked}
            aria-pressed={chrome.isFullWidth}
            onClick={() => void updateChrome({ isFullWidth: !chrome.isFullWidth })}
            style={controlButtonStyle}
          >
            {chrome.isFullWidth ? '◧ Pleine largeur' : '▢ Largeur normale'}
          </button>
          <button
            type="button"
            disabled={chrome.isLocked}
            aria-pressed={chrome.isSmallText}
            onClick={() => void updateChrome({ isSmallText: !chrome.isSmallText })}
            style={controlButtonStyle}
          >
            {chrome.isSmallText ? 'A− Petit texte' : 'A Texte normal'}
          </button>
        </div>

        {!chrome.isLocked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: appTheme.spacing1 }}>
            <div style={sectionTitleStyle}>Icône</div>
            <div style={{ display: 'flex', gap: appTheme.spacing1, flexWrap: 'wrap' }}>
              {DOCUMENT_PAGE_ICON_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-label={`Icône ${choice}`}
                  onClick={() => void updateChrome({ icon: choice })}
                  style={controlButtonStyle}
                >
                  {choice}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void updateChrome({ icon: null })}
                style={controlButtonStyle}
              >
                Aucune
              </button>
            </div>
          </div>
        )}

        {!chrome.isLocked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: appTheme.spacing1 }}>
            <div style={sectionTitleStyle}>Couverture</div>
            <div style={{ display: 'flex', gap: appTheme.spacing1, flexWrap: 'wrap' }}>
              {DOCUMENT_COVER_COLOR_CHOICES.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Couleur ${color}`}
                  onClick={() => void updateChrome({ coverColor: color, coverImage: null })}
                  style={{
                    ...controlButtonStyle,
                    background: color,
                    width: '24px',
                    height: '24px',
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => void updateChrome({ coverImage: null, coverColor: null })}
                style={controlButtonStyle}
              >
                Aucune
              </button>
            </div>
            <div style={{ display: 'flex', gap: appTheme.spacing1 }}>
              <input
                type="url"
                value={coverDraft}
                onChange={(event) => setCoverDraft(event.target.value)}
                placeholder="URL d’image de couverture"
                aria-label="URL d’image de couverture"
                style={{ ...textInputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => void applyCoverDraft()}
                style={controlButtonStyle}
              >
                Appliquer
              </button>
            </div>
          </div>
        )}
      </section>

      <div
        style={{
          display: 'flex',
          gap: appTheme.spacing2,
          flexWrap: 'wrap',
          color: appTheme.textSecondary,
        }}
      >
        <span>
          {wordCount} mot{wordCount === 1 ? '' : 's'} · {characterCount} caractère
          {characterCount === 1 ? '' : 's'}
        </span>
        {lastEditedBy !== null && (
          <span>
            Dernière modification par {lastEditedBy}
            {lastEditedAt === null ? '' : ` le ${lastEditedAt}`}
          </span>
        )}
      </div>

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
          {!chrome.isLocked && (
            <button
              type="button"
              onClick={() => void createChildPage()}
              style={{ ...ghostButtonStyle, color: appTheme.blue }}
            >
              + Ajouter
            </button>
          )}
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
                {resolveDocumentPageIcon(edge.node.icon)} {edge.node.title}
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
    'Chrome de la page document : fil d’Ariane, icône, couverture, contrôles de lecture, favori, verrou, plan et sous-pages.',
  component: DocumentPage,
});
