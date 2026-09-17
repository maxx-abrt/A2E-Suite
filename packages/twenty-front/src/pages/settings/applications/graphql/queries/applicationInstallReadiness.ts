import { gql } from '@apollo/client';

// Hand-written document: applicationInstallReadiness is not in the checked-in
// generated metadata yet; regenerate with npx nx run twenty-front:graphql:generate
// against an updated server, then switch to the generated *Document.
export const APPLICATION_INSTALL_READINESS = gql`
  query ApplicationInstallReadiness($universalIdentifiers: [String!]!) {
    applicationInstallReadiness(universalIdentifiers: $universalIdentifiers) {
      universalIdentifier
      registered
      versionCompatible
      currentlyInstalled
      ready
      blockedReason
    }
  }
`;
