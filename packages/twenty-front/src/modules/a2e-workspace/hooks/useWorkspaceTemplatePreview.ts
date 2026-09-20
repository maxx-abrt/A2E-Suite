import { useQuery } from '@apollo/client/react';

import { WORKSPACE_TEMPLATE_PREVIEW } from '@/a2e-workspace/graphql/queries/workspaceTemplatePreview';
import { type A2eWorkspaceTemplate } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { type TemplatePreview } from '@/a2e-workspace/types/apply-template-operation.types';

type WorkspaceTemplatePreviewQueryData = {
  workspaceTemplatePreview: TemplatePreview;
};

type WorkspaceTemplatePreviewQueryVariables = {
  template: A2eWorkspaceTemplate;
};

export const useWorkspaceTemplatePreview = ({
  template,
}: {
  template: A2eWorkspaceTemplate | null;
}) => {
  const { data, loading, error, refetch } = useQuery<
    WorkspaceTemplatePreviewQueryData,
    WorkspaceTemplatePreviewQueryVariables
  >(WORKSPACE_TEMPLATE_PREVIEW, {
    variables: { template: template ?? 'CRM' },
    // 'CRM' is the no-op default; skip fetching until a real template is
    // selected so the picker does not query on mount for every option.
    skip: template === null,
  });

  return {
    preview: data?.workspaceTemplatePreview ?? null,
    isLoading: loading && template !== null,
    error,
    refetch,
  };
};
