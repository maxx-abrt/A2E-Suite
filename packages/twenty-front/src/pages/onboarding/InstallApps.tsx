import { A2eWorkspaceTemplatePicker } from '@/a2e-workspace/components/A2eWorkspaceTemplatePicker';
import { A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS } from '@/a2e-workspace/constants/A2eSuiteApplicationUniversalIdentifiers';
import { A2E_WORKSPACE_TEMPLATE_OPTIONS } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { onboardingConfigState } from '@/client-config/states/onboardingConfigState';
import { useMarketplaceApps } from '@/marketplace/hooks/useMarketplaceApps';
import { ONBOARDING_INSTALLABLE_APPS } from '@/onboarding/constants/OnboardingInstallableApps';
import { InstallAppsAutoSkipEffect } from '@/onboarding/effect-components/InstallAppsAutoSkipEffect';
import { useInstallOnboardingApps } from '@/onboarding/hooks/useInstallOnboardingApps';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useCallback, useState } from 'react';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { InstallAppsContent } from '~/pages/onboarding/InstallAppsContent';

const ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS =
  ONBOARDING_INSTALLABLE_APPS.map((app) => app.universalIdentifier);

export const InstallApps = () => {
  const {
    data: marketplaceApps,
    isLoading,
    error,
  } = useMarketplaceApps({
    universalIdentifiers: ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS,
  });
  const onboardingConfig = useAtomStateValue(onboardingConfigState);
  const {
    selectedUniversalIdentifiers,
    isCompleting,
    toggleApp,
    installSelectedAppsAndContinue,
    skip,
  } = useInstallOnboardingApps();
  const [hasAutoSkipFailed, setHasAutoSkipFailed] = useState(false);

  const availableApps = ONBOARDING_INSTALLABLE_APPS.flatMap((app) => {
    // isVetted gates Twenty's public marketplace; first-party A2E apps are
    // published on this server's private registry and must never be filtered
    // by it.
    const isA2eApp = A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS.includes(
      app.universalIdentifier,
    );
    const marketplaceApp = marketplaceApps.find(
      (marketplaceApp) =>
        marketplaceApp.id === app.universalIdentifier &&
        (isA2eApp || marketplaceApp.isVetted),
    );

    return isDefined(marketplaceApp)
      ? [{ ...app, logoUrl: marketplaceApp.logoUrl ?? null }]
      : [];
  });

  const handleAutoSkipError = useCallback(() => {
    setHasAutoSkipFailed(true);
  }, []);

  if (isLoading) {
    return null;
  }

  const hasLoadedAvailabilitySuccessfully = !isDefined(error);
  const shouldAutoSkip =
    hasLoadedAvailabilitySuccessfully &&
    !isNonEmptyArray(availableApps) &&
    !hasAutoSkipFailed;

  if (shouldAutoSkip) {
    return <InstallAppsAutoSkipEffect onError={handleAutoSkipError} />;
  }

  return (
    <InstallAppsContent
      apps={availableApps}
      selectedUniversalIdentifiers={selectedUniversalIdentifiers}
      creditsRewardPerApp={onboardingConfig?.installAppsCreditsRewardPerApp}
      isCompleting={isCompleting}
      onToggleApp={toggleApp}
      onInstall={installSelectedAppsAndContinue}
      onSkip={skip}
      templatePicker={
        <A2eWorkspaceTemplatePicker options={A2E_WORKSPACE_TEMPLATE_OPTIONS} />
      }
    />
  );
};
