import { gql } from '@apollo/client';

// Hand-written document: applicationUninstallImpact is not in the checked-in
// generated metadata yet; regenerate with npx nx run twenty-front:graphql:generate
// against an updated server, then switch to the generated *Document.
export const APPLICATION_UNINSTALL_IMPACT = gql`
  query ApplicationUninstallImpact($universalIdentifier: String!) {
    applicationUninstallImpact(universalIdentifier: $universalIdentifier) {
      ownedObjects {
        universalIdentifier
        nameSingular
      }
      ownedFieldsOnStandardObjects {
        universalIdentifier
        objectNameSingular
        fieldName
      }
      ownedViewsOnStandardObjects {
        universalIdentifier
        objectNameSingular
        viewName
      }
      recordLossByObject {
        objectNameSingular
        recordCount
      }
      crossAppDependents {
        dependentApplicationName
        dependency
      }
    }
  }
`;
