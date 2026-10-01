import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { IconFileText, IconPlug, IconPlus, IconSparkles } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { SYNA_LANDING_TEMPLATE_CATEGORY } from '@/ai/constants/SynaLandingTemplateCategory';
import { SYNA_LANDING_TEMPLATE_LINKS } from '@/ai/constants/SynaLandingTemplates';
import { SYNA_RECIPE_DESCRIPTORS } from '@/ai/constants/SynaRecipeDescriptors';
import { A2eLearnMoreLink } from '@/a2e-help/components/A2eLearnMoreLink';
import { useAiChatThreadClick } from '@/ai/hooks/useAiChatThreadClick';
import { useChatThreads } from '@/ai/hooks/useChatThreads';
import { useSwitchToNewAiChat } from '@/ai/hooks/useSwitchToNewAiChat';
import { useWorkspaceAiModelAvailability } from '@/ai/hooks/useWorkspaceAiModelAvailability';
import { getRecentSynaRuns } from '@/ai/utils/getRecentSynaRuns';
import { isSynaAvailable } from '@/ai/utils/isSynaAvailable';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { PermissionFlagType } from '~/generated-metadata/graphql';

const READY_RECIPE_DESCRIPTORS = SYNA_RECIPE_DESCRIPTORS.filter(
  (descriptor) => descriptor.status === 'READY',
);

const StyledLanding = styled.section`
  align-self: center;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  max-height: 100%;
  max-width: 640px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledConnectContainer = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledHeader = styled.header`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
  justify-content: space-between;
`;

const StyledTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledSubtitle = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.08em;
  margin: 0;
  text-transform: uppercase;
`;

const StyledRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledEmptyRuns = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

// The Syna home (M7f): the host `/chat` surface's empty state, enriched with one
// primary action, the three featured M9c starters, the full READY actions
// library and the recent runs. It renders no second chat and no parallel write
// path — every entry opens the shared gallery or the existing thread-selection
// hook. The zero-AI contract (US-141) is enforced here: without a configured
// provider the AI entries are hidden and an admin sees the single "Connect a
// provider" link, so the landing itself never dead-ends.
export const SynaLanding = () => {
  const { t, i18n } = useLingui();
  const hasAiPermissionFlag = useHasPermissionFlag(PermissionFlagType.AI);
  const hasAiSettingsPermission = useHasPermissionFlag(
    PermissionFlagType.AI_SETTINGS,
  );
  const { hasConfiguredAiProvider } = useWorkspaceAiModelAvailability();
  const { openTemplateGallery } = useOpenTemplateGallery();
  const { switchToNewChat } = useSwitchToNewAiChat();
  const { threads } = useChatThreads();
  const { handleThreadClick } = useAiChatThreadClick({
    resetNavigationStack: true,
  });

  if (!isSynaAvailable({ hasAiPermissionFlag, hasConfiguredAiProvider })) {
    if (hasAiSettingsPermission) {
      return (
        <StyledConnectContainer data-testid="syna-landing-connect">
          <Button
            Icon={IconPlug}
            title={t`Connect a provider`}
            to={getSettingsPath(SettingsPath.AiProviders)}
            dataTestId="syna-connect-provider"
          />
          <A2eLearnMoreLink appKey="syna" />
        </StyledConnectContainer>
      );
    }

    return null;
  }

  const isEnglishLocale = i18n.locale?.toLowerCase().startsWith('en') ?? false;
  const recentRuns = getRecentSynaRuns(threads);

  return (
    <StyledLanding data-testid="syna-landing">
      <StyledHeader>
        <StyledTitleGroup>
          <StyledTitle>{t`Syna`}</StyledTitle>
          <StyledSubtitle>
            {t`Your assistant, its recent runs and every action in one place.`}
          </StyledSubtitle>
          <A2eLearnMoreLink appKey="syna" />
        </StyledTitleGroup>
        <Button
          Icon={IconPlus}
          title={t`New conversation`}
          onClick={() => {
            switchToNewChat();
          }}
          dataTestId="syna-new-conversation"
        />
      </StyledHeader>
      <StyledSection>
        <StyledSectionTitle>{t`Starter templates`}</StyledSectionTitle>
        <StyledRow>
          {SYNA_LANDING_TEMPLATE_LINKS.map((templateLink) => (
            <Button
              key={templateLink.descriptorKey}
              Icon={IconSparkles}
              title={t(templateLink.label)}
              ariaLabel={t(templateLink.label)}
              variant="secondary"
              size="small"
              onClick={() =>
                openTemplateGallery({
                  category: SYNA_LANDING_TEMPLATE_CATEGORY,
                  templateKey: templateLink.descriptorKey,
                })
              }
              dataTestId={`syna-template-${templateLink.descriptorKey}`}
            />
          ))}
        </StyledRow>
      </StyledSection>
      <StyledSection>
        <StyledSectionTitle>{t`Actions library`}</StyledSectionTitle>
        <StyledRow>
          {READY_RECIPE_DESCRIPTORS.map((descriptor) => {
            const label = isEnglishLocale
              ? descriptor.labels.en
              : descriptor.labels.fr;

            return (
              <Button
                key={descriptor.key}
                Icon={IconFileText}
                title={label}
                ariaLabel={label}
                variant="secondary"
                size="small"
                onClick={() =>
                  openTemplateGallery({
                    category: SYNA_LANDING_TEMPLATE_CATEGORY,
                    templateKey: descriptor.key,
                  })
                }
                dataTestId={`syna-action-${descriptor.key}`}
              />
            );
          })}
        </StyledRow>
      </StyledSection>
      <StyledSection>
        <StyledSectionTitle>{t`Recent runs`}</StyledSectionTitle>
        {recentRuns.length === 0 ? (
          <StyledEmptyRuns>
            {t`No runs yet. Start a conversation above.`}
          </StyledEmptyRuns>
        ) : (
          <StyledColumn>
            {recentRuns.map((thread) => (
              <Button
                key={thread.id}
                Icon={IconSparkles}
                title={thread.title ?? t`Untitled conversation`}
                variant="secondary"
                size="small"
                fullWidth
                justify="flex-start"
                onClick={() => handleThreadClick(thread)}
                dataTestId={`syna-recent-run-${thread.id}`}
              />
            ))}
          </StyledColumn>
        )}
      </StyledSection>
    </StyledLanding>
  );
};
