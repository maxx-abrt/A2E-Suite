import { currentUserState } from '@/auth/states/currentUserState';
import { availableWorkspacesState } from '@/auth/states/availableWorkspacesState';
import { returnToPathState } from '@/auth/states/returnToPathState';
import { useBuildWorkspaceUrl } from '@/domain-manager/hooks/useBuildWorkspaceUrl';
import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { FormProvider } from 'react-hook-form';

import { StyledOnboardingContentContainer } from '@/auth/components/StyledOnboardingContentContainer';
import { OnboardingStepAnimatedItem } from '@/onboarding/components/OnboardingStepAnimatedItem';
import { SignInUpWithCredentials } from '@/auth/sign-in-up/components/internal/SignInUpWithCredentials';
import { SignInUpWithGoogle } from '@/auth/sign-in-up/components/internal/SignInUpWithGoogle';
import { SignInUpWithMicrosoft } from '@/auth/sign-in-up/components/internal/SignInUpWithMicrosoft';
import { ForgotPasswordLink } from '@/auth/sign-in-up/components/ForgotPasswordLink';
import { useSignInUpForm } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { getAvailableWorkspacePathAndSearchParams } from '@/auth/utils/availableWorkspacesUtils';
import { authProvidersState } from '@/client-config/states/authProvidersState';
import { isDDLLockedState } from '@/client-config/states/isDDLLockedState';
import { DEFAULT_WORKSPACE_LOGO } from '@/ui/navigation/navigation-drawer/constants/DefaultWorkspaceLogo';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { isDefined } from 'twenty-shared/utils';
import { useParams } from 'react-router-dom';
import { useSso } from '@/auth/sign-in-up/hooks/useSso';
import { isSharedDomainWorkspaceEnabledState } from '@/client-config/states/isSharedDomainWorkspaceEnabledState';
import { MainButton } from 'twenty-ui/input';
import { isNonEmptyString } from '@sniptt/guards';
import { useContext } from 'react';
import { Avatar } from 'twenty-ui/data-display';
import { IconChevronRight, IconPlus } from 'twenty-ui/icon';
import { HorizontalSeparator } from 'twenty-ui/layout';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';
import {
  type AvailableWorkspace,
  GetWorkspaceCreationDefaultsDocument,
} from '~/generated-metadata/graphql';
import { getWorkspaceUrl } from '~/utils/getWorkspaceUrl';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';

const StyledWorkspaceLink = styled.a`
  color: inherit;
  display: block;
  text-decoration: none;
`;

const StyledProviderChoice = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledWorkspaceContainer = styled.div`
  background-color: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;

  a:focus-visible,
  button:focus-visible {
    outline: 2px solid ${themeCssVariables.font.color.primary};
    outline-offset: -3px;
  }

  > * {
    border-bottom: 1px solid ${themeCssVariables.border.color.medium};

    &:last-child {
      border-bottom: none;
    }
  }
`;

const StyledWorkspaceItem = styled.div`
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  height: ${themeCssVariables.spacing[15]};
  justify-content: space-between;
  overflow: hidden;

  padding: 0;
  width: 100%;

  &:hover {
    background-color: ${themeCssVariables.background.transparent.light};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const StyledCreateWorkspaceButton = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: flex;
  font: inherit;
  min-height: ${themeCssVariables.spacing[15]};
  padding: 0;
  text-align: left;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledAccount = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  line-height: 1.5;
  margin: 0 0 ${themeCssVariables.spacing[4]};
  overflow-wrap: anywhere;
  text-align: center;
`;

