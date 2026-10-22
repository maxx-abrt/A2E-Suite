import { Logo } from '@/auth/components/Logo';
import { FooterNote } from '@/auth/sign-in-up/components/FooterNote';
import { WorkspaceSelectionFooter } from '@/auth/sign-in-up/components/WorkspaceSelectionFooter';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { styled } from '@linaria/react';
import { type JSX } from 'react';
import { AppPath } from 'twenty-shared/types';
import { AnimatedEaseIn } from 'twenty-ui/layout';
import { Trans } from '@lingui/react/macro';
import { IconFileText, IconCheckbox, IconUsers } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { type PublicWorkspaceData } from '~/generated-metadata/graphql';

const StyledShell = styled.div`
  background: ${themeCssVariables.background.secondary};
  box-sizing: border-box;
  display: grid;
  flex: 1;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: calc(100dvh / var(--t-zoom, 1));
  padding: ${themeCssVariables.spacing[3]};
  width: 100%;

  @media (max-width: 1000px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledFormPanel = styled.main`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  justify-content: center;
  min-width: 0;
  padding: ${themeCssVariables.spacing[8]};

  @media (max-width: 480px) {
    padding: ${themeCssVariables.spacing[4]};
  }
`;

const StyledContent = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  max-width: 440px;
  width: 100%;
`;

const StyledTitleContainer = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  line-height: 1.2;
  margin: ${themeCssVariables.spacing[8]} 0 ${themeCssVariables.spacing[3]};
  text-align: center;
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  margin: 0;
  max-width: 360px;
  text-align: center;
`;

const StyledPixelAccent = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  display: grid;
  gap: 3px;
  grid-template-columns: repeat(5, 6px);
  margin-bottom: ${themeCssVariables.spacing[8]};
  width: max-content;

  span {
    background: currentColor;
    height: 6px;
    width: 6px;
  }

  span:nth-child(3n) {
    opacity: 0.25;
  }
`;

const StyledProductPanel = styled.aside`
  background:
    radial-gradient(
      circle at 85% 10%,
      ${themeCssVariables.background.transparent.medium},
      transparent 55%
    ),
    ${themeCssVariables.background.tertiary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: ${themeCssVariables.spacing[12]};

  h2 {
    font-size: 40px;
    font-weight: ${themeCssVariables.font.weight.semiBold};
    line-height: 1.15;
    margin: 0 0 ${themeCssVariables.spacing[6]};
    max-width: 440px;
  }

  p {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.lg};
    line-height: 1.6;
    max-width: 400px;
  }

  @media (max-width: 1000px) {
    display: none;
  }
`;

const StyledFeatures = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  margin-top: ${themeCssVariables.spacing[8]};

  span {
    align-items: center;
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: ${themeCssVariables.border.radius.md};
    display: inline-flex;
    gap: ${themeCssVariables.spacing[2]};
    padding: ${themeCssVariables.spacing[3]};
  }
`;

const StyledFormContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-bottom: ${themeCssVariables.spacing[6]};
  margin-top: ${themeCssVariables.spacing[6]};
  min-width: 0;
  width: 100%;
`;

type SignInUpStandardContentProps = {
  workspacePublicData: PublicWorkspaceData | null;
  signInUpForm: JSX.Element | null;
  signInUpStep: SignInUpStep;
  title: string;
  onClickOnLogo: () => void;
};

export const SignInUpStandardContent = ({
  workspacePublicData,
  signInUpForm,
  signInUpStep,
  title,
  onClickOnLogo,
}: SignInUpStandardContentProps) => {
  return (
    <StyledShell>
      <StyledFormPanel>
        <StyledContent>
          <AnimatedEaseIn>
            <Logo
              secondaryLogo={workspacePublicData?.logo}
              placeholder={workspacePublicData?.displayName}
              onClick={onClickOnLogo}
              to={AppPath.SignInUp}
            />
          </AnimatedEaseIn>
          <StyledTitleContainer>{title}</StyledTitleContainer>
          {[SignInUpStep.Init, SignInUpStep.Email].includes(signInUpStep) && (
            <StyledDescription>
              <Trans>
                Sign in or create an account with your email to get started.
              </Trans>
            </StyledDescription>
          )}
          <StyledFormContainer>{signInUpForm}</StyledFormContainer>
          {signInUpStep === SignInUpStep.WorkspaceSelection && (
            <WorkspaceSelectionFooter />
          )}
          {![
            SignInUpStep.Password,
            SignInUpStep.TwoFactorAuthenticationProvision,
            SignInUpStep.TwoFactorAuthenticationVerification,
            SignInUpStep.WorkspaceSelection,
            SignInUpStep.WorkspaceCreation,
          ].includes(signInUpStep) && (
            <FooterNote secondaryAgreement="dataProcessingAgreement" />
          )}
        </StyledContent>
      </StyledFormPanel>
      <StyledProductPanel>
        <StyledPixelAccent aria-hidden="true">
          {Array.from({ length: 25 }, (_, index) => (
            <span key={index} />
          ))}
        </StyledPixelAccent>
        <h2>
          <Trans>A little more space for your ideas.</Trans>
        </h2>
        <p>
          <Trans>
            Write, organize your work, and bring your team together in A2E
            Suite.
          </Trans>
        </p>
        <StyledFeatures>
          <span>
            <IconFileText size={18} />
            <Trans>Pages</Trans>
          </span>
          <span>
            <IconCheckbox size={18} />
            <Trans>Projects</Trans>
          </span>
          <span>
            <IconUsers size={18} />
            <Trans>Teamwork</Trans>
          </span>
        </StyledFeatures>
      </StyledProductPanel>
    </StyledShell>
  );
};
