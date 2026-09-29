import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { buildDocumentTemplateDescriptors } from '../lib/document-template-descriptors.ts';

// C1 read-only descriptor function (PLAN M9a / US-117).
//
// The gallery (M9a-2) calls this to list the page templates A2E Documents
// ships. It returns descriptors derived from the existing lib constants — no
// engine, no table, no writes, and no `toolTriggerSettings` (this is a data
// source, not an AI tool).
const handler = async () => ({
  templates: buildDocumentTemplateDescriptors(),
});

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.listTemplateDescriptors,
  name: 'list-template-descriptors',
  description:
    'Liste les modèles de pages fournis par A2E Documents au format descripteur C1 (clé, version, libellés fr/en, catégorie, aperçu, apps requises, entrées). Lecture seule.',
  timeoutSeconds: 30,
  handler,
});
