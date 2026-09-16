import { LazyMarkdownRenderer } from '@/ai/components/LazyMarkdownRenderer';
import { ConfirmationModal } from '@/ui/layout/modal/components/ConfirmationModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { styled } from '@linaria/react';
import { t, plural } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { useState } from 'react';
import { IconCheck, IconDownload, IconTrash, IconUpload } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import {
  type ContentEntry,
  type DeveloperLinks,
  SettingsApplicationAboutSidebar,
} from '@/settings/applications/components/SettingsApplicationAboutSidebar';
import { SettingsApplicationScreenshotGallery } from '@/settings/applications/components/SettingsApplicationScreenshotGallery';
import { ApplicationState } from '~/generated-metadata/graphql';
import {
  type ApplicationUninstallImpact,
  useApplicationUninstallImpact,
} from '~/pages/settings/applications/hooks/useApplicationUninstallImpact';

const UNINSTALL_APPLICATION_MODAL_ID = 'uninstall-application-modal';

type SettingsApplicationDetailAboutTabProps = {
  displayName: string;
  description?: string;
  aboutDescription?: string;
  pricingDescription?: string;
  screenshots?: string[];
  author?: string;
  category?: string;
  contentEntries?: ContentEntry[];
  currentVersion?: string;
  latestAvailableVersion?: string;
  developerLinks?: DeveloperLinks;
  isInstalled: boolean;
  canInstallMarketplaceApps?: boolean;
  onInstall?: () => void;
  isInstalling?: boolean;
  hasUpdate?: boolean;
  onUpgrade?: () => void;
  isUpgrading?: boolean;
  canBeUninstalled?: boolean;
  onUninstall?: () => void;
  isUninstalling?: boolean;
  state?: ApplicationState;
  universalIdentifier?: string;
};

const StyledContentContainer = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledImpactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  margin: ${themeCssVariables.spacing[2]} 0;
  text-align: left;
`;

const StyledImpactLine = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledImpactDangerLine = styled(StyledImpactLine)`
  color: ${themeCssVariables.color.red};
`;

const StyledMainContent = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const StyledMarkdownContent = styled.div`
  .markdown-section {
    margin: 0;
  }

  .markdown-section h4 {
    font-size: ${themeCssVariables.font.size.lg};
    font-weight: ${themeCssVariables.font.weight.semiBold};
    line-height: 1.35;
    margin-bottom: ${themeCssVariables.spacing[2]};
    margin-top: ${themeCssVariables.spacing[5]};
  }

  .markdown-section ul {
    margin-bottom: ${themeCssVariables.spacing[3]};
    margin-top: ${themeCssVariables.spacing[2]};
    padding-left: ${themeCssVariables.spacing[4]};
  }

  .markdown-section li {
    margin-bottom: ${themeCssVariables.spacing[1]} !important;
    padding-bottom: 0 !important;
    padding-top: 0 !important;
  }

  .markdown-section .markdown-code-outer-container {
    margin: ${themeCssVariables.spacing[3]} 0 ${themeCssVariables.spacing[4]};
  }

  .markdown-section .markdown-block-code {
    padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  }

  .markdown-section .markdown-block-code code {
    color: ${themeCssVariables.font.color.primary};
    display: block;
    font-family: ${themeCssVariables.code.font.family}, monospace;
    font-size: ${themeCssVariables.font.size.sm};
    line-height: 1.6;
  }
