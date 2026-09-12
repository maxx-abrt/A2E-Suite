import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

type OverviewProject = {
  id: string;
  name: string;
  key: string | null;
  status: string | null;
  tasks?: { edges?: unknown[] } | null;
  milestones?: { edges?: unknown[] } | null;
};

type ProjectQueryResult = {
  project?: OverviewProject | null;
};

// Overview chip row on the project record page. Data comes from one Core
// query; the widget adds no view system of its own — the page layout's
// RECORD_TABLE widgets own task/milestone/label lists.
const ProjectOverview = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const projectId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const [project, setProject] = useState<OverviewProject | null>(null);

  const loadProject = useCallback(async () => {
    if (projectId === null) {
      return;
    }

    const client = new CoreApiClient();

    const result = await client.query({
      project: {
        __args: { id: projectId },
        id: true,
        name: true,
        key: true,
        status: true,
        tasks: { edges: { node: { id: true } } },
        milestones: { edges: { node: { id: true } } },
      },
    } as never);

    setProject((result as ProjectQueryResult).project ?? null);
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  if (projectId === null || project === null) {
    return null;
  }

  const taskCount = project.tasks?.edges?.length ?? 0;
  const milestoneCount = project.milestones?.edges?.length ?? 0;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <span>
        {project.key !== null && project.key !== ''
          ? `${project.key} · `
          : ''}
        {project.name} — {project.status ?? ''}
      </span>
      <span>{taskCount} tâches</span>
      <span>{milestoneCount} jalons</span>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: 'c31a0000-0013-4000-8000-000000000006',
  name: 'project-overview-widget',
  description:
    "Aperçu du projet : clé, statut et compteurs de tâches/jalons depuis les données natives.",
  component: ProjectOverview,
});
