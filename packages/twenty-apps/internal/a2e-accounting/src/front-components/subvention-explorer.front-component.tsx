import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';

// L'EXPLORATEUR D'AIDES.
//
// La table Twenty sait déjà filtrer et trier le catalogue. Ce que cet écran
// ajoute, et qu'une table ne peut pas faire : rafraîchir les sources publiques
// à la demande, classer les aides selon le profil de la structure avec la
// raison de chaque point, et transformer une aide en dossier suivi en un clic.
//
// Les jetons de thème sont écrits en variables CSS : le SDK simule le paquet UI
// pendant la construction du manifeste, donc un import direct serait indéfini.
const theme = {
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
  spacing3: 'var(--t-spacing-3)',
  spacing4: 'var(--t-spacing-4)',
  spacing6: 'var(--t-spacing-6)',
  bgPrimary: 'var(--t-background-primary)',
  bgSecondary: 'var(--t-background-secondary)',
  bgTransparent: 'var(--t-background-transparent-light)',
  borderLight: 'var(--t-border-color-light)',
  borderMedium: 'var(--t-border-color-medium)',
  radiusSm: 'var(--t-border-radius-sm)',
  radiusMd: 'var(--t-border-radius-md)',
  fontPrimary: 'var(--t-font-color-primary)',
  fontSecondary: 'var(--t-font-color-secondary)',
  fontTertiary: 'var(--t-font-color-tertiary)',
  fontInverted: 'var(--t-font-color-inverted)',
  fontFamily: 'var(--t-font-family)',
  sizeXs: 'var(--t-font-size-xs)',
  sizeSm: 'var(--t-font-size-sm)',
  sizeLg: 'var(--t-font-size-lg)',
  weightMedium: 'var(--t-font-weight-medium)',
  weightSemiBold: 'var(--t-font-weight-semi-bold)',
  blue: 'var(--t-color-blue)',
  green: 'var(--t-color-green)',
  orange: 'var(--t-color-orange)',
  red: 'var(--t-color-red)',
};

