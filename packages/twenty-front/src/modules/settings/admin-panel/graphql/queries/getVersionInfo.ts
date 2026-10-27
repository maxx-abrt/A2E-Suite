import { gql } from '@apollo/client';

export const GET_VERSION_INFO = gql`
  query GetVersionInfo {
    versionInfo {
      currentVersion
      latestVersion
      currentRevision
      currentBuildId
      builtAt
      sourceRevision
      latestRevision
      latestBuildId
      repositoryUrl
      latestBuildUrl
      checkedAt
      synchronizationStatus
    }
  }
`;
