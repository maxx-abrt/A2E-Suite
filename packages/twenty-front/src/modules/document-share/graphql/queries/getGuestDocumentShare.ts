import { gql } from '@apollo/client';

export const GET_GUEST_DOCUMENT_SHARE = gql`
  query GetGuestDocumentShare($shareToken: String!) {
    getGuestDocumentShare(shareToken: $shareToken) {
      documentRecordId
      titleSnapshot
      bodySnapshot
      encryptedBody
      bodyIv
      bodySalt
      isPassphraseProtected
    }
  }
`;
