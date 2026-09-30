import { useMutation, useQuery } from '@apollo/client/react';
import { useState } from 'react';

import { REMOVE_WORKSPACE_AI_PROVIDER } from '~/pages/settings/ai/graphql/mutations/removeWorkspaceAiProvider';
import { TEST_WORKSPACE_AI_PROVIDER } from '~/pages/settings/ai/graphql/mutations/testWorkspaceAiProvider';
import { UPSERT_WORKSPACE_AI_PROVIDER } from '~/pages/settings/ai/graphql/mutations/upsertWorkspaceAiProvider';
import { GET_WORKSPACE_AI_PROVIDERS } from '~/pages/settings/ai/graphql/queries/getWorkspaceAiProviders';
import { type WorkspaceAiProvidersOverview } from '~/pages/settings/ai/types/WorkspaceAiProviderStatus';
import { type WorkspaceAiProviderTestResult } from '~/pages/settings/ai/types/WorkspaceAiProviderTestResult';

export type UpsertWorkspaceAiProviderValues = {
  provider: string;
  npm: string;
  label?: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  fastModel?: string;
};

export type TestWorkspaceAiProviderValues = {
  provider: string;
  npm: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
};

type WorkspaceAiProvidersData = {
  workspaceAiProviders: WorkspaceAiProvidersOverview;
};

type UpsertWorkspaceAiProviderData = {
  upsertWorkspaceAiProvider: WorkspaceAiProvidersOverview;
};

type RemoveWorkspaceAiProviderData = {
  removeWorkspaceAiProvider: WorkspaceAiProvidersOverview;
};

type TestWorkspaceAiProviderData = {
  testWorkspaceAiProvider: WorkspaceAiProviderTestResult;
};

export const useWorkspaceAiProviders = () => {
  const { data, loading, error } = useQuery<WorkspaceAiProvidersData>(
    GET_WORKSPACE_AI_PROVIDERS,
  );
  const [upsertMutation] = useMutation<
    UpsertWorkspaceAiProviderData,
    { input: UpsertWorkspaceAiProviderValues }
  >(UPSERT_WORKSPACE_AI_PROVIDER);
  const [removeMutation] = useMutation<
    RemoveWorkspaceAiProviderData,
    { provider: string }
  >(REMOVE_WORKSPACE_AI_PROVIDER);
  const [testMutation] = useMutation<
    TestWorkspaceAiProviderData,
    { input: TestWorkspaceAiProviderValues }
  >(TEST_WORKSPACE_AI_PROVIDER);

  // Mutation responses carry the fresh overview, so a refetch is unnecessary;
  // it wins over the query snapshot until the next mount.
  const [latestOverview, setLatestOverview] =
    useState<WorkspaceAiProvidersOverview | null>(null);

  const upsertProvider = async (input: UpsertWorkspaceAiProviderValues) => {
    const { data: mutationData } = await upsertMutation({
      variables: { input },
    });
    const updatedOverview = mutationData?.upsertWorkspaceAiProvider;

    if (updatedOverview) {
      setLatestOverview(updatedOverview);
    }
  };

  const removeProvider = async (provider: string) => {
    const { data: mutationData } = await removeMutation({
      variables: { provider },
    });
    const updatedOverview = mutationData?.removeWorkspaceAiProvider;

    if (updatedOverview) {
      setLatestOverview(updatedOverview);
    }
  };

  const testProvider = async (
    input: TestWorkspaceAiProviderValues,
  ): Promise<WorkspaceAiProviderTestResult | null> => {
    const { data: mutationData } = await testMutation({
      variables: { input },
    });

    return mutationData?.testWorkspaceAiProvider ?? null;
  };

  return {
    overview: latestOverview ?? data?.workspaceAiProviders ?? null,
    loading,
    error,
    upsertProvider,
    removeProvider,
    testProvider,
  };
};
