import { defineFrontComponent } from 'twenty-sdk/define';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';
import { createSaveRecordAsDocumentCommand } from './save-record-as-document-command.factory.tsx';

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.saveCompanyAsDocumentCommand,
  name: 'save-company-as-document-command',
  description:
    'Crée un document à partir du contenu des notes de l’entreprise sélectionnée et ouvre sa page.',
  component: createSaveRecordAsDocumentCommand('company'),
});