`;

export const SettingsApplicationDetailAboutTab = ({
  displayName,
  description,
  aboutDescription,
  pricingDescription,
  screenshots,
  author,
  category,
  contentEntries,
  currentVersion,
  latestAvailableVersion,
  developerLinks,
  isInstalled,
  canInstallMarketplaceApps,
  onInstall,
  isInstalling,
  hasUpdate,
  onUpgrade,
  isUpgrading,
  canBeUninstalled,
  onUninstall,
  isUninstalling,
  state,
  universalIdentifier,
}: SettingsApplicationDetailAboutTabProps) => {
  const { openModal } = useModal();
  const [impactUniversalIdentifier, setImpactUniversalIdentifier] =
    useState('');

  // Fetched only once the uninstall flow starts; the query is a C3
  // report surface, not page-mount data.
  const { impact, isLoading: isImpactLoading } = useApplicationUninstallImpact({
    universalIdentifier: impactUniversalIdentifier,
    skip: impactUniversalIdentifier === '',
  });

  const openUninstallModal = () => {
    if (isDefined(universalIdentifier)) {
      setImpactUniversalIdentifier(universalIdentifier);
    }
    openModal(UNINSTALL_APPLICATION_MODAL_ID);
  };

  const hasScreenshots = isDefined(screenshots) && screenshots.length > 0;

  const markdownText =
    aboutDescription ??
    description ??
    t`No description available for this application`;

  const getTransitionalAction = () => {
    switch (state) {
      case ApplicationState.INSTALLING:
        return { Icon: IconDownload, title: t`Installing...` };
      case ApplicationState.UPGRADING:
        return { Icon: IconUpload, title: t`Upgrading...` };
      case ApplicationState.UNINSTALLING:
        return { Icon: IconTrash, title: t`Uninstalling...` };
      default:
        return null;
    }
  };

  const getActionButton = () => {
    if (!canInstallMarketplaceApps) {
      return null;
    }

    const transitionalAction = getTransitionalAction();

    if (isDefined(transitionalAction)) {
      return (
        <Button
          Icon={transitionalAction.Icon}
          title={transitionalAction.title}
          variant={'secondary'}
          accent={'blue'}
          disabled={true}
        />
      );
    }

    if (!isInstalled) {
      return (
        <Button
          Icon={IconDownload}
          title={isInstalling ? t`Installing...` : t`Install`}
          variant={'primary'}
          accent={'blue'}
          onClick={onInstall}
          disabled={isInstalling}
        />
      );
    }

    if (hasUpdate) {
      return (
        <Button
          Icon={IconUpload}
          title={
            isUpgrading
              ? t`Upgrading...`
              : t`Upgrade to ${latestAvailableVersion ?? ''}`
          }
          variant={'secondary'}
          accent={'blue'}
          onClick={onUpgrade}
          disabled={isUpgrading}
        />
      );
    }

    if (canBeUninstalled) {
      return (
        <Button
          Icon={IconTrash}
          title={isUninstalling ? t`Uninstalling...` : t`Uninstall`}
          variant={'secondary'}
          accent={'danger'}
          onClick={openUninstallModal}
          disabled={isUninstalling}
        />
      );
    }

    return (
      <Button
        Icon={IconCheck}
        title={t`Installed`}
        variant={'secondary'}
        accent={'default'}
        disabled={true}
      />
    );
  };

  const confirmationValue = t`yes`;

  const hasImpactData =
    isDefined(impact) &&
    (impact.ownedObjects.length > 0 ||
      impact.ownedFieldsOnStandardObjects.length > 0 ||
      impact.ownedViewsOnStandardObjects.length > 0 ||
      impact.recordLossByObject.some((loss) => loss.recordCount > 0) ||
      impact.crossAppDependents.length > 0);

  const renderImpact = (uninstallImpact: ApplicationUninstallImpact) => {
    const hasOwnedContent =
      uninstallImpact.ownedObjects.length > 0 ||
      uninstallImpact.ownedFieldsOnStandardObjects.length > 0 ||
      uninstallImpact.ownedViewsOnStandardObjects.length > 0;

    return (
      <StyledImpactList>
        {hasOwnedContent && (
          <StyledImpactLine>
            <Trans>Will be deleted:</Trans>
          </StyledImpactLine>
        )}
        {uninstallImpact.ownedObjects.map((ownedObject) => (
          <StyledImpactDangerLine key={ownedObject.universalIdentifier}>
            <Trans>
              All records of the object{' '}
              {ownedObject.nameSingular.replaceAll('_', ' ')}
            </Trans>
          </StyledImpactDangerLine>
        ))}
        {uninstallImpact.recordLossByObject
          .filter((loss) => loss.recordCount > 0)
          .map((loss) => (
            <StyledImpactDangerLine key={loss.objectNameSingular}>
              {plural(loss.recordCount, {
                one: '# record',
                other: '# records',
              })}{' '}
              — {loss.objectNameSingular.replaceAll('_', ' ')}
            </StyledImpactDangerLine>
          ))}
        {uninstallImpact.ownedFieldsOnStandardObjects.map((ownedField) => (
          <StyledImpactLine key={ownedField.universalIdentifier}>
            <Trans>
              Field {ownedField.fieldName} on the object{' '}
              {ownedField.objectNameSingular.replaceAll('_', ' ')}
            </Trans>
          </StyledImpactLine>
        ))}
        {uninstallImpact.ownedViewsOnStandardObjects.map((ownedView) => (
          <StyledImpactLine key={ownedView.universalIdentifier}>
            <Trans>
              View {ownedView.viewName} on the object{' '}
              {ownedView.objectNameSingular.replaceAll('_', ' ')}
            </Trans>
          </StyledImpactLine>
        ))}
        {uninstallImpact.crossAppDependents.map((crossAppDependent, index) => (
          <StyledImpactDangerLine
            key={`${crossAppDependent.dependentApplicationName}-${index}`}
          >
            <Trans>
              {crossAppDependent.dependentApplicationName} depends on:{' '}
              {crossAppDependent.dependency}
            </Trans>
          </StyledImpactDangerLine>
        ))}
      </StyledImpactList>
    );
  };

  return (
    <>
      {hasScreenshots && (
        <SettingsApplicationScreenshotGallery
          screenshots={screenshots}
          displayName={displayName}
        />
      )}

      <StyledContentContainer>
        <StyledMainContent>
          <Section>
            <StyledMarkdownContent>
              <LazyMarkdownRenderer text={markdownText} />
            </StyledMarkdownContent>
          </Section>
        </StyledMainContent>

        <SettingsApplicationAboutSidebar
          actionButton={getActionButton()}
          pricingDescription={pricingDescription}
          author={author}
          category={category}
          contentEntries={contentEntries}
          currentVersion={currentVersion}
          latestAvailableVersion={latestAvailableVersion}
          developerLinks={developerLinks}
        />
      </StyledContentContainer>

      {canBeUninstalled && isDefined(onUninstall) && (
        <ConfirmationModal
          confirmationPlaceholder={confirmationValue}
          confirmationValue={confirmationValue}
          modalInstanceId={UNINSTALL_APPLICATION_MODAL_ID}
          title={t`Uninstall Application?`}
          subtitle={
            <>
              <Trans>
                Uninstalling permanently deletes this application and its
                records. Reinstalling will not restore deleted data.
              </Trans>
              <br />
              <Trans>
                To keep your data but stop seeing this app, remove it from your
                navigation instead.
              </Trans>
              <br />
              {isImpactLoading && (
                <StyledImpactLine>
                  <Trans>Checking what will be deleted...</Trans>
                </StyledImpactLine>
              )}
              {hasImpactData && isDefined(impact) && renderImpact(impact)}
              <br />
              <Trans>
                Please type {`"${confirmationValue}"`} to confirm you want to
                uninstall this application.
              </Trans>
            </>
          }
          onConfirmClick={onUninstall}
          confirmButtonText={t`Uninstall`}
          loading={isUninstalling}
        />
      )}
    </>
  );
};
