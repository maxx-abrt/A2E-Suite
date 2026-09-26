import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useRecordId } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import {
  buildProjectOverviewSummary,
  formatWorkspaceMemberName,
  type ProjectOverviewMember,
  type ProjectOverviewSummary,
} from '../lib/project-overview.ts';

const COUNTER_LIMIT = 200;
const MEMBER_LIMIT = 50;

type WorkspaceMemberName = {
  firstName?: string | null;
  lastName?: string | null;
};

type OverviewProjectMember = {
  id: string;
  memberRole: string | null;
  workspaceMember?: { name?: WorkspaceMemberName | null } | null;
};

type OverviewProject = {
  id: string;
  name: string;
  key: string | null;
  status: string | null;
  health: string | null;
  tasks?: { edges?: { node: { id: string } }[] } | null;
  milestones?: { edges?: { node: { id: string } }[] } | null;
  timelineActivities?: { edges?: { node: { id: string } }[] } | null;
  documents?: { edges?: { node: { id: string } }[] } | null;
  members?: { edges?: { node: OverviewProjectMember }[] } | null;
};

type ProjectQueryResult = {
  project?: OverviewProject | null;
};

// Overview chip row on the project record page. Data comes from one Core
// query; the widget adds no view system of its own — the page layout's tabs
// own the task/board/file lists, and the pure projection
// (lib/project-overview.ts) owns the health label and member names.
//
// Uses useRecordId() (the single-record variant of useSelectedRecordIds, same
// underlying context) to resolve the current project record. Both hooks read
// from the SDK execution context that the host populates before the worker
// renders, so neither can return a value until the host calls updateContext.
// The useEffect watches projectId and reloads whenever the context updates.
const ProjectOverview = () => {
  // useRecordId returns null when selectedRecordIds is empty or has more than
  // one entry — both signal "not ready yet" for a single-record widget.
  const projectId = useRecordId();

  const [project, setProject] = useState<OverviewProject | null>(null);
  const [summary, setSummary] = useState<ProjectOverviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProject = useCallback(async (scopeProjectId: string) => {
    setIsLoading(true);

    try {
      const client = new CoreApiClient();

      const result = (await client.query({
        project: {
          __args: { id: scopeProjectId },
          id: true,
          name: true,
          key: true,
          status: true,
          health: true,
          tasks: {
            __args: { first: COUNTER_LIMIT },
            edges: { node: { id: true } },
          },
          milestones: {
            __args: { first: COUNTER_LIMIT },
            edges: { node: { id: true } },
          },
          timelineActivities: {
            __args: { first: COUNTER_LIMIT },
            edges: { node: { id: true } },
          },
          documents: {
            __args: { first: COUNTER_LIMIT },
            edges: { node: { id: true } },
          },
          members: {
            __args: { first: MEMBER_LIMIT },
            edges: {
              node: {
                id: true,
                memberRole: true,
                workspaceMember: { name: { firstName: true, lastName: true } },
              },
            },
          },
        },
      } as never)) as ProjectQueryResult;

      const loadedProject = result?.project ?? null;

      if (loadedProject === null) {
        setProject(null);
        setSummary(null);
        return;
      }

      const members: ProjectOverviewMember[] = (
        loadedProject.members?.edges ?? []
      ).map((edge) => ({
        membershipId: edge.node.id,
        role: edge.node.memberRole,
        displayName: formatWorkspaceMemberName(
          edge.node.workspaceMember?.name ?? null,
        ),
      }));

      setProject(loadedProject);
      setSummary(
        buildProjectOverviewSummary({
          health: loadedProject.health,
          taskCount: loadedProject.tasks?.edges?.length ?? 0,
          milestoneCount: loadedProject.milestones?.edges?.length ?? 0,
          activityCount: loadedProject.timelineActivities?.edges?.length ?? 0,
          documentCount: loadedProject.documents?.edges?.length ?? 0,
          members,
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId === null) {
      setProject(null);
      setSummary(null);
      return;
    }

    void loadProject(projectId);
  }, [projectId, loadProject]);

  // Render a skeleton placeholder while waiting for the host context or data.
  // Returning null here would create a blank widget that never shows anything
  // if the context update races with the initial render.
  if (projectId === null || isLoading) {
    return (
      <div style={{ color: 'var(--tw-color-text-tertiary, #888)', padding: 8 }}>
        …
      </div>
    );
  }

  if (project === null || summary === null) {
    return null;
  }

  const chips = [
    `${summary.taskCount} tâches`,
    `${summary.milestoneCount} jalons`,
    `${summary.documentCount} documents`,
    `${summary.memberCount} membres`,
    `${summary.activityCount} activités`,
  ];

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <span>
        {project.key !== null && project.key !== '' ? `${project.key} · ` : ''}
        {project.name} — {project.status ?? ''}
      </span>
      <span>Santé : {summary.healthLabel}</span>
      {chips.map((chip) => (
        <span key={chip}>{chip}</span>
      ))}
      {summary.members.length > 0 && (
        <span>
          Équipe : {summary.members.map((m) => m.displayName).join(', ')}
        </span>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.projectOverview,
  name: 'project-overview-widget',
  description:
    'Aperçu du projet : clé, statut, santé, compteurs de tâches/jalons/documents/membres/activités et équipe depuis les données natives.',
  component: ProjectOverview,
});
