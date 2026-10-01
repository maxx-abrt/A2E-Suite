import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  enqueueSnackbar,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import { saveDocumentAsTemplate } from '../lib/save-document-template-service.ts';

// ENREGISTRER COMME MODÈLE (M9b, US-137).
//
// Record-scoped action on a document: promotes the selected document to a
// workspace template (kind TEMPLATE, fresh row) and reports the outcome.
// `Command` runs `execute` on mount then unmounts, so no UI is rendered — the
// same pattern as the save-as-document record action.

const SaveDocumentAsTemplateCommand = () => {
  const selectedRecordIds = useSelectedRecordIds();

  const execute = async (): Promise<void> => {
    const documentId =
      selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

    if (documentId === null) {
      await enqueueSnackbar({
        message: 'Sélectionnez un document pour l’enregistrer comme modèle.',
        variant: 'warning',
      });
      return;
    }

    const client = new CoreApiClient();
    const templateId = await saveDocumentAsTemplate(client, documentId);

    if (templateId === null) {
      await enqueueSnackbar({
        message: 'Enregistrement du modèle impossible.',
        variant: 'error',
      });
      return;
    }

    await enqueueSnackbar({
      message: 'Document enregistré comme modèle.',
      variant: 'success',
    });
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.saveDocumentAsTemplateCommand,
  name: 'save-document-as-template-command',
  description:
    'Enregistre le document sélectionné comme modèle d’espace de travail.',
  component: SaveDocumentAsTemplateCommand,
});
