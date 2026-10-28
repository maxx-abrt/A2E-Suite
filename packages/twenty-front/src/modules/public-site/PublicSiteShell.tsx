import { Helmet } from '@dr.pogodin/react-helmet';
import { PublicSiteLanguageSelector } from '@/public-site/PublicSiteLanguageSelector';
import { PUBLIC_LEGAL_PAGES } from '@/public-site/PublicLegalPages';
import { usePublicSiteMotion } from '@/public-site/usePublicSiteMotion';
import { PUBLIC_SITE_PAGES } from '@/public-site/PublicSitePages';
import { PublicSiteBrand } from '@/public-site/PublicSiteBrand';
import {
  buildCssVariableDeclarations,
  color,
  fontFamily,
  mediaUp,
  semanticColor,
} from '@/public-site/tokens';
import { Button } from '@/public-site/ui/Button';
import { Container } from '@/public-site/ui/Container';
import { NotchedCardShape } from '@/public-site/ui/NotchedCardShape';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useRef, useEffect, useState } from 'react';
import { PublicSiteLink } from '@/public-site/ui/PublicSiteLink';
import { useLocation } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { safeDecodeURIComponent } from 'twenty-shared/utils';
import '@/public-site/publicSite.css';

const StyledPage = styled.div`
  ${buildCssVariableDeclarations()}
  --font-base: 4px;
  --font-mono: 'A2E Azeret Mono';
  --font-sans: 'Plus Jakarta Sans';
  --font-serif: 'Plus Jakarta Sans';
  -webkit-font-smoothing: antialiased;
  background: ${semanticColor.surface};
  color: ${semanticColor.ink};
  font-family: ${fontFamily('sans')};
  font-size: 16px;
  height: calc(100dvh / var(--t-zoom, 1));
  overflow-wrap: anywhere;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  &,
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  h1,
  h2,
  h3,
  h4,
  p,
  ul {
    margin: 0;
  }
  a:focus-visible,
  button:focus-visible,
  select:focus-visible,
  summary:focus-visible,
  [tabindex='0']:focus-visible {
    outline: 2px solid ${color('blue')};
    outline-offset: 4px;
  }
  [id] {
    scroll-margin-top: 120px;
  }
  &[data-motion-paused='true'],
  &[data-background='true'] {
    scroll-behavior: auto;
    * {
      animation-play-state: paused !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`;
const StyledHeader = styled.header`
  background: ${color('white')};
  border-bottom: 1px solid ${color('black-5')};
  position: sticky;
  top: 0;
  z-index: 5;
`;
const StyledHeaderRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  min-height: 72px;
  > a {
    color: inherit;
    text-decoration: none;
  }
  > nav {
    align-items: center;
    display: none;
    gap: 28px;
  }
  nav a {
    color: ${semanticColor.inkMuted};
    font-family: ${fontFamily('sans')};
    font-size: 11px;
    text-decoration: none;
    font-weight: 500;
  }
  nav a:hover,
  nav a[aria-current] {
    color: ${color('black')};
    text-decoration: underline;
    text-decoration-color: ${color('pink')};
    text-underline-offset: 6px;
  }
  ${mediaUp('lg')} {
    > nav {
      display: flex;
    }
  }
`;
const StyledAccount = styled.div`
  align-items: center;
  display: flex;
  gap: 12px;
  > a:first-child {
    display: none;
  }
  ${mediaUp('md')} {
    > a:first-child {
      display: inline-flex;
    }
  }
`;
const StyledMobileMenu = styled.details`
  border-top: 1px solid ${semanticColor.line};
  font-family: ${fontFamily('sans')};
  font-size: 12px;
  summary {
    cursor: pointer;
    padding: 12px 20px;
  }
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 12px 20px 20px;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  ${mediaUp('lg')} {
    display: none;
  }
`;
const StyledSkip = styled.a`
  background: ${color('white')};
  color: ${color('black')};
  left: 12px;
  padding: 12px;
  position: absolute;
  top: -80px;
  z-index: 10;
  &:focus {
    top: 12px;
  }
`;
const StyledFooter = styled.footer`
  background: ${color('black')};
  color: ${color('white')};
  padding: 72px 0 24px;
`;
const StyledFooterCard = styled.div`
  color: ${color('black')};
  isolation: isolate;
  padding: 60px 24px 28px;
  position: relative;
  ${mediaUp('md')} {
    padding: 72px 64px 32px;
  }
`;
const StyledFooterGrid = styled.div`
  display: grid;
  gap: 36px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 40px 0 48px;
  h3 {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 16px;
  }
  a {
    color: ${color('black-70')};
    display: block;
    font-size: 14px;
    margin: 12px 0;
    text-decoration: none;
  }
  a:hover {
    color: ${color('black')};
    text-decoration: underline;
    text-decoration-color: ${color('pink')};
    text-underline-offset: 6px;
  }
  ${mediaUp('md')} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;
const StyledCopyright = styled.div`
  border-top: 1px solid ${color('black-10')};
  display: flex;
  flex-wrap: wrap;
  font-family: ${fontFamily('sans')};
  font-size: 11px;
  gap: 16px;
  justify-content: space-between;
  padding-top: 24px;
`;

