// The zero-AI gate shared by every Syna entry. Provider availability is
// workspace-scoped (it includes the workspace's own BYOK keys), so a
// workspace whose `ClientConfig.aiModels` list is empty but that saved a key
// is not treated as zero-AI. Both inputs fail closed.
export const isSynaAvailable = ({
  hasAiPermissionFlag,
  hasConfiguredAiProvider,
}: {
  hasAiPermissionFlag: boolean;
  hasConfiguredAiProvider: boolean;
}): boolean => hasAiPermissionFlag && hasConfiguredAiProvider;
