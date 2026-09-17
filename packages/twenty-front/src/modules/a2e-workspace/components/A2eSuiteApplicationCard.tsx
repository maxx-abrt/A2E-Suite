import { useInstallMarketplaceApp } from '@/marketplace/hooks/useInstallMarketplaceApp';
import {
  StyledSettingsCardContent,
  StyledSettingsCardThirdLine,
  StyledSettingsCardTitle,
} from '@/settings/components/SettingsOptions/SettingsCardContentBase';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Avatar } from 'twenty-ui/data-display';
import { IconDownload } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { Card } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { isDefined } from 'twenty-shared/utils';
import { type MarketplaceApp } from '~/generated-metadata/graphql';
import { type ApplicationInstallReadiness } from '~/pages/settings/applications/hooks/useApplicationInstallReadiness';

type A2eSuiteApplicationCardProps = {
  application: MarketplaceApp;
  readiness?: ApplicationInstallReadiness | null;
};

const StyledLinkContainer = styled.div`
  > a {
    display: flex;
    height: 100%;
    text-decoration: none;
  }
`;

const StyledDescription = styled.div`
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: ${themeCssVariables.font.color.secondary};
  display: -webkit-box;

  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  overflow: hidden;
`;

const StyledFooterContainer = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

const StyledBlockedReason = styled.span`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.sm};
`;

export const A2eSuiteApplicationCard = ({
  application,
  readiness,
}: A2eSuiteApplicationCardProps) => {
  const { install, isInstalling } = useInstallMarketplaceApp();

  // Readiness is unknown until its query resolves; only a resolved report can
  // block the install, so the button stays enabled while loading.
  const isBlocked = isDefined(readiness) && !readiness.ready;

  const blockedReasonLabel =
    readiness?.blockedReason === 'APP_NOT_REGISTERED'
      ? t`Not registered on this server`
      : readiness?.blockedReason === 'VERSION_INCOMPATIBLE'
        ? t`Incompatible server version`
        : null;

  // Marketplace catalog cards carry the application universal identifier in
  // `id`, which is what the install mutation takes.
  return (
    <StyledLinkContainer>
      <Card rounded fullWidth>
        <StyledSettingsCardContent alignItems="flex-start" fullHeight>
          <Avatar
            avatarUrl={application.logoUrl ?? null}
            placeholder={application.name}
            placeholderColorSeed={application.name}
            size="lg"
            type="squared"
          />
          <div>
            <StyledSettingsCardTitle>
              {application.name}
            </StyledSettingsCardTitle>
            <StyledDescription>{application.description}</StyledDescription>
            <StyledFooterContainer>
              <StyledSettingsCardThirdLine>
                {isDefined(blockedReasonLabel) ? (
                  <StyledBlockedReason>
                    {blockedReasonLabel}
                  </StyledBlockedReason>
                ) : (
                  t`Part of A2E Suite`
                )}
              </StyledSettingsCardThirdLine>
              <Button
                Icon={IconDownload}
                title={isInstalling ? t`Installing...` : t`Install`}
                variant="secondary"
                accent="blue"
                onClick={() => {
                  void install({ universalIdentifier: application.id });
                }}
                disabled={isInstalling || isBlocked}
              />
            </StyledFooterContainer>
          </div>
        </StyledSettingsCardContent>
      </Card>
    </StyledLinkContainer>
  );
};
