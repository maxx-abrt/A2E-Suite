// The install-apps onboarding step also hosts the workspace-template picker.
// Auto-skipping an empty app catalogue would skip past that picker and silently
// discard the template choice, so the step is only auto-skipped when there is
// nothing to choose at all (no apps to install and no template offered).
// Availability must be positively proven: an unloaded or errored catalogue
// (`hasLoadedAppsSuccessfully` false) is not an empty one, and a failed
// availability fetch must never bypass the picker.
export const shouldAutoSkipInstallAppsStep = ({
  hasLoadedAppsSuccessfully,
  availableAppCount,
  hasTemplateChoices,
  hasAutoSkipFailed,
}: {
  hasLoadedAppsSuccessfully: boolean;
  availableAppCount: number;
  hasTemplateChoices: boolean;
  hasAutoSkipFailed: boolean;
}): boolean => {
  const isCatalogueProvenEmpty =
    hasLoadedAppsSuccessfully && availableAppCount === 0;

  if (!isCatalogueProvenEmpty) {
    return false;
  }

  // Empty catalogue with template choices available: the step stays so the
  // choice is never discarded (PLAN.md P1.6c).
  return !hasTemplateChoices && !hasAutoSkipFailed;
};
