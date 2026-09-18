// The install-apps onboarding step also hosts the workspace-template picker.
// Auto-skipping an empty app catalogue would skip past that picker and silently
// discard the template choice, so the step is only auto-skipped when there is
// nothing to choose at all (no apps to install and no template offered).
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
}): boolean =>
  hasLoadedAppsSuccessfully &&
  availableAppCount === 0 &&
  !hasTemplateChoices &&
  !hasAutoSkipFailed;
