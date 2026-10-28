import { PublicLegalPage } from '@/public-site/PublicLegalPage';
import { PUBLIC_LEGAL_PAGES } from '@/public-site/PublicLegalPages';
import { PublicWorkspaceComposition } from '@/public-site/PublicWorkspaceComposition';
import { PUBLIC_SITE_APPLICATIONS } from '@/public-site/PublicSiteContent';
import { PublicSiteShell } from '@/public-site/PublicSiteShell';
import {
  PublicSiteApplications,
  PublicSiteAppStrip,
  PublicSiteFaq,
  PublicSiteHero,
  PublicSiteImportGuide,
  PublicSitePrinciples,
  PublicSiteProblem,
  PublicSiteProductPreview,
  PublicSiteSteps,
  PublicSiteUseCases,
} from '@/public-site/PublicSiteSections';
import { PUBLIC_SITE_PAGES } from '@/public-site/PublicSitePages';
import { useLingui } from '@lingui/react/macro';
import { useLocation } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';

export const PublicSite = () => {
  const { t, i18n } = useLingui();
  const { pathname } = useLocation();
  const legalPage = PUBLIC_LEGAL_PAGES.find(
    (entry) => entry.path === pathname.replace(/\/$/, ''),
  );
  if (legalPage) return <PublicLegalPage page={legalPage} />;
  const page = PUBLIC_SITE_PAGES.find(
    (entry) => entry.path === pathname.replace(/\/$/, ''),
  );
  const application = PUBLIC_SITE_APPLICATIONS.find(
    (entry) => `/apps/${entry.id}` === pathname.replace(/\/$/, ''),
  );
  const heading = application
    ? i18n._(application.heading)
    : page?.id === 'product'
      ? t`Less switching. *More doing.*`
      : page?.id === 'apps'
        ? t`The right tools. *In the right place.*`
        : page?.id === 'use-cases'
          ? t`Make room for *your kind of work.*`
          : page?.id === 'why-a2e'
            ? t`Good tools should *give you space.*`
            : page?.id === 'getting-started'
              ? t`A few small steps. *A fresh start.*`
              : t`A little more space *for your ideas.*`;
  const description = application
    ? i18n._(application.body)
    : page?.id === 'apps'
      ? t`Discover the applications that bring notes, plans, files, relationships and finances into a shared workspace. Choose what fits; add more as you grow.`
      : page?.id === 'getting-started'
        ? t`Create your account, find your workspace and bring your first idea. Here is how to make yourself at home.`
        : page?.id === 'why-a2e'
          ? t`A2E Suite brings everyday work into a modular workspace. Useful structure, familiar tools and room for your team to make it their own.`
          : page?.id === 'use-cases'
            ? t`Personal knowledge, course notes, shared projects or an organization’s next chapter. Start with a space that fits the way you work.`
            : t`A modular workspace for notes, projects, calendars and files. Bring in finance, client work and AI when you need them, on your own or with your team.`;
  const isHome = !page && !application;
  const pageTitle = application
    ? `${i18n._(application.name)} · A2E Suite`
    : page
      ? `${i18n._(page.label)} · A2E Suite`
      : t`A2E Suite — A little more space for your ideas`;
  return (
    <PublicSiteShell>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:site_name" content="A2E Suite" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <link rel="icon" type="image/png" href="/branding/favicon-32.png" />
      </Helmet>
      <PublicSiteHero
        displayAccent={isHome}
        eyebrow={
          application
            ? i18n._(application.name)
            : page
              ? i18n._(page.label)
              : t`Your work, beautifully connected`
        }
        title={heading}
        body={description}
        secondaryHref={
          page?.id === 'product' || application
            ? '/apps'
            : page?.id === 'apps'
              ? '/getting-started'
              : '/product'
        }
        secondaryLabel={
          page?.id === 'product' || application
            ? t`Explore applications`
            : page?.id === 'apps'
              ? t`See how to begin`
              : t`Explore the suite`
        }
      >
        {(isHome || page?.id === 'product' || application) && (
          <PublicSiteProductPreview initialTabId={application?.id} />
        )}
      </PublicSiteHero>
      {isHome && (
        <>
          <PublicSiteAppStrip />
          <PublicSiteProblem />
          <PublicSitePrinciples />
          <PublicWorkspaceComposition />
          <PublicSiteSteps />
          <PublicSiteApplications compact />
          <PublicSiteUseCases />
        </>
      )}
      {page?.id === 'product' && (
        <>
          <PublicSitePrinciples />
          <PublicSiteApplications />
          <PublicSiteImportGuide />
        </>
      )}
      {page?.id === 'apps' && (
        <>
          <PublicWorkspaceComposition />
          <PublicSiteApplications />
        </>
      )}
      {application && (
        <>
          <PublicSiteApplications applicationId={application.id} />
          {application.id === 'bureau' && <PublicSiteImportGuide />}
          <PublicSiteSteps />
        </>
      )}
      {page?.id === 'use-cases' && (
        <>
          <PublicSiteUseCases />
          <PublicSiteSteps />
        </>
      )}
      {page?.id === 'why-a2e' && (
        <>
          <PublicSiteProblem />
          <PublicSitePrinciples />
          <PublicSiteUseCases />
        </>
      )}
      {page?.id === 'getting-started' && (
        <>
          <PublicWorkspaceComposition />
          <PublicSiteSteps />
          <PublicSiteImportGuide />
        </>
      )}
      <PublicSiteFaq />
    </PublicSiteShell>
  );
};
