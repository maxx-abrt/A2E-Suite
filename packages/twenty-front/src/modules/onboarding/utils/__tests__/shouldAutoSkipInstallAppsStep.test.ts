import { shouldAutoSkipInstallAppsStep } from '@/onboarding/utils/shouldAutoSkipInstallAppsStep';

const baseArgs = {
  hasLoadedAppsSuccessfully: true,
  availableAppCount: 0,
  hasTemplateChoices: false,
  hasAutoSkipFailed: false,
};

describe('shouldAutoSkipInstallAppsStep', () => {
  it('auto-skips an empty catalogue when no template choice is offered', () => {
    expect(shouldAutoSkipInstallAppsStep(baseArgs)).toBe(true);
  });

  it('never auto-skips while template choices are offered, even on an empty catalogue', () => {
    expect(
      shouldAutoSkipInstallAppsStep({
        ...baseArgs,
        hasTemplateChoices: true,
      }),
    ).toBe(false);
  });

  it('does not auto-skip while apps are available', () => {
    expect(
      shouldAutoSkipInstallAppsStep({
        ...baseArgs,
        availableAppCount: 2,
      }),
    ).toBe(false);
  });

  it('does not auto-skip before availability has loaded successfully', () => {
    expect(
      shouldAutoSkipInstallAppsStep({
        ...baseArgs,
        hasLoadedAppsSuccessfully: false,
      }),
    ).toBe(false);
  });

  it('stops retrying the auto-skip after an error', () => {
    expect(
      shouldAutoSkipInstallAppsStep({
        ...baseArgs,
        hasAutoSkipFailed: true,
      }),
    ).toBe(false);
  });
});
