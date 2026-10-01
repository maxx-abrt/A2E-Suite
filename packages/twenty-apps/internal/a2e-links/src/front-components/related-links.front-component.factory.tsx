import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import {
  AppPath,
  enqueueSnackbar,
  navigate,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import {
  countRelatedLinks,
  createEmptyRelatedLinks,
  readRelatedLinks,
  RELATED_LINKS_TYPE_USER_LINK,
  type RelatedLink,
  type RelatedLinkDirection,
  type RelatedLinks,
} from '../lib/related-links.ts';
import {
  buildRelatedLinkRecordInput,
  searchRelatedLinkTargets,
  type RelatedLinkTarget,
} from '../lib/related-links-targets.ts';

// LE PANNEAU « LIENS » (M11a-i3, US-149).
//
// A record page shows one Related tab listing what this record links to
// (outbound junction rows) and what links back to it (the persisted inverse
// relation). Both directions come from the a2eLink junction the app owns, so
// nothing is scanned at read time. A2E Links declares one standalone tab per
// consumer target (document, task) and this factory closes over that target at
// build time: the sandbox renders a front component with empty props, so the
// object cannot be passed in.
//
// The empty state offers the same "Link…" action as the header (US-148). A
// sandboxed component cannot reach the host SingleRecordPicker, so the action
// searches the declared linkable set and writes the identical a2eLink row
// (same linkKey, same morph FKs) — the two entry points dedupe against each
// other and share the one related store.

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
  color: appTheme.text,
  textAlign: 'left',
} as const;

const textInputStyle = {
  border: `1px solid ${appTheme.border}`,
  borderRadius: appTheme.radius,
  background: 'transparent',
  color: appTheme.text,
  padding: appTheme.spacing1,
  width: '100%',
} as const;

const OBJECT_LABELS: Record<string, string> = {
  document: 'Document',
  task: 'Tâche',
};

const DIRECTION_LABELS: Record<RelatedLinkDirection, string> = {
  outbound: 'Liens sortants',
  inbound: 'Liens entrants',
};

