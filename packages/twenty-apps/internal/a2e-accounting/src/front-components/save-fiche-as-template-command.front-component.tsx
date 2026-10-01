import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  enqueueSnackbar,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import { saveFicheAsTemplate } from '../lib/save-fiche-template-service.ts';

// ENREGISTRER COMME MODÈLE (M9b, US-137).
//
// Record-scoped action on a Bilan fiche: promotes the selected fiche to a
// workspace template — a fresh `isTemplate` row holding the layout only (status,
// dates, exports, amounts and the saved-subvention link stay on the live fiche).
// `Command` runs `execute` on mount then unmounts, so no UI is rendered.

const SaveFicheAsTemplateCommand = () => {
  const selectedRecordIds = useSelectedRecordIds();

  const execute = async (): Promise<void> => {
    const ficheId =
      selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

    if (ficheId === null) {
      await enqueueSnackbar({
        message: 'Sélectionnez une fiche pour l’enregistrer comme modèle.',
        variant: 'warning',
      });
      return;
    }

    const client = new CoreApiClient();
    const templateId = await saveFicheAsTemplate(client, ficheId);

    if (templateId === null) {
      await enqueueSnackbar({
        message: 'Enregistrement du modèle impossible.',
        variant: 'error',
      });
      return;
    }

    await enqueueSnackbar({
      message: 'Fiche enregistrée comme modèle.',
      variant: 'success',
    });
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.saveFicheAsTemplateCommand,
  name: 'save-fiche-as-template-command',
  description:
    'Enregistre la fiche Bilan sélectionnée comme modèle d’espace de travail.',
  component: SaveFicheAsTemplateCommand,
});
