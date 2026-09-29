import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  enqueueSnackbar,
  openCommandConfirmationModal,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import { buildFindOneByIdArgs } from '../lib/find-one-record-args.ts';
import { formatWorkspaceMemberName } from '../lib/project-overview.ts';
import {
  DEFAULT_RETROPLANNING_TIME,
  RETROPLANNING_RECIPES,
  type RetroplanningRecipe,
  type RetroplanningWarningCode,
} from '../lib/retroplanning.ts';
import {
  RETROPLANNING_ROW_ACTION_LABELS,
  buildDefaultRetroplanningDeadlineDate,
  buildRetroplanningDestructiveSubtitle,
  buildRetroplanningInputKey,
  buildRetroplanningPreviewRows,
  collectRetroplanningAssigneeRoles,
  formatRetroplanningDay,
  getRetroplanningRoleLabel,
  isValidRetroplanningTimezone,
  summarizeRetroplanningChangeSet,
} from '../lib/retroplanning-screen.ts';
import {
  applyRetroplanning,
  previewRetroplanning,
  type ApplyRetroplanningInput,
  type PreviewRetroplanningResult,
} from '../logic-functions/handlers/apply-retroplanning-handler.ts';

// LA RÉTROPLANNING DE PROJET (P4.2).
//
// The screen is the user-facing surface of the P4.2 engine: it picks one of the
// versioned recipes, sets the deadline and its IANA timezone, dry-runs the
// SAME planner the `retroplanning` logic function runs (`previewRetroplanning`
// / `applyRetroplanning` from the handler — never a second preview
// implementation), then confirms creation into standard tasks. A REPLACE that
// would delete recipe-owned rows opens an explicit destructive confirmation
// that names the records first; the engine keeps human-edited dates and DONE
// work protected either way.

type RetroplanningMode = 'APPEND' | 'REPLACE';

type WorkspaceMemberOption = {
  workspaceMemberId: string;
  displayName: string;
};