export const createRelatedLinksFrontComponent = (
  objectNameSingular: 'document' | 'task',
) => {
  const RelatedLinksPanel = () => {
    const selectedRecordIds = useSelectedRecordIds();
    const recordId =
      selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

    const [links, setLinks] = useState<RelatedLinks>(
      createEmptyRelatedLinks(),
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isPicking, setIsPicking] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [targets, setTargets] = useState<RelatedLinkTarget[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const reload = useCallback(async () => {
      if (recordId === null) {
        setLinks(createEmptyRelatedLinks());
        return;
      }

      setIsLoading(true);

      try {
        setLinks(
          await readRelatedLinks(new CoreApiClient(), {
            objectNameSingular,
            recordId,
          }),
        );
      } finally {
        setIsLoading(false);
      }
    }, [recordId]);

    useEffect(() => {
      void reload();
    }, [reload]);

    const openTarget = (link: RelatedLink): void => {
      void navigate(AppPath.RecordShowPage, {
        objectNameSingular: link.objectNameSingular,
        objectRecordId: link.recordId,
      });
    };

    const runSearch = async (value: string): Promise<void> => {
      setSearchText(value);

      if (value.trim() === '' || recordId === null) {
        setTargets([]);
        return;
      }

      setIsSearching(true);

      try {
        setTargets(
          await searchRelatedLinkTargets(new CoreApiClient(), {
            searchText: value,
            exclude: { objectNameSingular, recordId },
          }),
        );
      } finally {
        setIsSearching(false);
      }
    };

    const createLink = async (target: RelatedLinkTarget): Promise<void> => {
      if (recordId === null) {
        return;
      }

      const input = buildRelatedLinkRecordInput({
        sourceObjectNameSingular: objectNameSingular,
        sourceRecordId: recordId,
        targetObjectNameSingular: target.objectNameSingular,
        targetRecordId: target.recordId,
      });

      if (input === null) {
        await enqueueSnackbar({
          message: 'Cet enregistrement ne peut pas être lié.',
          variant: 'error',
        });

        return;
      }

      try {
        await new CoreApiClient().mutation({
          createA2eLink: { __args: { data: input }, id: true },
        } as never);

        await enqueueSnackbar({ message: 'Lien créé.', variant: 'success' });

        setSearchText('');
        setTargets([]);
        setIsPicking(false);

        await reload();
      } catch {
        await enqueueSnackbar({
          message: 'Impossible de créer le lien — il existe peut-être déjà.',
          variant: 'error',
        });
      }
    };

    if (recordId === null) {
      return null;
    }

    const renderLink = (link: RelatedLink) => (
      <li
        key={`${link.direction}-${link.linkId}`}
        style={{ display: 'flex', alignItems: 'center', gap: appTheme.spacing2 }}
      >
        <button
          type="button"
          onClick={() => openTarget(link)}
          style={ghostButtonStyle}
        >
          {link.title === '' ? 'Sans titre' : link.title}
        </button>
        <span style={{ color: appTheme.textSecondary }}>
          {OBJECT_LABELS[link.objectNameSingular] ?? link.objectNameSingular}
          {link.linkType === RELATED_LINKS_TYPE_USER_LINK ? '' : ' · mention'}
        </span>
      </li>
    );

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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <strong>Liens</strong>
          <button
            type="button"
            onClick={() => {
              setIsPicking((current) => !current);
              setSearchText('');
              setTargets([]);
            }}
            style={{ ...ghostButtonStyle, color: appTheme.blue }}
          >
            Lier…
          </button>
        </div>

        {isPicking && (
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: appTheme.spacing1,
              border: `1px solid ${appTheme.border}`,
              borderRadius: appTheme.radius,
              padding: appTheme.spacing2,
            }}
          >
            <input
              type="search"
              autoFocus
              aria-label="Rechercher un enregistrement à lier"
              placeholder="Rechercher un document ou une tâche…"
              value={searchText}
              onChange={(event) => void runSearch(event.target.value)}
              style={textInputStyle}
            />
            {isSearching && (
              <span style={{ color: appTheme.textSecondary }}>
                Recherche…
              </span>
            )}
            {!isSearching && searchText.trim() !== '' && targets.length === 0 && (
              <span style={{ color: appTheme.textSecondary }}>
                Aucun résultat.
              </span>
            )}
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {targets.map((target) => (
                <li key={`${target.objectNameSingular}:${target.recordId}`}>
                  <button
                    type="button"
                    onClick={() => void createLink(target)}
                    style={ghostButtonStyle}
                  >
                    {target.title === '' ? 'Sans titre' : target.title}
                    <span style={{ color: appTheme.textSecondary }}>
                      {' '}
                      —{' '}
                      {OBJECT_LABELS[target.objectNameSingular] ??
                        target.objectNameSingular}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isLoading && (
          <span style={{ color: appTheme.textSecondary }}>
            Chargement…
          </span>
        )}

        {!isLoading && countRelatedLinks(links) === 0 && (
          <span style={{ color: appTheme.textSecondary }}>
            Aucun lien pour cet enregistrement. Utilisez « Lier… » pour le
            connecter à un autre.
          </span>
        )}

        {!isLoading && links.outbound.length > 0 && (
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: appTheme.spacing1,
            }}
          >
            <div style={sectionTitleStyle}>
              {DIRECTION_LABELS.outbound}
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {links.outbound.map(renderLink)}
            </ul>
          </section>
        )}

        {!isLoading && links.inbound.length > 0 && (
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: appTheme.spacing1,
            }}
          >
            <div style={sectionTitleStyle}>
              {DIRECTION_LABELS.inbound}
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {links.inbound.map(renderLink)}
            </ul>
          </section>
        )}
      </div>
    );
  };

  return RelatedLinksPanel;
};
