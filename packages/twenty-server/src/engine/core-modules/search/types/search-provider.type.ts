export type SearchProviderParams = {
  searchInput: string;
  limit: number;
  workspaceId: string;
};

export type SearchProviderResultItem = {
  recordId: string;
  label: string;
  description?: string;
  imageUrl?: string;
  // Stable deep link (e.g. /object/<name>/<id> or an app route) so Cmd+K
  // results can open a side panel or page without per-app URL logic.
  path: string;
};

export type SearchProviderResult = {
  items: SearchProviderResultItem[];
};

export type SearchProvider = {
  search(params: SearchProviderParams): Promise<SearchProviderResult>;
};
