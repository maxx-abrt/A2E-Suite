import type { CoreApiClient } from 'twenty-client-sdk/core';

import {
  buildSaveFicheAsTemplatePayload,
  type SourceFiche,
} from './save-fiche-as-template.ts';

// M9b record-action mount (US-137): promote the Bilan fiche the user is looking
// at to a workspace template, one click from the record surface.
//
// The write path every record action shares: read the selected source, run the
// US-119 payload builder, persist a FRESH `isTemplate` fiche. The template is a
// copy, never the source row, so editing the source (or a later instance) can
// never write back to it (C1). Client-injected so the node unit runner can
// exercise the path without a live workspace; the front component supplies
// CoreApiClient.

export type SaveFicheTemplateClient = Pick<CoreApiClient, 'query' | 'mutation'>;

type SourceFicheQueryResult = {
  fiche?: SourceFiche | null;
};

export const saveFicheAsTemplate = async (
  client: SaveFicheTemplateClient,
  ficheId: string,
): Promise<string | null> => {
  const result = (await client.query({
    fiche: {
      __args: { filter: { id: { eq: ficheId } } },
      title: true,
      templateKey: true,
      subtitle: true,
      locale: true,
      fiscalYear: true,
      data: true,
    },
  } as never)) as SourceFicheQueryResult;

  const source = result?.fiche ?? null;

  // Fail closed: an unreadable source creates no template.
  if (source === null) {
    return null;
  }

  const payload = buildSaveFicheAsTemplatePayload(source);

  const created = (await client.mutation({
    createFiches: {
      __args: {
        data: [
          {
            title: payload.title,
            templateKey: payload.templateKey,
            subtitle: payload.subtitle,
            locale: payload.locale,
            fiscalYear: payload.fiscalYear,
            data: payload.data,
            isTemplate: true,
          },
        ],
      },
      id: true,
    },
  } as never)) as { createFiches?: { id?: string }[] };

  return created?.createFiches?.[0]?.id ?? null;
};
