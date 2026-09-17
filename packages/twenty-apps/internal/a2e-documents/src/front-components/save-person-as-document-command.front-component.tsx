import { defineFrontComponent } from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import { createSaveRecordAsDocumentCommand } from './save-record-as-document-command.factory.tsx';

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.savePersonAsDocumentCommand,
  name: 'save-person-as-document-command',
  description:
    'Crée un document à partir du contenu des notes de la personne sélectionnée et ouvre sa page.',
  component: createSaveRecordAsDocumentCommand('person'),
});
