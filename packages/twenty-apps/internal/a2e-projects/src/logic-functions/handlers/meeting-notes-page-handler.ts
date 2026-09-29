import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  deriveMeetingNotesCorrelationKey,
  deriveMeetingNotesDocumentTitle,
  MEETING_NOTES_DOCUMENT_KIND,
} from '../../lib/meeting-notes-recipe.ts';

// L'ÉTAPE « CRÉER LA PAGE DE NOTES » DE LA RECETTE RÉUNION (US-107).
//
// Le workflow « réunion → page de notes » déclenche cette action via son
// événement de base de données natif puis exécute ce logic function comme
// n'importe quelle autre étape : pas de second bus d'événements, pas de second
// moteur. La page créée appartient à A2E Documents (objet `document`).
//
// Idempotence sans intention cachée : la clé de corrélation C5 est persistée
// dans `recipeCorrelationKey`; avant de créer, on cherche une page qui la
// porte déjà. Un rejeu du déclencheur (retry, relivraison) retrouve donc la
// page existante et ne la duplique pas.

export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

export type MeetingNotesPageInput = {
  eventId?: string;
  eventTitle?: string | null;
  workspaceId?: string | null;
};

export type MeetingNotesPageStatus =
  | 'CREATED'
  | 'ALREADY_EXISTS'
  | 'INVALID_INPUT';

export type MeetingNotesPageResult = {
  status: MeetingNotesPageStatus;
  documentId: string | null;
  correlationKey: string | null;
};

export const coreClient = (): CoreApiClient => new CoreApiClient();

const findDocumentIdByCorrelationKey = async (
  client: CoreClientLike,
  correlationKey: string,
): Promise<string | undefined> => {
  const result = (await client.query({
    documents: {
      __args: {
        filter: { recipeCorrelationKey: { eq: correlationKey } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  } as never)) as { documents?: { edges?: { node: { id: string } }[] } };

  return result?.documents?.edges?.[0]?.node?.id;
};

export const createMeetingNotesPage = async (
  input: MeetingNotesPageInput,
  client: CoreClientLike = coreClient(),
): Promise<MeetingNotesPageResult> => {
  const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : '';

  if (eventId === '') {
    return { status: 'INVALID_INPUT', documentId: null, correlationKey: null };
  }

  const correlationKey = deriveMeetingNotesCorrelationKey({
    sourceRecordId: eventId,
    workspaceId: input.workspaceId,
  });
  const existingDocumentId = await findDocumentIdByCorrelationKey(
    client,
    correlationKey,
  );

  if (existingDocumentId !== undefined) {
    return {
      status: 'ALREADY_EXISTS',
      documentId: existingDocumentId,
      correlationKey,
    };
  }

  const result = (await client.mutation({
    createDocuments: {
      __args: {
        data: [
          {
            title: deriveMeetingNotesDocumentTitle(input.eventTitle),
            kind: MEETING_NOTES_DOCUMENT_KIND,
            recipeCorrelationKey: correlationKey,
            tags: ['MEETING_NOTES'],
            position: 'V',
          },
        ],
      },
      id: true,
    },
  } as never)) as { createDocuments?: { id: string }[] };

  return {
    status: 'CREATED',
    documentId: result?.createDocuments?.[0]?.id ?? null,
    correlationKey,
  };
};
