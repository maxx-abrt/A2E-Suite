import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import {
  buildProjectTimeRollup,
  formatDuration,
  type ProjectTimeRollup,
  type TimeEntryRecord,
} from '../lib/time-tracker.ts';

// LE DÉCOUPAGE DU TEMPS PAR PROJET.
//
// One Core query loads the project's `timeEntry` rows; the grouping/summing
// is the pure `buildProjectTimeRollup` (lib/time-tracker.ts), so the widget
// stays a rendering shell and the aggregation is unit-proven. It adds no new
// view or rollup field — the native project page hosts it as a widget.

const ENTRIES_PAGE_SIZE = 500;

type RollupProject = {
  id: string;
  name: string | null;
};

type ProjectQueryResult = {
  project?: {
    id: string;
    name: string | null;
    timeEntries?: { edges?: { node: TimeEntryRecord }[] } | null;
  } | null;
};

const appTheme = {
  font: 'var(--t-font-family)',
  text: 'var(--t-font-color-primary)',
  textSecondary: 'var(--t-font-color-secondary)',
  accent: 'var(--t-color-blue)',
  radius: 'var(--t-border-radius-sm)',
  spacing1: 'var(--t-spacing-1)',
  spacing2: 'var(--t-spacing-2)',
} as const;

const ProjectTimeRollupWidget = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const projectId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const [project, setProject] = useState<RollupProject | null>(null);
  const [rollup, setRollup] = useState<ProjectTimeRollup | null>(null);

  const loadRollup = useCallback(async (scopeProjectId: string) => {
    const client = new CoreApiClient();

    const result = (await client.query({
      project: {
        __args: { id: scopeProjectId },
        id: true,
        name: true,
        timeEntries: {
          __args: { first: ENTRIES_PAGE_SIZE },
          edges: {
            node: {
              id: true,
              minutes: true,
              label: true,
              spentAt: true,
              task: { id: true, title: true },
            },
          },
        },
      },
    } as never)) as ProjectQueryResult;

    const loadedProject = result?.project ?? null;

    if (loadedProject === null) {
      setProject(null);
      setRollup(null);
      return;
    }

    const entries =
      loadedProject.timeEntries?.edges?.map((edge) => edge.node) ?? [];

    setProject({ id: loadedProject.id, name: loadedProject.name });
    setRollup(buildProjectTimeRollup(entries));
  }, []);

  useEffect(() => {
    if (projectId === null) {
      setProject(null);
      setRollup(null);
      return;
    }

    void loadRollup(projectId);
  }, [projectId, loadRollup]);

  if (projectId === null || project === null || rollup === null) {
    return null;
  }

  const maxRowMinutes = rollup.rows.reduce(
    (largest, row) => Math.max(largest, row.totalMinutes),
    0,
  );

  return (
    <div
      style={{
        fontFamily: appTheme.font,
        color: appTheme.text,
        display: 'flex',
        flexDirection: 'column',
        gap: appTheme.spacing2,
      }}
    >
      <strong>Temps du projet — {formatDuration(rollup.totalMinutes)}</strong>
      {rollup.rows.length === 0 ? (
        <span style={{ color: appTheme.textSecondary }}>
          Aucun temps enregistré
        </span>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {rollup.rows.map((row) => (
            <li
              key={row.taskId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: appTheme.spacing2,
                padding: appTheme.spacing1,
              }}
            >
              <span style={{ flex: 1 }}>{row.taskTitle}</span>
              <span style={{ color: appTheme.textSecondary }}>
                {row.entryCount} entrée{row.entryCount > 1 ? 's' : ''}
              </span>
              <span style={{ minWidth: 64, textAlign: 'right' }}>
                {formatDuration(row.totalMinutes)}
              </span>
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  height: 6,
                  width:
                    maxRowMinutes === 0
                      ? 0
                      : Math.round((row.totalMinutes / maxRowMinutes) * 80),
                  background: appTheme.accent,
                  borderRadius: appTheme.radius,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.projectTimeRollup,
  name: 'project-time-rollup',
  description:
    'Découpage du temps enregistré sur un projet, par tâche, avec total.',
  component: ProjectTimeRollupWidget,
});