const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    color: theme.fontPrimary,
    background: theme.bgPrimary,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing4,
    padding: theme.spacing6,
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing3,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: theme.sizeLg,
    fontWeight: theme.weightSemiBold,
    margin: 0,
  },
  subtitle: {
    color: theme.fontTertiary,
    fontSize: theme.sizeXs,
    margin: 0,
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing2,
    alignItems: 'center',
  },
  input: {
    flex: '1 1 240px',
    minWidth: 200,
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    background: theme.bgPrimary,
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
  },
  select: {
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    background: theme.bgPrimary,
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
  },
  button: {
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    background: theme.bgSecondary,
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    cursor: 'pointer',
    transition: 'background-color 150ms ease, border-color 150ms ease',
  },
  primaryButton: {
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.blue}`,
    borderRadius: theme.radiusSm,
    background: theme.blue,
    color: theme.fontInverted,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing3,
  },
  card: {
    border: `1px solid ${theme.borderLight}`,
    borderRadius: theme.radiusMd,
    padding: theme.spacing4,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing2,
    background: theme.bgPrimary,
  },
  cardHeader: {
    display: 'flex',
    gap: theme.spacing3,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontWeight: theme.weightSemiBold,
    margin: 0,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing2,
    color: theme.fontTertiary,
    fontSize: theme.sizeXs,
  },
  badge: {
    padding: `2px ${theme.spacing2}`,
    borderRadius: theme.radiusSm,
    background: theme.bgTransparent,
    color: theme.fontSecondary,
    fontSize: theme.sizeXs,
  },
  score: {
    padding: `2px ${theme.spacing2}`,
    borderRadius: theme.radiusSm,
    background: theme.green,
    color: theme.fontInverted,
    fontSize: theme.sizeXs,
    fontWeight: theme.weightSemiBold,
    whiteSpace: 'nowrap',
  },
  description: {
    color: theme.fontSecondary,
    margin: 0,
    lineHeight: 1.5,
  },
  reasons: {
    color: theme.fontTertiary,
    fontSize: theme.sizeXs,
    margin: 0,
  },
  cardActions: {
    display: 'flex',
    gap: theme.spacing2,
    flexWrap: 'wrap',
  },
  empty: {
    border: `1px dashed ${theme.borderMedium}`,
    borderRadius: theme.radiusMd,
    padding: theme.spacing6,
    color: theme.fontTertiary,
    textAlign: 'center',
  },
};

const AUDIENCE_OPTIONS = [
  { value: '', label: 'Tous les publics' },
  { value: 'ASSOCIATION', label: 'Association' },
  { value: 'ENTREPRISE', label: 'Entreprise' },
  { value: 'COLLECTIVITE', label: 'Collectivité' },
  { value: 'ETABLISSEMENT_PUBLIC', label: 'Établissement public' },
  { value: 'PARTICULIER', label: 'Particulier' },
  { value: 'AGRICULTEUR', label: 'Agriculteur' },
  { value: 'RECHERCHE', label: 'Recherche et enseignement' },
];

const SCALE_LABELS: Record<string, string> = {
  EUROPEEN: 'Européen',
  NATIONAL: 'National',
  REGION: 'Régional',
  DEPARTEMENT: 'Départemental',
  COMMUNE: 'Communal',
  AUTRE: 'Autre périmètre',
};

type Subvention = {
  id: string;
  title: string;
  description?: string | null;
  submissionDeadline?: string | null;
  audiences?: string[] | null;
  perimeterScale?: string | null;
  source?: string | null;
  isCallForProject?: boolean | null;
  rateMax?: number | null;
  amountHint?: string | null;
  links?: { primaryLinkUrl?: string | null } | null;
};

type MatchResult = {
  subventionId: string;
  score: number;
  reasons: string[];
};

type MatchResponse = {
  success?: boolean;
  fromCache?: boolean;
  results?: MatchResult[];
  eligible?: number;
  error?: string;
};

type RefreshResponse = {
  success?: boolean;
  totalCreated?: number;
  totalUpdated?: number;
  sources?: { source: string; status: string; fetched: number; error?: string }[];
  error?: string;
};

const PAGE_SIZE = 30;

const formatDeadline = (value: string | null | undefined): string => {
  if (!value) {
    return 'Sans date limite';
  }

  const days = Math.round((Date.parse(value) - Date.now()) / 86_400_000);

  if (days < 0) {
    return 'Clôturée';
  }

  const date = new Date(value).toLocaleDateString('fr-FR');

  return days === 0 ? `Dernier jour (${date})` : `${days} j — ${date}`;
};

export const SubventionExplorer = () => {
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState('');
  const [onlyCalls, setOnlyCalls] = useState(false);
  const [subventions, setSubventions] = useState<Subvention[]>([]);
  const [scores, setScores] = useState<Record<string, MatchResult>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'none' | 'refresh' | 'match'>('none');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const filter: Record<string, unknown> = { isLive: { eq: true } };

      if (query.trim().length > 0) {
        filter.searchText = {
          ilike: `%${query
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')}%`,
        };
      }

      if (audience.length > 0) {
        filter.audiences = { containsAny: [audience] };
      }

      if (onlyCalls) {
        filter.isCallForProject = { eq: true };
      }

      const response = (await new CoreApiClient().query({
        subventions: {
          __args: {
            filter,
            first: PAGE_SIZE,
            orderBy: [{ submissionDeadline: 'AscNullsLast' }],
          },
          edges: {
            node: {
              id: true,
              title: true,
              description: true,
              submissionDeadline: true,
              audiences: true,
              perimeterScale: true,
              source: true,
              isCallForProject: true,
              rateMax: true,
              amountHint: true,
              links: { primaryLinkUrl: true },
            },
          },
        },
      } as never)) as {
        subventions?: { edges?: { node: Subvention }[] };
      };

      setSubventions(
        (response?.subventions?.edges ?? []).map((edge) => edge.node),
      );
    } catch (error) {
      await enqueueSnackbar({
        message:
          error instanceof Error
            ? error.message
            : 'Lecture du catalogue impossible.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [audience, onlyCalls, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = async () => {
    setBusy('refresh');

    try {
      const result = await new RestApiClient().post<RefreshResponse>(
        '/s/subventions/refresh',
        {},
      );

      const failed = (result.sources ?? []).filter(
        (source) => source.status === 'FAILED',
      );

      await enqueueSnackbar({
        message:
          result.success === false
            ? (result.error ?? 'Rafraîchissement impossible.')
            : `${result.totalCreated ?? 0} nouvelle(s) aide(s), ${result.totalUpdated ?? 0} mise(s) à jour${
                failed.length > 0
                  ? ` — ${failed.length} source en échec (${failed[0]?.error ?? ''})`
                  : ''
              }.`,
        variant:
          result.success === false
            ? 'error'
            : failed.length > 0
              ? 'warning'
              : 'success',
      });

      await load();
    } catch (error) {
      await enqueueSnackbar({
        message:
          error instanceof Error ? error.message : 'Rafraîchissement impossible.',
        variant: 'error',
      });
    } finally {
      setBusy('none');
    }
  };

  const handleMatch = async () => {
    setBusy('match');

    try {
      const result = await new RestApiClient().post<MatchResponse>(
        '/s/subventions/match',
        {
          limit: 50,
          onlyOpen: true,
          onlyCallForProject: onlyCalls,
          audiences: audience.length > 0 ? [audience] : undefined,
          query: query.trim().length > 0 ? query.trim() : undefined,
        },
      );

      if (result.success === false) {
        await enqueueSnackbar({
          message: result.error ?? 'Classement impossible.',
          variant: 'error',
        });

        return;
      }

      const next: Record<string, MatchResult> = {};

      for (const item of result.results ?? []) {
        next[item.subventionId] = item;
      }

      setScores(next);

      await enqueueSnackbar({
        message: `${Object.keys(next).length} aide(s) classée(s) sur ${result.eligible ?? 0} éligibles${
          result.fromCache ? ' (résultat en cache, aucun calcul refait)' : ''
        }.`,
        variant: 'success',
      });
    } catch (error) {
      await enqueueSnackbar({
        message: error instanceof Error ? error.message : 'Classement impossible.',
        variant: 'error',
      });
    } finally {
      setBusy('none');
    }
  };

  const handleTrack = async (subvention: Subvention) => {
    try {
      await new CoreApiClient().mutation({
        createSavedSubventions: {
          __args: {
            data: [
              {
                name: subvention.title,
                status: 'SHORTLISTED',
                subventionId: subvention.id,
                deadline: subvention.submissionDeadline ?? null,
                aiScore: scores[subvention.id]?.score ?? null,
                aiReason: scores[subvention.id]?.reasons.join(' · ') ?? null,
              },
            ],
          },
          id: true,
        },
      } as never);

      await enqueueSnackbar({
        message: `« ${subvention.title.slice(0, 60)} » ajoutée à vos dossiers.`,
        variant: 'success',
      });
    } catch (error) {
      await enqueueSnackbar({
        message:
          error instanceof Error ? error.message : 'Ajout au dossier impossible.',
        variant: 'error',
      });
    }
  };

  const ordered = [...subventions].sort(
    (left, right) =>
      (scores[right.id]?.score ?? -1) - (scores[left.id]?.score ?? -1),
  );

  return (
    <div style={styles.page} data-testid="subvention-explorer">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Trouver des aides</h1>
          <p style={styles.subtitle}>
            Aides-territoires, appels à projets Carenews et dispositifs
            nationaux référencés, dans un seul catalogue.
          </p>
        </div>
        <div style={styles.toolbar}>
          <button
            type="button"
            style={styles.button}
            onClick={handleRefresh}
            disabled={busy !== 'none'}
            data-testid="subvention-refresh-button"
          >
            {busy === 'refresh' ? 'Rafraîchissement…' : 'Rafraîchir le catalogue'}
          </button>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={handleMatch}
            disabled={busy !== 'none'}
            data-testid="subvention-match-button"
          >
            {busy === 'match' ? 'Classement…' : 'Classer pour ma structure'}
          </button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input
          style={styles.input}
          placeholder="Rechercher : jeunesse, rénovation, numérique…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          data-testid="subvention-search-input"
        />
        <select
          style={styles.select}
          value={audience}
          onChange={(event) => setAudience(event.target.value)}
          data-testid="subvention-audience-select"
        >
          {AUDIENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing1,
            color: theme.fontSecondary,
            fontSize: theme.sizeXs,
          }}
        >
          <input
            type="checkbox"
            checked={onlyCalls}
            onChange={(event) => setOnlyCalls(event.target.checked)}
            data-testid="subvention-calls-checkbox"
          />
          Appels à projets uniquement
        </label>
      </div>

      {loading ? (
        <div style={styles.empty} data-testid="subvention-loading">
          Lecture du catalogue…
        </div>
      ) : ordered.length === 0 ? (
        <div style={styles.empty} data-testid="subvention-empty">
          Aucune aide ne correspond. Rafraîchissez le catalogue ou élargissez la
          recherche.
        </div>
      ) : (
        <div style={styles.list} data-testid="subvention-list">
          {ordered.map((subvention) => {
            const match = scores[subvention.id];

            return (
              <article
                key={subvention.id}
                style={styles.card}
                data-testid={`subvention-card-${subvention.id}`}
              >
                <div style={styles.cardHeader}>
                  <h2 style={styles.cardTitle}>{subvention.title}</h2>
                  {match !== undefined ? (
                    <span style={styles.score}>{match.score} pts</span>
                  ) : null}
                </div>

                <div style={styles.meta}>
                  <span style={styles.badge}>
                    {formatDeadline(subvention.submissionDeadline)}
                  </span>
                  {subvention.perimeterScale ? (
                    <span style={styles.badge}>
                      {SCALE_LABELS[subvention.perimeterScale] ??
                        subvention.perimeterScale}
                    </span>
                  ) : null}
                  {(subvention.audiences ?? []).slice(0, 3).map((item) => (
                    <span key={item} style={styles.badge}>
                      {AUDIENCE_OPTIONS.find((option) => option.value === item)
                        ?.label ?? item}
                    </span>
                  ))}
                  {subvention.isCallForProject ? (
                    <span style={styles.badge}>Appel à projets</span>
                  ) : null}
                  {subvention.rateMax ? (
                    <span style={styles.badge}>
                      Jusqu’à {subvention.rateMax} %
                    </span>
                  ) : null}
                </div>

                {subvention.description ? (
                  <p style={styles.description}>
                    {subvention.description.slice(0, 320)}
                    {subvention.description.length > 320 ? '…' : ''}
                  </p>
                ) : null}

                {match !== undefined && match.reasons.length > 0 ? (
                  <p style={styles.reasons}>
                    Pourquoi : {match.reasons.slice(0, 4).join(' · ')}
                  </p>
                ) : null}

                <div style={styles.cardActions}>
                  <button
                    type="button"
                    style={styles.button}
                    onClick={() => handleTrack(subvention)}
                    data-testid={`subvention-track-${subvention.id}`}
                  >
                    Suivre ce dispositif
                  </button>
                  {subvention.links?.primaryLinkUrl ? (
                    <a
                      href={subvention.links.primaryLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...styles.button, textDecoration: 'none' }}
                      data-testid={`subvention-link-${subvention.id}`}
                    >
                      Fiche officielle
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.subventionExplorer,
  name: 'subvention-explorer',
  description:
    'Explorateur du catalogue de subventions : recherche, rafraîchissement des sources publiques, classement expliqué et mise en dossier.',
  component: SubventionExplorer,
});
