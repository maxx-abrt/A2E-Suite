import { gql } from '@apollo/client';

export const FIND_STANDALONE_PAGE_LAYOUT_LINKS = gql`
  query FindStandalonePageLayoutLinks {
    getPageLayouts(pageLayoutType: STANDALONE_PAGE) {
      id
      universalIdentifier
    }
  }
`;
