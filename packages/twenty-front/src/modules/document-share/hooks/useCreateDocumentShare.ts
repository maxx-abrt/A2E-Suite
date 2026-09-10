import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

import { encryptShareBody } from '~/modules/document-share/utils/deriveShareAesGcmKey';

const CREATE_DOCUMENT_SHARE = gql`
  mutation CreateDocumentShare(
    $createDocumentShareInput: CreateDocumentShareInput!
  ) {
    createDocumentShare(createDocumentShareInput: $createDocumentShareInput) {
      id
      shareToken
      documentRecordId
      expiresAt
      isPassphraseProtected
      createdAt
    }
  }
`;

const DELETE_DOCUMENT_SHARE = gql`
  mutation DeleteDocumentShare($shareToken: String!) {
    deleteDocumentShare(shareToken: $shareToken)
  }
`;

type CreatedDocumentShare = {
  id: string;
  shareToken: string;
  documentRecordId: string;
  expiresAt: string | null;
  isPassphraseProtected: boolean;
  createdAt: string;
};

type CreateDocumentShareMutationData = {
  createDocumentShare: CreatedDocumentShare;
};

type CreateDocumentShareMutationVariables = {
  createDocumentShareInput: {
    documentRecordId: string;
    titleSnapshot: string;
    bodySnapshot: string;
    encryptedBody?: string | null;
    bodyIv?: string | null;
    bodySalt?: string | null;
    expiresAt?: string | null;
  };
};

export type CreateDocumentShareArgs = {
  documentRecordId: string;
  titleSnapshot: string;
  bodySnapshot: string;
  // When set, the body snapshot is encrypted client-side before upload; the
  // passphrase itself is never transmitted (Bureau pattern).
  passphrase?: string;
  expiresAt?: Date;
};

type DeleteDocumentShareMutationData = {
  deleteDocumentShare: boolean;
};

type DeleteDocumentShareMutationVariables = {
  shareToken: string;
};

export const useCreateDocumentShare = () => {
  const [createDocumentShareMutation] = useMutation<
    CreateDocumentShareMutationData,
    CreateDocumentShareMutationVariables
  >(CREATE_DOCUMENT_SHARE);

  const createDocumentShare = async ({
    documentRecordId,
    titleSnapshot,
    bodySnapshot,
    passphrase,
    expiresAt,
  }: CreateDocumentShareArgs): Promise<CreatedDocumentShare> => {
    const encryptedBody =
      passphrase === undefined
        ? null
        : await encryptShareBody(bodySnapshot, passphrase);

    const { data } = await createDocumentShareMutation({
      variables: {
        createDocumentShareInput: {
          documentRecordId,
          titleSnapshot,
          bodySnapshot: passphrase === undefined ? bodySnapshot : '',
          encryptedBody: encryptedBody?.encryptedBody ?? null,
          bodyIv: encryptedBody?.bodyIv ?? null,
          bodySalt: encryptedBody?.bodySalt ?? null,
          expiresAt: expiresAt?.toISOString() ?? null,
        },
      },
    });

    if (!data?.createDocumentShare) {
      throw new Error('Document share creation returned no data');
    }

    return data.createDocumentShare;
  };

  return { createDocumentShare };
};

export const useDeleteDocumentShare = () => {
  const [deleteDocumentShareMutation] = useMutation<
    DeleteDocumentShareMutationData,
    DeleteDocumentShareMutationVariables
  >(DELETE_DOCUMENT_SHARE);

  const deleteDocumentShare = async (shareToken: string): Promise<void> => {
    await deleteDocumentShareMutation({ variables: { shareToken } });
  };

  return { deleteDocumentShare };
};
