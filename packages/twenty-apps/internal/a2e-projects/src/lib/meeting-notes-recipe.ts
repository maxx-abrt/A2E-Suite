// Recette « réunion → page de notes » (US-107, famille M9c).
//
// Partie pure : à partir d'un événement de calendrier, elle dérive la clé de
// corrélation C5 puis le plan d'écritures (une page Bureau). Le plan est
// calculable sans moteur ni Core API — c'est ce qui permet de prévisualiser
// les écritures avant d'activer la recette.
//
// L'action réelle (logic function) crée un `document` d'A2E Documents ; la
// page n'est jamais un doublon d'un rejeu grâce à la provenance persistée.
// Aucune seconde file d'événements : la recette emprunte le vocabulaire du
// moteur de workflow natif (déclencheur DATABASE_EVENT + étape LOGIC_FUNCTION).

import {
  deriveRecipeCorrelationKey,
  type RecipeCorrelationSource,
} from './recipe-correlation.ts';

export const MEETING_NOTES_RECIPE_KEY = 'meeting-notes';
export const MEETING_NOTES_RECIPE_VERSION = 1;

export const MEETING_NOTES_SOURCE_OBJECT = 'calendarEvent';

// Le type de document de la page générée. A2E Documents distingue déjà
// DOCUMENT, TEMPLATE, NOTE (options du champ `kind`) ; on ne crée jamais un
// modèle depuis une recette, seulement un document ordinaire.
export const MEETING_NOTES_DOCUMENT_KIND = 'DOCUMENT';

export const MEETING_NOTES_FALLBACK_TITLE = 'Notes de réunion';

export type MeetingEventSnapshot = {
  id: string;
  title?: string | null;
};

export type MeetingNotesRecipeInput = {
  event: MeetingEventSnapshot;
  workspaceId?: string | null;
};

export type MeetingNotesDocumentWrite = {
  kind: 'CREATE_DOCUMENT';
  correlationKey: string;
  writes: {
    object: 'document';
    title: string;
    kind: typeof MEETING_NOTES_DOCUMENT_KIND;
    recipeCorrelationKey: string;
  };
};

export type MeetingNotesRecipePlan = {
  correlationKey: string;
  steps: MeetingNotesDocumentWrite[];
};

export const deriveMeetingNotesCorrelationKey = (
  source: Omit<RecipeCorrelationSource, 'recipeKey' | 'version' | 'sourceObject'>,
): string =>
  deriveRecipeCorrelationKey({
    recipeKey: MEETING_NOTES_RECIPE_KEY,
    version: MEETING_NOTES_RECIPE_VERSION,
    sourceObject: MEETING_NOTES_SOURCE_OBJECT,
    workspaceId: source.workspaceId,
    sourceRecordId: source.sourceRecordId,
  });

export const deriveMeetingNotesDocumentTitle = (
  eventTitle: string | null | undefined,
): string => {
  const trimmed = (eventTitle ?? '').trim();

  return trimmed.length > 0
    ? `${MEETING_NOTES_FALLBACK_TITLE} – ${trimmed}`
    : MEETING_NOTES_FALLBACK_TITLE;
};

export const buildMeetingNotesRecipePlan = (
  input: MeetingNotesRecipeInput,
): MeetingNotesRecipePlan => {
  const correlationKey = deriveMeetingNotesCorrelationKey({
    sourceRecordId: input.event.id,
    workspaceId: input.workspaceId,
  });

  return {
    correlationKey,
    steps: [
      {
        kind: 'CREATE_DOCUMENT',
        correlationKey,
        writes: {
          object: 'document',
          title: deriveMeetingNotesDocumentTitle(input.event.title),
          kind: MEETING_NOTES_DOCUMENT_KIND,
          recipeCorrelationKey: correlationKey,
        },
      },
    ],
  };
};
