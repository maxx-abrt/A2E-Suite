import { A2E_DPA_TERMS, A2E_SUITE_IDENTITY } from 'twenty-shared/constants';
import { PUBLIC_LEGAL_PAGES } from '@/public-site/PublicLegalPages';
import { PublicSiteShell } from '@/public-site/PublicSiteShell';
import { semanticColor } from '@/public-site/tokens';
import { Container } from '@/public-site/ui/Container';
import { Helmet } from '@dr.pogodin/react-helmet';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { PublicSiteLink } from '@/public-site/ui/PublicSiteLink';

type PublicLegalPageProps = {
  page: (typeof PUBLIC_LEGAL_PAGES)[number];
};

const StyledArticle = styled.article`
  margin: 0 auto;
  max-width: 800px;
  padding: 64px 0 80px;
  h1 {
    font-size: clamp(32px, 6vw, 52px);
    font-weight: 500;
    letter-spacing: -0.04em;
    margin: 0 0 20px;
  }
  h2 {
    font-size: 22px;
    font-weight: 500;
    margin: 36px 0 12px;
  }
  p {
    color: ${semanticColor.inkMuted};
    font-size: 16px;
    line-height: 1.8;
    margin: 0;
  }
  nav {
    border-block: 1px solid ${semanticColor.line};
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin: 32px 0;
    padding: 20px 0;
  }
  a {
    color: ${semanticColor.ink};
    font-size: 14px;
    text-underline-offset: 4px;
  }
  a[aria-current] {
    font-weight: 600;
  }
`;

export const PublicLegalPage = ({ page }: PublicLegalPageProps) => {
  const { t, i18n } = useLingui();
  const title = `${i18n._(page.label)} · A2E Suite`;
  return (
    <PublicSiteShell>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={i18n._(page.description)} />
      </Helmet>
      <Container>
        <StyledArticle>
          <h1>{i18n._(page.label)}</h1>
          <p>{i18n._(page.description)}</p>
          <nav aria-label={t`Legal information`}>
            {PUBLIC_LEGAL_PAGES.map((entry) => (
              <PublicSiteLink
                key={entry.id}
                to={entry.path}
                aria-current={entry.id === page.id ? 'page' : undefined}
              >
                {i18n._(entry.label)}
              </PublicSiteLink>
            ))}
          </nav>
          <section>
            <h2>{t`Service operator`}</h2>
            <p>
              {A2E_SUITE_IDENTITY.operator.name} ·{' '}
              {A2E_SUITE_IDENTITY.operator.legalForm}
            </p>
            <p>{A2E_SUITE_IDENTITY.operator.address}</p>
            <p>
              SIREN {A2E_SUITE_IDENTITY.operator.siren} · SIRET{' '}
              {A2E_SUITE_IDENTITY.operator.siret}
            </p>
            <p>RNA {A2E_SUITE_IDENTITY.operator.rna}</p>
            <p>
              <a href={`mailto:${A2E_SUITE_IDENTITY.operator.email}`}>
                {A2E_SUITE_IDENTITY.operator.email}
              </a>
            </p>
          </section>
          {page.id === 'dpa'
            ? A2E_DPA_TERMS.map((block) =>
                block.kind === 'heading' ? (
                  <h2 key={block.text}>{i18n._(block.text)}</h2>
                ) : (
                  <p key={block.text}>
                    {i18n._(block.text, {
                      hostingRegion: t`the region documented for your deployment`,
                    })}
                  </p>
                ),
              )
            : page.sections.map((section) => (
                <section key={section.title.id}>
                  <h2>{i18n._(section.title)}</h2>
                  <p>{i18n._(section.body)}</p>
                </section>
              ))}
        </StyledArticle>
      </Container>
    </PublicSiteShell>
  );
};