type ProjectMemberNode = {
  id: string;
  workspaceMember?: {
    id?: string | null;
    name?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

type ProjectQueryResult = {
  project?: {
    id: string;
    members?: { edges?: { node: ProjectMemberNode }[] } | null;
  } | null;
};

const MEMBER_LIMIT = 100;

const TIMEZONE_OPTIONS = [
  'UTC',
  'Europe/Paris',
  'Europe/London',
  'Europe/Brussels',
  'Europe/Geneva',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

const WARNING_CODE_LABELS: Record<RetroplanningWarningCode, string> = {
  PAST_DATE: 'Dans le passé',
  ASSIGNEE_OVERLAP: 'Chevauchement',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const theme = {
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
  spacing3: 'var(--t-spacing-3)',
  spacing4: 'var(--t-spacing-4)',
  spacing6: 'var(--t-spacing-6)',
  bgPrimary: 'var(--t-background-primary)',
  bgSecondary: 'var(--t-background-secondary)',
  borderLight: 'var(--t-border-color-light)',
  borderMedium: 'var(--t-border-color-medium)',
  radiusSm: 'var(--t-border-radius-sm)',
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
  red: 'var(--t-color-red)',
} as const;

const styles: Record<string, CSSProperties> = {
  panel: {
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    color: theme.fontPrimary,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing4,
    padding: theme.spacing4,
    boxSizing: 'border-box',
  },
  heading: {
    fontSize: theme.sizeLg,
    fontWeight: theme.weightSemiBold,
    margin: 0,
  },
  subtitle: { color: theme.fontTertiary, fontSize: theme.sizeXs, margin: 0 },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing1,
  },
  label: {
    color: theme.fontSecondary,
    fontSize: theme.sizeXs,
    fontWeight: theme.weightMedium,
  },
  input: {
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    background: theme.bgPrimary,
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
  },
  row: { display: 'flex', gap: theme.spacing3, flexWrap: 'wrap' },
  rowChild: { flex: 1, minWidth: 160 },
  modeRow: { display: 'flex', gap: theme.spacing2 },
  modeButton: {
    flex: 1,
    padding: `${theme.spacing2} ${theme.spacing3}`,
    border: `1px solid ${theme.borderMedium}`,
    borderRadius: theme.radiusSm,
    background: theme.bgSecondary,
    color: theme.fontPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    cursor: 'pointer',
  },
  modeButtonActive: {
    background: theme.blue,
    borderColor: theme.blue,
    color: theme.fontInverted,
  },
  actionRow: { display: 'flex', gap: theme.spacing2, flexWrap: 'wrap' },
  primaryButton: {
    padding: `${theme.spacing2} ${theme.spacing4}`,
    border: `1px solid ${theme.blue}`,
    borderRadius: theme.radiusSm,
    background: theme.blue,
    color: theme.fontInverted,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    cursor: 'pointer',
  },
  dangerButton: {
    padding: `${theme.spacing2} ${theme.spacing4}`,
    border: `1px solid ${theme.red}`,
    borderRadius: theme.radiusSm,
    background: theme.red,
    color: theme.fontInverted,
    fontFamily: theme.fontFamily,
    fontSize: theme.sizeSm,
    fontWeight: theme.weightMedium,
    cursor: 'pointer',
  },
  buttonBusy: { opacity: 0.6, cursor: 'wait' },
  error: { color: theme.red },
  notice: { color: theme.fontSecondary },
  dangerousPanel: {
    border: `1px solid ${theme.red}`,
    borderRadius: theme.radiusSm,
    padding: theme.spacing3,
    color: theme.red,
    fontSize: theme.sizeXs,
  },
  summaryRow: {
    display: 'flex',
    gap: theme.spacing3,
    flexWrap: 'wrap',
    color: theme.fontSecondary,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.sizeXs,
  },
  cell: {
    borderBottom: `1px solid ${theme.borderLight}`,
    padding: theme.spacing1,
    textAlign: 'left',
    verticalAlign: 'top',
  },
  warningCell: { color: theme.red },
};

const resolveDefaultTimezone = (): string => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return isValidRetroplanningTimezone(zone) ? zone : 'Europe/Paris';
  } catch {
    return 'Europe/Paris';
  }
};

const readProjectMemberOptions = async (
  projectId: string,
): Promise<WorkspaceMemberOption[]> => {
  const client = new CoreApiClient();

  const result = (await client.query({
    project: {
      __args: buildFindOneByIdArgs(projectId),
      id: true,
      members: {
        __args: { first: MEMBER_LIMIT },
        edges: {
          node: {
            id: true,
            workspaceMember: {
              id: true,
              name: { firstName: true, lastName: true },
            },
          },
        },
      },
    },
  } as never)) as ProjectQueryResult;

  const options: WorkspaceMemberOption[] = [];

  for (const edge of result?.project?.members?.edges ?? []) {
    const workspaceMember = edge.node.workspaceMember;
    const memberId = workspaceMember?.id;

    if (memberId === undefined || memberId === null) {
      continue;
    }

    if (options.some((option) => option.workspaceMemberId === memberId)) {
      continue;
    }

    options.push({
      workspaceMemberId: memberId,
      displayName: formatWorkspaceMemberName(workspaceMember?.name ?? null),
    });
  }

  return options;
};

const ProjectRetroplanning = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const projectId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const [timezone, setTimezone] = useState<string>(() =>
    resolveDefaultTimezone(),
  );
  const [recipeKey, setRecipeKey] = useState<string>(
    () => RETROPLANNING_RECIPES[0]?.key ?? 'delivery',
  );
  const [deadlineDate, setDeadlineDate] = useState<string>(() =>
    buildDefaultRetroplanningDeadlineDate(new Date(), timezone, 30),
  );
  const [deadlineTime, setDeadlineTime] = useState<string>(
    DEFAULT_RETROPLANNING_TIME,
  );
  const [mode, setMode] = useState<RetroplanningMode>('APPEND');
  const [assigneeRoles, setAssigneeRoles] = useState<Record<string, string>>(
    {},
  );
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [previewResult, setPreviewResult] =
    useState<PreviewRetroplanningResult | null>(null);
  const [previewedKey, setPreviewedKey] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recipe = useMemo(
    (): RetroplanningRecipe | undefined =>
      RETROPLANNING_RECIPES.find((candidate) => candidate.key === recipeKey),
    [recipeKey],
  );

  const assigneeRoleNames = useMemo(
    () =>
      recipe === undefined ? [] : collectRetroplanningAssigneeRoles(recipe),
    [recipe],
  );

  const memberNameById = useMemo(
    () =>
      new Map(
        members.map((member): [string, string] => [
          member.workspaceMemberId,
          member.displayName,
        ]),
      ),
    [members],
  );

  const buildInput = useCallback(
    (): ApplyRetroplanningInput | null =>
      projectId === null
        ? null
        : {
            projectId,
            recipeKey,
            deadline: { date: deadlineDate, time: deadlineTime, timezone },
            mode,
            assigneeRoles,
          },
    [
      projectId,
      recipeKey,
      deadlineDate,
      deadlineTime,
      timezone,
      mode,
      assigneeRoles,
    ],
  );

  const currentKey = useMemo(() => {
    const input = buildInput();

    return input === null ? null : buildRetroplanningInputKey(input);
  }, [buildInput]);

  const isStale =
    previewResult !== null &&
    previewedKey !== null &&
    currentKey !== null &&
    previewedKey !== currentKey;

  useEffect(() => {
    let isCancelled = false;

    if (projectId === null) {
      setMembers([]);
      return;
    }

    void readProjectMemberOptions(projectId).then((options) => {
      if (!isCancelled) {
        setMembers(options);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [projectId]);

  // Any edit invalidates the dry run: the previous schedule no longer matches
  // the inputs shown, so applying it would write something the user never saw.
  useEffect(() => {
    setPreviewResult(null);
    setPreviewedKey(null);
  }, [currentKey]);

  const runPreview = useCallback(async () => {
    const input = buildInput();

    if (input === null) {
      return;
    }

    if (!isValidRetroplanningTimezone(input.deadline.timezone)) {
      setErrorMessage('Fuseau horaire inconnu — choisissez une zone IANA.');
      return;
    }

    if (!DATE_PATTERN.test(input.deadline.date)) {
      setErrorMessage('Date d’échéance invalide.');
      return;
    }

    setIsPreviewing(true);
    setErrorMessage(null);

    try {
      const result = await previewRetroplanning(
        input,
        new Date(),
        new CoreApiClient(),
      );

      setPreviewResult(result);
      setPreviewedKey(buildRetroplanningInputKey(input));
    } catch {
      setPreviewResult(null);
      setPreviewedKey(null);
      setErrorMessage(
        'Aperçu impossible — vérifiez la recette, la date et le fuseau.',
      );
    } finally {
      setIsPreviewing(false);
    }
  }, [buildInput]);

  const confirmGeneration = useCallback(async () => {
    const input = buildInput();

    if (input === null || previewResult === null || isStale) {
      setErrorMessage('Relancez l’aperçu avant de confirmer.');
      return;
    }

    let confirmedDestructiveChange = false;

    if (previewResult.changeSet.requiresDestructiveConfirmation) {
      let choice: 'confirm' | 'cancel' = 'cancel';

      try {
        choice = await openCommandConfirmationModal({
          title: 'Remplacer les tâches générées ?',
          subtitle: buildRetroplanningDestructiveSubtitle(
            previewResult.pendingRemovals,
          ),
          confirmButtonText: 'Remplacer',
          confirmButtonAccent: 'danger',
        });
      } catch {
        setErrorMessage('Confirmation destructive indisponible ici.');
        return;
      }

      if (choice !== 'confirm') {
        return;
      }

      confirmedDestructiveChange = true;
    }

    setIsApplying(true);
    setErrorMessage(null);

    try {
      const result = await applyRetroplanning(
        { ...input, confirmedDestructiveChange },
        new Date(),
        new CoreApiClient(),
      );

      void enqueueSnackbar({
        message: `Rétroplanning appliqué : ${result.created} créée(s), ${result.updated} replanifiée(s), ${result.removed} supprimée(s), ${result.skippedProtected} protégée(s).`,
        variant: 'success',
      });

      setPreviewResult(null);
      setPreviewedKey(null);
      await runPreview();
    } catch {
      setErrorMessage('Génération impossible — aucune modification appliquée.');
    } finally {
      setIsApplying(false);
    }
  }, [buildInput, previewResult, isStale, runPreview]);

  if (projectId === null) {
    return (
      <div style={styles.panel}>
        <strong style={styles.heading}>Rétroplanning</strong>
        <span style={styles.subtitle}>
          Sélectionnez un projet pour choisir une recette et fixer l’échéance.
        </span>
      </div>
    );
  }

  const rows =
    previewResult === null
      ? []
      : buildRetroplanningPreviewRows(
          previewResult.preview,
          previewResult.changeSet,
        );

  const summary =
    previewResult === null
      ? null
      : summarizeRetroplanningChangeSet(
          previewResult.changeSet,
          previewResult.pendingRemovalCount,
        );

  return (
    <div style={styles.panel}>
      <div>
        <strong style={styles.heading}>Rétroplanning</strong>
        <p style={styles.subtitle}>
          Choisissez une recette, fixez l’échéance et le fuseau, prévisualisez
          les dates générées puis confirmez la création des tâches standard.
        </p>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label} htmlFor="retroplanning-recipe">
          Recette
        </label>
        <select
          id="retroplanning-recipe"
          style={styles.input}
          value={recipeKey}
          onChange={(event) => {
            setRecipeKey(event.target.value);
            setAssigneeRoles({});
          }}
          data-testid="retroplanning-recipe-select"
        >
          {RETROPLANNING_RECIPES.map((candidate) => (
            <option key={candidate.key} value={candidate.key}>
              {candidate.label} (v{candidate.version})
            </option>
          ))}
        </select>
        {recipe !== undefined && (
          <span style={styles.subtitle}>{recipe.description}</span>
        )}
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.fieldGroup, ...styles.rowChild }}>
          <label style={styles.label} htmlFor="retroplanning-deadline-date">
            Échéance
          </label>
          <input
            id="retroplanning-deadline-date"
            style={styles.input}
            type="date"
            value={deadlineDate}
            onChange={(event) => setDeadlineDate(event.target.value)}
            data-testid="retroplanning-deadline-date"
          />
        </div>
        <div style={{ ...styles.fieldGroup, ...styles.rowChild }}>
          <label style={styles.label} htmlFor="retroplanning-deadline-time">
            Heure limite
          </label>
          <input
            id="retroplanning-deadline-time"
            style={styles.input}
            type="time"
            value={deadlineTime}
            onChange={(event) => setDeadlineTime(event.target.value)}
            data-testid="retroplanning-deadline-time"
          />
        </div>
        <div style={{ ...styles.fieldGroup, ...styles.rowChild }}>
          <label style={styles.label} htmlFor="retroplanning-timezone">
            Fuseau horaire
          </label>
          <input
            id="retroplanning-timezone"
            style={styles.input}
            list="retroplanning-timezones"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            data-testid="retroplanning-timezone"
          />
          <datalist id="retroplanning-timezones">
            {TIMEZONE_OPTIONS.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <span style={styles.label}>Application</span>
        <div style={styles.modeRow}>
          <button
            type="button"
            style={{
              ...styles.modeButton,
              ...(mode === 'APPEND' ? styles.modeButtonActive : {}),
            }}
            onClick={() => setMode('APPEND')}
            data-testid="retroplanning-mode-append"
          >
            Ajouter (APPEND)
          </button>
          <button
            type="button"
            style={{
              ...styles.modeButton,
              ...(mode === 'REPLACE' ? styles.modeButtonActive : {}),
            }}
            onClick={() => setMode('REPLACE')}
            data-testid="retroplanning-mode-replace"
          >
            Remplacer (REPLACE)
          </button>
        </div>
        <span style={styles.subtitle}>
          {mode === 'REPLACE'
            ? 'REPLACE supprime les tâches générées par cette recette qui ne sont plus planifiées — après confirmation explicite.'
            : 'APPEND n’ajoute et ne replanifie que les tâches générées par cette recette, sans rien supprimer.'}
        </span>
      </div>

      {assigneeRoleNames.length > 0 && (
        <div style={styles.fieldGroup}>
          <span style={styles.label}>Assignation par rôle</span>
          {assigneeRoleNames.map((role) => (
            <div key={role} style={styles.row}>
              <div style={{ ...styles.fieldGroup, ...styles.rowChild }}>
                <label
                  style={styles.label}
                  htmlFor={`retroplanning-role-${role}`}
                >
                  {getRetroplanningRoleLabel(role)}
                </label>
                <select
                  id={`retroplanning-role-${role}`}
                  style={styles.input}
                  value={assigneeRoles[role] ?? ''}
                  onChange={(event) =>
                    setAssigneeRoles((current) => ({
                      ...current,
                      [role]: event.target.value,
                    }))
                  }
                  data-testid={`retroplanning-role-${role}`}
                >
                  <option value="">— Non assigné —</option>
                  {members.map((member) => (
                    <option
                      key={member.workspaceMemberId}
                      value={member.workspaceMemberId}
                    >
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.actionRow}>
        <button
          type="button"
          style={{
            ...styles.primaryButton,
            ...(isPreviewing ? styles.buttonBusy : {}),
          }}
          disabled={isPreviewing}
          onClick={() => void runPreview()}
          data-testid="retroplanning-preview"
        >
          {isPreviewing ? 'Calcul…' : 'Prévisualiser'}
        </button>
        <button
          type="button"
          style={{
            ...(mode === 'REPLACE'
              ? styles.dangerButton
              : styles.primaryButton),
            ...(isApplying || previewResult === null || isStale
              ? styles.buttonBusy
              : {}),
          }}
          disabled={isApplying || previewResult === null || isStale}
          onClick={() => void confirmGeneration()}
          data-testid="retroplanning-confirm"
        >
          {isApplying
            ? 'Génération…'
            : mode === 'REPLACE'
              ? 'Confirmer le remplacement'
              : 'Confirmer la création'}
        </button>
      </div>

      {errorMessage !== null && (
        <span style={styles.error} role="alert">
          {errorMessage}
        </span>
      )}

      {isStale && (
        <span style={styles.notice}>
          Les paramètres ont changé — relancez l’aperçu pour voir le plan à
          jour.
        </span>
      )}

      {previewResult !== null && summary !== null && (
        <>
          <div style={styles.summaryRow}>
            <span>{summary.create} à créer</span>
            <span>{summary.update} à replanifier</span>
            <span>{summary.protected} protégée(s)</span>
            <span>{summary.remove} à supprimer</span>
          </div>

          {mode === 'REPLACE' && previewResult.pendingRemovalCount > 0 && (
            <div style={styles.dangerousPanel} role="note">
              {buildRetroplanningDestructiveSubtitle(
                previewResult.pendingRemovals,
              )}
            </div>
          )}

          {previewResult.preview.warnings.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: theme.spacing4 }}>
              {previewResult.preview.warnings.map((warning) => (
                <li
                  key={`${warning.code}-${warning.taskKeys.join('-')}`}
                  style={styles.error}
                >
                  {warning.message}
                </li>
              ))}
            </ul>
          )}

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.cell}>Tâche</th>
                <th style={styles.cell}>Durée</th>
                <th style={styles.cell}>Début</th>
                <th style={styles.cell}>Échéance</th>
                <th style={styles.cell}>Dépend de</th>
                <th style={styles.cell}>Assigné</th>
                <th style={styles.cell}>Action</th>
                <th style={styles.cell}>Alertes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td
                    style={{
                      ...styles.cell,
                      paddingLeft: `calc(${theme.spacing1} + ${row.depth * 16}px)`,
                    }}
                  >
                    {row.title}
                  </td>
                  <td style={styles.cell}>{row.durationDays} j</td>
                  <td style={styles.cell}>
                    {formatRetroplanningDay(
                      row.startAt,
                      previewResult.preview.timezone,
                      'fr-FR',
                    )}
                  </td>
                  <td style={styles.cell}>
                    {formatRetroplanningDay(
                      row.dueAt,
                      previewResult.preview.timezone,
                      'fr-FR',
                    )}
                  </td>
                  <td style={styles.cell}>
                    {row.dependsOnTitles.join(', ') || '—'}
                  </td>
                  <td style={styles.cell}>
                    {row.assigneeRole === undefined
                      ? '—'
                      : (memberNameById.get(
                          assigneeRoles[row.assigneeRole] ?? '',
                        ) ?? getRetroplanningRoleLabel(row.assigneeRole))}
                  </td>
                  <td style={styles.cell}>
                    {RETROPLANNING_ROW_ACTION_LABELS[row.action]}
                  </td>
                  <td style={{ ...styles.cell, ...styles.warningCell }}>
                    {row.warningCodes
                      .map((code) => WARNING_CODE_LABELS[code] ?? code)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.projectRetroplanning,
  name: 'project-retroplanning',
  description:
    'Rétroplanning de projet : recette, échéance et fuseau, aperçu daté des tâches/sous-tâches avec dépendances et alertes, confirmation de création (APPEND/REPLACE) avec validation destructive explicite.',
  component: ProjectRetroplanning,
});
