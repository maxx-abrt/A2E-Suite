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
import { type MarketplaceApp } from '~/generated-metadata/graphql';

type A2eSuiteApplicationCardProps = {
  application: MarketplaceApp;
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

export const A2eSuiteApplicationCard = ({
  application,
}: A2eSuiteApplicationCardProps) => {
  const { install, isInstalling } = useInstallMarketplaceApp();

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
                {t`Part of A2E Suite`}
              </StyledSettingsCardThirdLine>
              <Button
                Icon={IconDownload}
                title={isInstalling ? t`Installing...` : t`Install`}
                variant="secondary"
                accent="blue"
                onClick={() => {
                  void install({ universalIdentifier: application.id });
                }}
                disabled={isInstalling}
              />
            </StyledFooterContainer>
          </div>
        </StyledSettingsCardContent>
      </Card>
    </StyledLinkContainer>
  );
};
