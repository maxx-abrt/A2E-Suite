import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  applyFolderStructureTemplateByKey,
  type ApplyTemplateRequest,
} from '../lib/apply-template.ts';

// C1 write path (PLAN M9a / US-131).
//
// The gallery's "Use template" calls this by name with the descriptor key it
// listed from `list-template-descriptors`; the apply builds a fresh folder tree
// through the same write the install seeder uses. Validates required apps and
// inputs first, and is idempotent when the caller supplies an operation id. No
// `toolTriggerSettings` (this is a gallery action, not an AI tool).

const readInstalledApplications = async () => {
  const result = await new MetadataApiClient().query({
    findManyApplications: { name: true, universalIdentifier: true },
  });

  return {
    names: result.findManyApplications.map((application) => application.name),
    universalIdentifiers: result.findManyApplications.map(
      (application) => application.universalIdentifier,
    ),
  };
};

const handler = async (payload: ApplyTemplateRequest) =>
  applyFolderStructureTemplateByKey(
    new CoreApiClient(),
    {
      key: typeof payload?.key === 'string' ? payload.key : '',
      inputs: payload?.inputs ?? null,
      operationId: payload?.operationId ?? null,
    },
    { getInstalledApplications: readInstalledApplications },
  );

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.applyTemplate,
  name: 'apply-template',
  description:
    'Applique une structure de dossiers listée par Archive, à partir de sa clé : crée une arborescence de dossiers fraîche (dossiers uniquement) via le chemin de création existant. Vérifie les applications requises et les champs obligatoires ; idempotent lorsque l’appelant fournit un identifiant d’opération.',
  timeoutSeconds: 120,
  handler,
});