const StyledMotionControl = styled.div`
  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

type PublicSiteShellProps = { children: ReactNode };

export const PublicSiteShell = ({ children }: PublicSiteShellProps) => {
  const { t, i18n } = useLingui();
  const { pathname, hash } = useLocation();
  const pageRef = usePublicSiteMotion(pathname);
  const [isMotionPaused, setIsMotionPaused] = useState(false);
  useEffect(() => {
    const target = hash
      ? document.getElementById(safeDecodeURIComponent(hash.slice(1)))
      : document.getElementById('public-main');
    if (!target) return;
    if (hash) target.scrollIntoView({ block: 'start' });
    else target.focus({ preventScroll: true });
  }, [pathname, hash]);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const navigation = PUBLIC_SITE_PAGES.map((page) => (
    <PublicSiteLink
      key={page.id}
      to={page.path}
      aria-current={
        pathname === page.path
          ? 'page'
          : page.id === 'apps' && pathname.startsWith('/apps/')
            ? 'location'
            : undefined
      }
      onClick={() => {
        if (menuRef.current) menuRef.current.open = false;
      }}
    >
      {i18n._(page.label)}
    </PublicSiteLink>
  ));
  return (
    <StyledPage
      key={pathname}
      ref={pageRef}
      data-motion-paused={isMotionPaused}
    >
      <Helmet>
        <link
          rel="canonical"
          href={`https://a2esuite.com${pathname}?locale=${i18n.locale}`}
        />
        <link
          rel="alternate"
          hrefLang="en"
          href={`https://a2esuite.com${pathname}?locale=en`}
        />
        <link
          rel="alternate"
          hrefLang="fr"
          href={`https://a2esuite.com${pathname}?locale=fr-FR`}
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`https://a2esuite.com${pathname}`}
        />
        <meta
          property="og:locale"
          content={
            i18n.locale === 'en' ? 'en_US' : i18n.locale.replace('-', '_')
          }
        />
      </Helmet>
      <StyledSkip href="#public-main">{t`Skip to content`}</StyledSkip>
      <StyledHeader>
        <Container>
          <StyledHeaderRow>
            <PublicSiteLink to="/" aria-label={t`A2E Suite home`}>
              <PublicSiteBrand />
            </PublicSiteLink>
            <nav aria-label={t`Main navigation`}>{navigation}</nav>
            <PublicSiteLanguageSelector />
            <StyledAccount aria-label={t`Account`} role="navigation">
              <Button
                href={AppPath.SignInUp}
                label={t`Sign in`}
                size="small"
                variant="outlined"
              />
              <Button
                href={AppPath.SignInUp}
                label={t`Get started`}
                size="small"
              />
            </StyledAccount>
          </StyledHeaderRow>
        </Container>
        <StyledMobileMenu ref={menuRef}>
          <summary>{t`Explore A2E Suite`}</summary>
          <nav aria-label={t`Mobile navigation`}>{navigation}</nav>
        </StyledMobileMenu>
      </StyledHeader>
      <main id="public-main" tabIndex={-1}>
        {children}
      </main>
      <StyledFooter>
        <Container>
          <StyledFooterCard data-scheme="light">
            <NotchedCardShape />
            <PublicSiteBrand />
            <StyledFooterGrid>
              <nav aria-label={t`Product links`}>
                <h3>{t`The suite`}</h3>
                <PublicSiteLink to="/product">{t`Product overview`}</PublicSiteLink>
                <PublicSiteLink to="/apps">{t`Applications`}</PublicSiteLink>
                <PublicSiteLink to="/why-a2e">{t`Why A2E`}</PublicSiteLink>
              </nav>
              <nav aria-label={t`Ways to work`}>
                <h3>{t`Made for your day`}</h3>
                <PublicSiteLink to="/use-cases#individuals">{t`Individuals & students`}</PublicSiteLink>
                <PublicSiteLink to="/use-cases#teams">{t`Teams & projects`}</PublicSiteLink>
                <PublicSiteLink to="/use-cases#organizations">{t`Organizations & small businesses`}</PublicSiteLink>
              </nav>
              <nav aria-label={t`Resources`}>
                <h3>{t`Start here`}</h3>
                <PublicSiteLink to="/getting-started">{t`Getting started`}</PublicSiteLink>
                <PublicSiteLink to="/getting-started#import">{t`Bring your notes`}</PublicSiteLink>
                <PublicSiteLink to="/getting-started#questions">{t`Questions & answers`}</PublicSiteLink>
                {PUBLIC_LEGAL_PAGES.map((page) => (
                  <PublicSiteLink key={page.id} to={page.path}>
                    {t(page.label)}
                  </PublicSiteLink>
                ))}
              </nav>
              <div>
                <h3>{t`Make space for what’s next`}</h3>
                <Button
                  href={AppPath.SignInUp}
                  label={t`Create your workspace`}
                />
              </div>
            </StyledFooterGrid>
            <StyledCopyright>
              <span>© {new Date().getFullYear()} A2E Suite</span>
              <StyledMotionControl>
                <Button
                  size="small"
                  variant="outlined"
                  ariaPressed={isMotionPaused}
                  label={
                    isMotionPaused ? t`Resume animations` : t`Pause animations`
                  }
                  onClick={() => setIsMotionPaused(!isMotionPaused)}
                />
              </StyledMotionControl>
              <span>{t`Your account. Your workspaces. Your way of working.`}</span>
            </StyledCopyright>
          </StyledFooterCard>
        </Container>
      </StyledFooter>
    </StyledPage>
  );
};
