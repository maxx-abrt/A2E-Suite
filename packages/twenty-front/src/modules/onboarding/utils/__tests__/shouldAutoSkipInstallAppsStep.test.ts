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

  it('never auto-skips an unproven empty catalogue, so a network error cannot discard the template choice', () => {
    expect(
      shouldAutoSkipInstallAppsStep({
        hasLoadedAppsSuccessfully: false,
        availableAppCount: 0,
        hasTemplateChoices: true,
        hasAutoSkipFailed: false,
      }),
    ).toBe(false);
  });

  it('never auto-skips an errored catalogue even when no apps and no templates are known', () => {
    expect(
      shouldAutoSkipInstallAppsStep({
        hasLoadedAppsSuccessfully: false,
        availableAppCount: 0,
        hasTemplateChoices: false,
        hasAutoSkipFailed: false,
      }),
    ).toBe(false);
  });
});