const StyledWorkspaceStatus = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledWorkspaceContent = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
  padding: 0 ${themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledWorkspaceTextContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const StyledWorkspaceLogo = styled.div`
  align-items: center;
  background-color: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  height: ${themeCssVariables.spacing[6]};
  justify-content: center;
  width: ${themeCssVariables.spacing[6]};
`;

const StyledWorkspaceName = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding-bottom: ${themeCssVariables.spacing[1]};
`;

const StyledWorkspaceUrl = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledChevronIcon = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
`;

const StyledForgotPasswordLinkContainer = styled.div`
  display: flex;
  justify-content: center;
  padding-top: ${themeCssVariables.spacing[4]};
`;

export const SignInUpGlobalScopeForm = () => {
  const { theme } = useContext(ThemeContext);
  const { workspaceInviteHash } = useParams();
  const { redirectToSsoLoginPage } = useSso();
  const isSharedDomainWorkspaceEnabled = useAtomStateValue(
    isSharedDomainWorkspaceEnabledState,
  );
  const authProviders = useAtomStateValue(authProvidersState);
  const isDDLLocked = useAtomStateValue(isDDLLockedState);
  const signInUpStep = useAtomStateValue(signInUpStepState);
  const setSignInUpStep = useSetAtomState(signInUpStepState);
  const { buildWorkspaceUrl } = useBuildWorkspaceUrl();
  const availableWorkspaces = useAtomStateValue(availableWorkspacesState);
  const currentUser = useAtomStateValue(currentUserState);
  const { t } = useLingui();

  const { form } = useSignInUpForm();
  const returnToPath = useAtomStateValue(returnToPathState);

  useQuery(GetWorkspaceCreationDefaultsDocument, {
    skip: signInUpStep !== SignInUpStep.WorkspaceSelection,
  });

  const getAvailableWorkspaceUrl = (availableWorkspace: AvailableWorkspace) => {
    const { pathname, searchParams } = getAvailableWorkspacePathAndSearchParams(
      availableWorkspace,
      { email: form.getValues('email') },
    );

    return buildWorkspaceUrl(
      getWorkspaceUrl(availableWorkspace.workspaceUrls),
      pathname,
      {
        ...searchParams,
        ...(isNonEmptyString(returnToPath) ? { returnToPath } : {}),
      },
    );
  };

  const joinedWorkspaceIds = new Set(
    availableWorkspaces.availableWorkspacesForSignIn.map(({ id }) => id),
  );
  const availableWorkspacesList = [
    ...availableWorkspaces.availableWorkspacesForSignIn,
    ...availableWorkspaces.availableWorkspacesForSignUp.filter(
      ({ id }) => !joinedWorkspaceIds.has(id),
    ),
  ];

  return (
    <>
      {signInUpStep === SignInUpStep.WorkspaceSelection && (
        <StyledOnboardingContentContainer>
          <StyledAccount>{t`Signed in as ${currentUser?.email ?? form.getValues('email')}`}</StyledAccount>
          {availableWorkspacesList.length === 0 && (
            <StyledAccount>
              {isDDLLocked
                ? t`No workspaces are available for this account. Ask your team for an invitation.`
                : t`No workspaces yet. Create a workspace to get started, or ask your team for an invitation.`}
            </StyledAccount>
          )}
          <StyledWorkspaceContainer>
            {availableWorkspacesList.map((availableWorkspace, index) => (
              <OnboardingStepAnimatedItem
                key={availableWorkspace.id}
                index={index}
              >
                {isSharedDomainWorkspaceEnabled &&
                !availableWorkspace.loginToken &&
                !availableWorkspace.personalInviteToken ? (
                  <StyledProviderChoice>
                    <StyledWorkspaceName>
                      {availableWorkspace.displayName}
                    </StyledWorkspaceName>
                    <StyledWorkspaceStatus>{t`Use your workspace sign-in method`}</StyledWorkspaceStatus>
                    {availableWorkspace.sso.map((provider) => (
                      <MainButton
                        key={provider.id}
                        title={provider.name}
                        variant="secondary"
                        onClick={() => redirectToSsoLoginPage(provider.id)}
                        fullWidth
                      />
                    ))}
                    {authProviders.google && (
                      <SignInUpWithGoogle
                        action="list-available-workspaces"
                        isGlobalScope
                      />
                    )}
                    {authProviders.microsoft && (
                      <SignInUpWithMicrosoft
                        action="list-available-workspaces"
                        isGlobalScope
                      />
                    )}
                  </StyledProviderChoice>
                ) : (
                  <StyledWorkspaceLink
                    href={getAvailableWorkspaceUrl(availableWorkspace)}
                    referrerPolicy="no-referrer"
                  >
                    <StyledWorkspaceItem>
                      <StyledWorkspaceContent>
                        <Avatar
                          placeholder={availableWorkspace.displayName || ''}
                          avatarUrl={getAbsoluteImageUrl(
                            availableWorkspace.logo ?? DEFAULT_WORKSPACE_LOGO,
                          )}
                          size="lg"
                        />
                        <StyledWorkspaceTextContainer>
                          <StyledWorkspaceName>
                            {availableWorkspace.displayName ||
                              availableWorkspace.id}
                          </StyledWorkspaceName>
                          <StyledWorkspaceStatus>
                            {joinedWorkspaceIds.has(availableWorkspace.id)
                              ? t`Your workspace`
                              : t`Available to join`}
                          </StyledWorkspaceStatus>
                          <StyledWorkspaceUrl>
                            {
                              new URL(
                                getWorkspaceUrl(
                                  availableWorkspace.workspaceUrls,
                                ),
                              ).hostname
                            }
                          </StyledWorkspaceUrl>
                        </StyledWorkspaceTextContainer>
                        <StyledChevronIcon>
                          <IconChevronRight size={theme.icon.size.md} />
                        </StyledChevronIcon>
                      </StyledWorkspaceContent>
                    </StyledWorkspaceItem>
                  </StyledWorkspaceLink>
                )}
              </OnboardingStepAnimatedItem>
            ))}
            {!isDDLLocked && (
              <OnboardingStepAnimatedItem
                index={availableWorkspacesList.length}
              >
                <StyledCreateWorkspaceButton
                  type="button"
                  onClick={() =>
                    setSignInUpStep(SignInUpStep.WorkspaceCreation)
                  }
                >
                  <StyledWorkspaceContent>
                    <StyledWorkspaceLogo>
                      <IconPlus size={theme.icon.size.lg} />
                    </StyledWorkspaceLogo>
                    <StyledWorkspaceTextContainer>
                      <StyledWorkspaceName>{t`Create a workspace`}</StyledWorkspaceName>
                    </StyledWorkspaceTextContainer>
                    <StyledChevronIcon>
                      <IconChevronRight size={theme.icon.size.md} />
                    </StyledChevronIcon>
                  </StyledWorkspaceContent>
                </StyledCreateWorkspaceButton>
              </OnboardingStepAnimatedItem>
            )}
          </StyledWorkspaceContainer>
        </StyledOnboardingContentContainer>
      )}
      {signInUpStep !== SignInUpStep.WorkspaceSelection && (
        <StyledOnboardingContentContainer>
          {authProviders.google && (
            <SignInUpWithGoogle
              action={
                isDefined(workspaceInviteHash)
                  ? 'join-workspace'
                  : 'list-available-workspaces'
              }
              isGlobalScope
            />
          )}
          {authProviders.microsoft && (
            <SignInUpWithMicrosoft
              action={
                isDefined(workspaceInviteHash)
                  ? 'join-workspace'
                  : 'list-available-workspaces'
              }
              isGlobalScope
            />
          )}
          {(authProviders.google || authProviders.microsoft) && (
            <HorizontalSeparator
              color={themeCssVariables.background.transparent.light}
            />
          )}
          {/* oxlint-disable-next-line react/jsx-props-no-spreading */}
          <FormProvider {...form}>
            <SignInUpWithCredentials isGlobalScope />
          </FormProvider>
          {signInUpStep === SignInUpStep.Password && (
            <StyledForgotPasswordLinkContainer>
              <ForgotPasswordLink
                key={form.getValues('email')}
                email={form.getValues('email')}
              />
            </StyledForgotPasswordLinkContainer>
          )}
        </StyledOnboardingContentContainer>
      )}
    </>
  );
};
