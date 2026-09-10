import { useQuery } from '@apollo/client/react';

import { GET_GUEST_DOCUMENT_SHARE } from '~/modules/document-share/graphql/queries/getGuestDocumentShare';

// Hand-written until the GraphQL schema codegen regenerates with the
// document-share module; kept structurally identical to GuestDocumentShareDTO.
export type GuestDocumentShare = {
  documentRecordId: string;
  titleSnapshot: string;
  bodySnapshot: string | null;
  encryptedBody: string | null;
  bodyIv: string | null;
  bodySalt: string | null;
  isPassphraseProtected: boolean;
};

type GuestDocumentShareQueryData = {
  getGuestDocumentShare: GuestDocumentShare;
};

type GuestDocumentShareQueryVariables = {
  shareToken: string;
};

export const useGuestDocumentShare = (shareToken: string) => {
  const { data, loading, error } = useQuery<
    GuestDocumentShareQueryData,
    GuestDocumentShareQueryVariables
  >(GET_GUEST_DOCUMENT_SHARE, {
    variables: { shareToken },
    // Share links are immutable snapshots; no cache churn on refocus.
    fetchPolicy: 'network-only',
  });

  return {
    guestShare: data?.getGuestDocumentShare,
    guestShareLoading: loading,
    guestShareError: error,
  };
};
