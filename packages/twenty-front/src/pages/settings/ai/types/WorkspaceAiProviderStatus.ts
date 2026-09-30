export type WorkspaceAiProviderSource = 'WORKSPACE' | 'INSTANCE' | 'CATALOG';

// Projection of the server's key-safe provider DTO: the API key itself never
// travels, only its presence and a fixed mask.
export type WorkspaceAiProviderStatus = {
  provider: string;
  label: string | null;
  npm: string;
  baseUrl: string | null;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  apiKeyConfigVariable: string | null;
  source: WorkspaceAiProviderSource;
  isCatalogProvider: boolean;
  defaultModel: string | null;
  fastModel: string | null;
  models: string[];
};

export type WorkspaceAiProvidersOverview = {
  resolutionOrder: WorkspaceAiProviderSource[];
  providers: WorkspaceAiProviderStatus[];
};
