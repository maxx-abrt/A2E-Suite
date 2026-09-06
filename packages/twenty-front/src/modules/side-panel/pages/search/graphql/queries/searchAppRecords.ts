import { gql } from '@apollo/client';

// Hand-written document (schema on running servers only — same pattern as
// APPLY_WORKSPACE_TEMPLATE); swap to the generated document after running
// npx nx run twenty-front:graphql:generate against an updated server.
export const SEARCH_APP_RECORDS_QUERY = gql`
  query SearchAppRecords($searchInput: String!) {
    searchAppRecords(searchInput: $searchInput) {
      appUniversalIdentifier
      records {
        recordId
        label
        description
        imageUrl
        path
      }
    }
  }
`;
