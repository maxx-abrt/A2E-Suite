import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { BUREAU_STARTER_PROFILES } from '@/bureau/constants/BureauStarterProfiles';
import { type BureauLandingTemplateLink } from '@/bureau/constants/BureauLandingTemplates';
import { bureauStarterProfileState } from '@/bureau/states/bureauStarterProfileState';
import { A2E_PROJECTS_APPLICATION_UNIVERSAL_IDENTIFIER } from '@/quick-create/constants/A2eProjectsApplicationUniversalIdentifier';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { useAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { type MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/input';
import { IconFileText, IconFolder } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type StarterLink = BureauLandingTemplateLink & {
  projectTemplateKey?: string;
  projectLabel?: MessageDescriptor;
};

const StyledTemplates = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;
const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  font: inherit;
  padding: ${themeCssVariables.spacing[2]};
  width: 100%;
  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;
const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.6;
  margin: 0;
`;
const StyledLinks = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

export const BureauStarterTemplates = () => {
  const { t } = useLingui();
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const applications = useAtomStateValue(applicationsSelector);
  const [profile, setProfile] = useAtomFamilyState(bureauStarterProfileState, {
    workspaceId: currentWorkspace?.id ?? 'anonymous',
    workspaceMemberId: currentWorkspaceMember?.id ?? 'anonymous',
  });
  const { openTemplateGallery } = useOpenTemplateGallery();
  const profileKey =
    typeof profile === 'string' &&
    Object.hasOwn(BUREAU_STARTER_PROFILES, profile)
      ? profile
      : 'team';
  const selectedProfile = BUREAU_STARTER_PROFILES[profileKey];
  const hasProjects = applications.some(
    (application) =>
      application.universalIdentifier ===
      A2E_PROJECTS_APPLICATION_UNIVERSAL_IDENTIFIER,
  );

  return (
    <StyledTemplates>
      <StyledSelect
        aria-label={t`Templates for`}
        value={profileKey}
        onChange={(event) => {
          const selected = event.target.value;
          if (Object.hasOwn(BUREAU_STARTER_PROFILES, selected))
            setProfile(selected as keyof typeof BUREAU_STARTER_PROFILES);
        }}
      >
        {Object.entries(BUREAU_STARTER_PROFILES).map(([key, value]) => (
          <option key={key} value={key}>
            {t(value.label)}
          </option>
        ))}
      </StyledSelect>
      <StyledDescription>{t(selectedProfile.description)}</StyledDescription>
      <StyledLinks>
        {selectedProfile.templates.map((template: StarterLink) => {
          const isProject =
            hasProjects && template.projectTemplateKey !== undefined;
          const key = isProject
            ? template.projectTemplateKey
            : template.descriptorKey;
          const label =
            isProject && template.projectLabel
              ? template.projectLabel
              : template.label;
          return (
            <Button
              key={key}
              Icon={isProject ? IconFolder : IconFileText}
              title={t(label)}
              ariaLabel={t(label)}
              variant="secondary"
              onClick={() =>
                openTemplateGallery({
                  category: isProject ? 'Projets' : 'Pages',
                  templateKey: key,
                })
              }
              dataTestId={`bureau-template-${key}`}
            />
          );
        })}
        <Button
          title={t`Browse all templates`}
          ariaLabel={t`Browse all templates`}
          variant="tertiary"
          size="small"
          onClick={() => openTemplateGallery()}
        />
      </StyledLinks>
    </StyledTemplates>
  );
};
