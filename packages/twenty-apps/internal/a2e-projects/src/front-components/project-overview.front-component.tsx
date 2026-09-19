import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';

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
const ProjectOverview = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const projectId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const [project, setProject] = useState<OverviewProject | null>(null);
  const [summary, setSummary] = useState<ProjectOverviewSummary | null>(null);

  const loadProject = useCallback(async (scopeProjectId: string) => {
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
  }, []);

  useEffect(() => {
    if (projectId === null) {
      setProject(null);
      setSummary(null);
      return;
    }

    void loadProject(projectId);
  }, [projectId, loadProject]);

  if (projectId === null || project === null || summary === null) {
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
