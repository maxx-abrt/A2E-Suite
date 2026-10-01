import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  enqueueSnackbar,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import { saveProjectAsTemplate } from '../lib/save-project-template-service.ts';

// ENREGISTRER COMME MODÈLE (M9b, US-137).
//
// Record-scoped action on a project: promotes the selected project (and its
// tasks) to a workspace template — a fresh `isTemplate` project plus fresh task
// rows. `Command` runs `execute` on mount then unmounts, so no UI is rendered.

const SaveProjectAsTemplateCommand = () => {
  const selectedRecordIds = useSelectedRecordIds();

  const execute = async (): Promise<void> => {
    const projectId =
      selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

    if (projectId === null) {
      await enqueueSnackbar({
        message: 'Sélectionnez un projet pour l’enregistrer comme modèle.',
        variant: 'warning',
      });
      return;
    }

    const client = new CoreApiClient();
    const created = await saveProjectAsTemplate(client, projectId);

    if (created === null) {
      await enqueueSnackbar({
        message: 'Enregistrement du modèle impossible.',
        variant: 'error',
      });
      return;
    }

    await enqueueSnackbar({
      message: `Projet enregistré comme modèle (${created.taskIds.length} tâche(s)).`,
      variant: 'success',
    });
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.saveProjectAsTemplateCommand,
  name: 'save-project-as-template-command',
  description:
    'Enregistre le projet sélectionné et ses tâches comme modèle d’espace de travail.',
  component: SaveProjectAsTemplateCommand,
});
