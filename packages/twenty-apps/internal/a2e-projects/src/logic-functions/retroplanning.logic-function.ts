import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  applyRetroplanning,
  coreClient,
  type ApplyRetroplanningResult,
} from './handlers/apply-retroplanning-handler.ts';

// RÉTROPLANNING (P4.2).
//
// Choisir une recette, fixer l'échéance et le fuseau, prévisualiser les dates
// générées puis confirmer : le même point d'entrée fait l'aperçu et
// l'application. Un rejeu est idempotent (provenance par tâche), et REPLACE ne
// supprime rien sans `confirmedDestructiveChange`.
const handler = async (params: {
  projectId: string;
  recipeKey: string;
  deadline: { date: string; time?: string; timezone: string };
  mode: 'APPEND' | 'REPLACE';
  confirmedDestructiveChange?: boolean;
  assigneeRoles?: Record<string, string>;
}): Promise<ApplyRetroplanningResult> =>
  applyRetroplanning(params, new Date(), coreClient());

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.retroplanning,
  name: 'retroplanning',
  description:
    'Rétroplanifie un projet : choisit une recette, fixe l’échéance et le fuseau, prévisualise les tâches/sous-tâches datées puis génère les tâches standard sans doublon.',
  timeoutSeconds: 120,
  handler,
});
