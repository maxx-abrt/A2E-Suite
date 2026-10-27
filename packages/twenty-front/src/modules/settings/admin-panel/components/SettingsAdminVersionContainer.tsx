import { SettingsTableCard } from '@/settings/components/SettingsTableCard';
import { useApolloAdminClient } from '@/settings/admin-panel/apollo/hooks/useApolloAdminClient';
import { SettingsAdminVersionDisplay } from '@/settings/admin-panel/components/SettingsAdminVersionDisplay';
import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import {
  IconBrandGithub,
  IconCircleDot,
  IconClock,
  IconGitBranch,
  IconRefresh,
  IconVersions,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useQuery } from '@apollo/client/react';
import { GetVersionInfoDocument } from '~/generated-admin/graphql';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;

  [data-table-row='true'] > div {
    height: auto;
    line-height: 1.5;
    min-height: ${themeCssVariables.spacing[8]};
    min-width: 0;
    overflow-wrap: anywhere;
    padding-block: ${themeCssVariables.spacing[1]};
  }
`;

const StyledStatus = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: 0;
`;

export const SettingsAdminVersionContainer = () => {
  const apolloAdminClient = useApolloAdminClient();
  const { data, loading, error, refetch } = useQuery(GetVersionInfoDocument, {
    client: apolloAdminClient,
    fetchPolicy: 'cache-and-network',
    pollInterval: 10 * 60 * 1000,
    notifyOnNetworkStatusChange: true,
  });
  const isInitialLoad = loading && !data?.versionInfo;
  const {
    currentVersion,
    latestVersion,
    currentRevision,
    currentBuildId,
    builtAt,
    sourceRevision,
    latestRevision,
    latestBuildId,
    repositoryUrl,
    latestBuildUrl,
    checkedAt,
    synchronizationStatus,
  } = data?.versionInfo ?? {};

  const statusLabels: Record<string, string> = {
    CURRENT: t`Running the latest validated revision`,
    BUILD_MISMATCH: t`Same revision, different image build`,
    UPDATE_AVAILABLE: t`A validated update is available`,
    AHEAD: t`Running a revision ahead of the last validated build`,
    DIVERGED: t`Running a different branch; review before updating`,
    DEVELOPMENT: t`Development build; release identity unavailable`,
    UNKNOWN: t`GitHub verification unavailable`,
  };
  const revisionLink = (revision?: string | null) =>
    revision && repositoryUrl
      ? `${repositoryUrl}/commit/${revision}`
      : undefined;
  const buildLabel = (version?: string | null, buildId?: string | null) =>
    version
      ? `${version}${buildId ? ` · ${t`Build`} ${buildId}` : ''}`
      : undefined;

  const versionItems = [
    {
      Icon: IconCircleDot,
      label: t`Current version`,
      value: (
        <SettingsAdminVersionDisplay
          version={buildLabel(currentVersion, currentBuildId)}
          loading={isInitialLoad}
          noVersionMessage={t`Unknown`}
          href={revisionLink(currentRevision)}
        />
      ),
    },
    {
      Icon: IconVersions,
      label: t`Latest validated build`,
      value: (
        <SettingsAdminVersionDisplay
          version={buildLabel(latestVersion, latestBuildId)}
          loading={isInitialLoad}
          noVersionMessage={t`No latest version found`}
          href={latestBuildUrl ?? undefined}
        />
      ),
    },
    {
      Icon: IconGitBranch,
      label: t`Running revision`,
      value: (
        <SettingsAdminVersionDisplay
          version={currentRevision?.slice(0, 12)}
          loading={isInitialLoad}
          noVersionMessage={t`Unknown`}
          href={revisionLink(currentRevision)}
        />
      ),
    },
    {
      Icon: IconBrandGithub,
      label: t`GitHub main`,
      value: (
        <SettingsAdminVersionDisplay
          version={sourceRevision?.slice(0, 12)}
          loading={isInitialLoad}
          noVersionMessage={t`Unavailable`}
          href={revisionLink(sourceRevision)}
        />
      ),
    },
    {
      Icon: IconCircleDot,
      label: t`Deployment status`,
      value: error
        ? t`Version check unavailable`
        : (statusLabels[synchronizationStatus ?? 'UNKNOWN'] ??
          statusLabels.UNKNOWN),
    },
    {
      Icon: IconClock,
      label: t`Image built at`,
      value: builtAt ? (
        <time dateTime={builtAt}>{new Date(builtAt).toLocaleString()}</time>
      ) : (
        t`Unknown`
      ),
    },
    {
      Icon: IconClock,
      label: t`Last verification`,
      value: checkedAt ? (
        <time dateTime={checkedAt}>{new Date(checkedAt).toLocaleString()}</time>
      ) : (
        t`Unknown`
      ),
    },
  ];

  return (
    <StyledContainer>
      <SettingsTableCard
        rounded
        items={versionItems}
        gridAutoColumns="minmax(0, 3fr) minmax(0, 8fr)"
      />
      {sourceRevision &&
        latestRevision &&
        sourceRevision !== latestRevision && (
          <StyledStatus>{t`GitHub main contains changes that have not passed image publication yet.`}</StyledStatus>
        )}
      <StyledStatus>{t`This compares the running image with successful A2E image builds. Checks are cached for ten minutes. Updating requires a deployment.`}</StyledStatus>
      <Button
        title={t`Refresh`}
        ariaLabel={t`Refresh`}
        Icon={IconRefresh}
        variant="secondary"
        disabled={loading}
        isLoading={loading}
        onClick={() => {
          void refetch().catch(() => {});
        }}
      />
    </StyledContainer>
  );
};
