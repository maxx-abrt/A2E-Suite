import { useIsLogged } from '@/auth/hooks/useIsLogged';
import { useIsCurrentLocationOnDefaultDomain } from '@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain';
import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link, Navigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import {
  IconArrowUpRight,
  IconCalendarEvent,
  IconCheckbox,
  IconCheck,
  IconFileText,
  IconLayoutSidebar,
  IconUsers,
  IconCoins,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPage = styled.div`
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  height: calc(100dvh / var(--t-zoom, 1));
  overflow-x: hidden;
  overflow-y: auto;

  * {
    box-sizing: border-box;
  }

  a:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 5px;
  }
`;

const StyledNavigation = styled.header`
  align-items: center;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin: auto;
  max-width: 1240px;
  padding: 28px 32px;

  nav {
    align-items: center;
    display: flex;
    gap: 24px;
  }

  a {
    color: inherit;
    font-size: 14px;
    text-decoration: none;
  }

  @media (max-width: 560px) {
    gap: 12px;
    padding: 24px 20px;

    nav {
      gap: 16px;
    }

    nav > a:last-child {
      display: none;
    }
  }
`;

const StyledBrand = styled(Link)`
  align-items: center;
  display: inline-flex;
  font-weight: 600;
  gap: 12px;
  white-space: nowrap;
`;

const StyledMark = styled.span`
  display: grid;
  gap: 3px;
  grid-template-columns: repeat(3, 5px);
  transform: rotate(-8deg);

  i {
    background: currentColor;
    height: 5px;
    width: 5px;
  }

  i:nth-child(3n) {
    opacity: 0.3;
  }
`;

const StyledAction = styled(Link)`
  align-items: center;
  background: ${themeCssVariables.font.color.primary};
  border: 1px solid ${themeCssVariables.font.color.primary};
  border-radius: 8px;
  color: ${themeCssVariables.background.primary} !important;
  display: inline-flex;
  font-size: 14px;
  font-weight: 500;
  gap: 12px;
  justify-content: center;
  min-height: 44px;
  padding: 0 20px;
  text-decoration: none;
  transition: transform 160ms ease;

  &:hover {
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const StyledHero = styled.section`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin: auto;
  max-width: 900px;
  padding: 88px 24px 64px;
  text-align: center;

  h1 {
    font-size: clamp(42px, 6.3vw, 76px);
    font-weight: 600;
    letter-spacing: -0.055em;
    line-height: 1.06;
    margin: 22px 0;
    max-width: 800px;
    text-wrap: balance;
  }

  p {
    color: ${themeCssVariables.font.color.secondary};
    font-size: 18px;
    line-height: 1.65;
    margin: 0 0 28px;
    max-width: 560px;
    text-wrap: balance;
  }

  small {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: 12px;
    margin-top: 18px;
  }

  @media (max-width: 560px) {
    padding-top: 48px;
  }
`;

const StyledEyebrow = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: 100px;
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: 12px;
  gap: 8px;
  padding: 8px 12px;
`;

const StyledPreviewFrame = styled.section`
  background:
    radial-gradient(
      ellipse at 12% 0%,
      ${themeCssVariables.color.blue10},
      transparent 65%
    ),
    ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: 20px;
  margin: 0 auto;
  max-width: 1112px;
  padding: 20px;

  > p {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: 12px;
    margin: 16px 0 0;
    text-align: center;
  }

  @media (max-width: 760px) {
    border-radius: 12px;
    margin: 0 16px;
    padding: 10px;
  }
`;

const StyledPreview = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: 10px;
  box-shadow: 0 12px 40px ${themeCssVariables.background.transparent.medium};
  display: grid;
  grid-template-columns: 196px minmax(0, 1fr);
  min-height: 410px;
  overflow: hidden;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledSidebar = styled.div`
  background: ${themeCssVariables.background.secondary};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 24px 16px;

  strong {
    font-size: 13px;
    margin-bottom: 28px;
  }

  > span {
    align-items: center;
    color: ${themeCssVariables.font.color.secondary};
    display: flex;
    font-size: 13px;
    gap: 10px;
    padding: 10px;
  }

  > span:first-of-type {
    background: ${themeCssVariables.background.transparent.medium};
    border-radius: 6px;
    color: ${themeCssVariables.font.color.primary};
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

const StyledPreviewMain = styled.div`
  padding: 40px;

  h2 {
    font-size: 25px;
    font-weight: 500;
    letter-spacing: -0.035em;
    margin: 12px 0 8px;
  }

  > p,
  > span {
    color: ${themeCssVariables.font.color.secondary};
    font-size: 13px;
    line-height: 1.6;
  }

  @media (max-width: 560px) {
    padding: 24px 16px;
  }
`;

const StyledPreviewCards = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
  margin-top: 28px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StyledPreviewCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: 8px;
  padding: 18px;

  h3 {
    font-size: 13px;
    font-weight: 500;
    margin: 0 0 18px;
  }

  p {
    align-items: center;
    border-top: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.secondary};
    display: flex;
    font-size: 12px;
    gap: 10px;
    line-height: 1.5;
    margin: 0;
    padding: 12px 0;
  }
`;

const StyledProgress = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: 6px;
  display: grid;
  gap: 3px;
  grid-template-columns: repeat(12, 1fr);
  margin: 12px 0 18px;
  padding: 8px;

  i {
    aspect-ratio: 1;
    background: ${themeCssVariables.border.color.medium};
    border-radius: 1px;
  }

  i:nth-child(-n + 8) {
    animation: a2e-pixel-arrive 600ms both;
    background: ${themeCssVariables.color.blue};
  }

  @keyframes a2e-pixel-arrive {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    i:nth-child(-n + 8) {
      animation: none;
    }
  }
`;

const StyledFeatures = styled.section`
  display: grid;
  gap: 40px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: auto;
  max-width: 1112px;
  padding: 80px 24px;

  h2 {
    font-size: 18px;
    font-weight: 500;
    margin: 20px 0 12px;
  }

  p {
    color: ${themeCssVariables.font.color.secondary};
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
  }

  @media (max-width: 760px) {
    gap: 32px;
    grid-template-columns: 1fr;
    padding: 48px 24px;
  }
`;

const StyledFooter = styled.footer`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: 12px;
  gap: 16px;
  justify-content: space-between;
  margin: auto;
  max-width: 1112px;
  padding: 28px 24px;

  a {
    color: inherit;
  }
`;

export const PublicLandingPage = () => {
  const isLogged = useIsLogged();
  const { isDefaultDomain } = useIsCurrentLocationOnDefaultDomain();
  const { t } = useLingui();

  if (isLogged) {
    return <Navigate to={AppPath.SignInUp} replace />;
  }

  if (!isDefaultDomain) {
    return <Navigate to={AppPath.SignInUp} replace />;
  }

  return (
    <StyledPage>
      <StyledNavigation>
        <StyledBrand to={AppPath.Index} aria-label={t`A2E Suite home`}>
          <StyledMark aria-hidden="true">
            {Array.from({ length: 9 }, (_, index) => (
              <i key={index} />
            ))}
          </StyledMark>
          A2E Suite
        </StyledBrand>
        <nav aria-label={t`Account`}>
          <Link to={AppPath.SignInUp}>
            <Trans>Sign in</Trans>
          </Link>
          <StyledAction to={AppPath.SignInUp}>
            <Trans>Get started</Trans>
            <IconArrowUpRight size={16} />
          </StyledAction>
        </nav>
      </StyledNavigation>
      <main>
        <StyledHero>
          <StyledEyebrow>
            <IconLayoutSidebar size={14} />
            <Trans>Your work, beautifully connected</Trans>
          </StyledEyebrow>
          <h1>
            <Trans>A little more space for your ideas.</Trans>
          </h1>
          <p>
            <Trans>
              Pages, tasks, calendars and finances. One calm place to think
              clearly and move work forward, on your own or with your team.
            </Trans>
          </p>
          <StyledAction to={AppPath.SignInUp}>
            <Trans>Create your workspace</Trans>
            <IconArrowUpRight size={16} />
          </StyledAction>
          <small>
            <Trans>Your account. Your workspaces. Your way of working.</Trans>
          </small>
        </StyledHero>
        <StyledPreviewFrame aria-label={t`Workspace preview`}>
          <StyledPreview>
            <StyledSidebar aria-hidden="true">
              <strong>
                <Trans>My workspace</Trans>
              </strong>
              <span>
                <IconLayoutSidebar size={16} />
                <Trans>Home</Trans>
              </span>
              <span>
                <IconFileText size={16} />
                Bureau
              </span>
              <span>
                <IconCalendarEvent size={16} />
                <Trans>Agenda</Trans>
              </span>
              <span>
                <IconCoins size={16} />
                Bilan
              </span>
              <span>
                <IconUsers size={16} />
                <Trans>Team</Trans>
              </span>
            </StyledSidebar>
            <StyledPreviewMain>
              <span>
                <Trans>A fresh start</Trans>
              </span>
              <h2>
                <Trans>Make room for your best work.</Trans>
              </h2>
              <p>
                <Trans>
                  A clear view of what matters, with everything close at hand.
                </Trans>
              </p>
              <StyledPreviewCards>
                <StyledPreviewCard>
                  <h3>
                    <Trans>Today, at a glance</Trans>
                  </h3>
                  <StyledProgress aria-hidden="true">
                    {Array.from({ length: 12 }, (_, index) => (
                      <i
                        key={index}
                        style={{ animationDelay: `${index * 45}ms` }}
                      />
                    ))}
                  </StyledProgress>
                  <p>
                    <IconCheck size={15} />
                    <Trans>Collect ideas</Trans>
                  </p>
                  <p>
                    <IconCheckbox size={15} />
                    <Trans>Plan the next step</Trans>
                  </p>
                </StyledPreviewCard>
                <StyledPreviewCard>
                  <h3>
                    <Trans>Everything has its place</Trans>
                  </h3>
                  <p>
                    <IconFileText size={15} />
                    <Trans>Notes & knowledge</Trans>
                  </p>
                  <p>
                    <IconCalendarEvent size={15} />
                    <Trans>Projects & plans</Trans>
                  </p>
                  <p>
                    <IconCoins size={15} />
                    <Trans>Finances & documents</Trans>
                  </p>
                </StyledPreviewCard>
              </StyledPreviewCards>
            </StyledPreviewMain>
          </StyledPreview>
          <p>
            <Trans>A glimpse of your workspace. Make it your own.</Trans>
          </p>
        </StyledPreviewFrame>
        <StyledFeatures>
          <article>
            <IconFileText size={24} />
            <h2>
              <Trans>Start with a thought</Trans>
            </h2>
            <p>
              <Trans>
                Turn notes into pages and plans in Bureau. Keep your knowledge
                close to the work it supports.
              </Trans>
            </p>
          </article>
          <article>
            <IconUsers size={24} />
            <h2>
              <Trans>Find your rhythm together</Trans>
            </h2>
            <p>
              <Trans>
                Bring people into your workspace, assign tasks and keep the next
                step clear. Switch between the workspaces you belong to.
              </Trans>
            </p>
          </article>
          <article>
            <IconCoins size={24} />
            <h2>
              <Trans>See the bigger picture</Trans>
            </h2>
            <p>
              <Trans>
                Bring your agenda, relationships and finances into the same
                workspace. Open the tools you need, when you need them.
              </Trans>
            </p>
          </article>
        </StyledFeatures>
      </main>
      <StyledFooter>
        <span>A2E Suite</span>
        <Link to={AppPath.SignInUp}>
          <Trans>Make space for what’s next</Trans>
        </Link>
      </StyledFooter>
    </StyledPage>
  );
};
