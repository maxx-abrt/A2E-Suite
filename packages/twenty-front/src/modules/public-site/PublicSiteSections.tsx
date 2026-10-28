import { PublicAsciiArt } from '@/public-site/PublicAsciiArt';
import {
  PUBLIC_SITE_APPLICATIONS,
  PUBLIC_SITE_FAQ,
} from '@/public-site/PublicSiteContent';
import { PublicWorkspacePreview } from '@/public-site/PublicWorkspacePreview';
import {
  color,
  fontFamily,
  mediaUp,
  semanticColor,
  spacing,
  HERO_COMPOSITION,
} from '@/public-site/tokens';
import { Body } from '@/public-site/ui/Body';
import { Button } from '@/public-site/ui/Button';
import { CornerMarkers } from '@/public-site/ui/CornerMarkers';
import { Eyebrow } from '@/public-site/ui/Eyebrow';
import { Heading } from '@/public-site/ui/Heading';
import { HeadingPair } from '@/public-site/ui/HeadingPair';
import { SectionIntro } from '@/public-site/ui/SectionIntro';
import { SectionShell } from '@/public-site/ui/SectionShell';
import { SectionStack } from '@/public-site/ui/SectionStack';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useId } from 'react';
import { Link } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import {
  IconCheck,
  IconFileText,
  IconLayoutSidebar,
  IconShield,
  IconSparkles,
  IconUsers,
} from 'twenty-ui/icon';

const StyledCenteredIntro = styled(SectionIntro)`
  justify-items: center;
  margin: auto;
  max-width: 820px;
  text-align: center;
  p {
    max-width: 590px;
  }
  > div:last-child {
    justify-content: center;
  }
`;
const StyledHeadingMeasure = styled.div`
  max-width: 720px;
`;
const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;
const StyledHeroBackground = styled.div`
  background: linear-gradient(${color('neutral')}, ${color('white')});
  height: 100%;
  position: relative;
  > div {
    bottom: -10%;
    height: 80%;
    left: -20%;
    position: absolute;
    width: 140%;
  }
`;
const StyledHeroVisual = styled.div`
  margin-top: ${HERO_COMPOSITION.ctaToVisualGapPx}px;
  padding: 0 0 ${spacing(10)};
`;
const StyledCaption = styled.p`
  color: ${semanticColor.inkMuted};
  font-family: ${fontFamily('sans')};
  font-size: 11px;
  line-height: 1.7;
  margin-top: 20px !important;
  text-align: center;
`;
const StyledStrip = styled.div`
  align-items: center;
  border: 1px solid ${semanticColor.line};
  border-radius: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: space-evenly;
  padding: 28px 24px;
  position: relative;
  > span {
    color: ${semanticColor.inkMuted};
    font-family: ${fontFamily('sans')};
    font-size: 11px;
    text-transform: uppercase;
  }
  a {
    align-items: center;
    color: ${semanticColor.ink};
    display: flex;
    font-size: 16px;
    gap: 8px;
    text-decoration: none;
  }
  a:hover {
    color: ${color('black')};
  }
`;
const StyledGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);
  ${mediaUp('md')} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    &[data-detail='true'] {
      grid-template-columns: minmax(0, 1fr);
    }
    &[data-detail='true'] > article {
      align-items: center;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    &[data-detail='true'] > article > div:first-child {
      height: 100%;
      min-height: 360px;
    }
  }
`;
const StyledAvailability = styled.p`
  border-top: 1px solid ${semanticColor.line};
  font-size: 12px !important;
  margin-top: 24px !important;
  padding-top: 16px;
`;
const StyledWorkflow = styled.div`
  margin-top: 28px;
`;

const StyledCard = styled.article`
  border: 1px solid ${semanticColor.line};
  border-radius: 24px;
  overflow: hidden;
  > div:last-child {
    padding: 28px;
  }
  > div:last-child > svg,
  > div:last-child > img {
    color: ${color('black')};
    margin-bottom: 20px;
  }
  h3 {
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.03em;
    margin-bottom: 16px;
  }
  p {
    color: ${semanticColor.inkMuted};
    font-size: 16px;
    line-height: 1.7;
  }
  ul {
    color: ${semanticColor.inkMuted};
    font-size: 14px;
    line-height: 1.8;
    margin: 20px 0 0;
    padding-left: 20px;
  }
`;
const StyledIllustration = styled.div`
  align-items: center;
  box-sizing: border-box;
  display: flex;
  height: 320px;
  justify-content: center;
  padding: 24px;
  position: relative;
  > img {
    display: block;
    height: 272px;
    max-width: 100%;
    object-fit: contain;
    user-select: none;
    width: 320px;
  }
`;
const StyledSplit = styled.div`
  align-items: start;
  display: grid;
  gap: 48px;
  grid-template-columns: minmax(0, 1fr);
  ${mediaUp('md')} {
    align-items: center;
    gap: 64px;
    grid-template-columns: 1fr 1fr;
  }
`;
const StyledProblem = styled.div`
  > div {
    height: 180px;
  }
  background: ${color('neutral')};
  border: 1px solid ${semanticColor.line};
  border-radius: 24px;
  display: grid;
  gap: 12px;
  padding: 40px 24px;
  > span {
    background: ${color('white')};
    border: 1px solid ${semanticColor.line};
    border-radius: 6px;
    color: ${semanticColor.inkMuted};
    font-family: ${fontFamily('sans')};
    font-size: 12px;
    padding: 20px;
    transform: rotate(-2deg);
  }
  > span:nth-child(2) {
    transform: translateX(8px) rotate(2deg);
  }
  > strong {
    color: ${color('black')};
    font-size: 20px;
    font-weight: 400;
    padding: 24px 0 4px;
    text-align: center;
  }
`;
const StyledPoints = styled.div`
  margin-top: 32px;
  > div {
    border-top: 1px dashed ${semanticColor.divider};
    padding: 24px 0;
  }
  h3 {
    font-size: 18px;
    font-weight: 400;
    margin-bottom: 8px;
  }
`;
const StyledSteps = styled.div`
  counter-reset: steps;
  > article {
    border-top: 1px solid ${semanticColor.line};
    padding: 32px 0;
  }
  h3 {
    font-family: ${fontFamily('serif')};
    font-size: 30px;
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin: 16px 0;
  }
  small {
    color: ${color('black')};
    font-family: ${fontFamily('sans')};
    font-size: 12px;
  }
`;
const StyledSticky = styled.div`
  background: ${color('white')};
  border: 1px solid ${semanticColor.lineStrong};
  border-radius: 24px;
  padding: 28px;
  > div {
    align-items: center;
    border-bottom: 1px solid ${semanticColor.line};
    display: flex;
    gap: 12px;
    padding: 20px 0;
  }
  > div:last-child {
    border: 0;
  }
  svg {
    color: ${color('black')};
    flex-shrink: 0;
  }
  p {
    font-size: 14px;
  }
  ${mediaUp('md')} {
    position: sticky;
    top: 110px;
  }
`;
const StyledFaqList = styled.div`
  border-top: 1px solid ${semanticColor.lineStrong};
  details {
    border-bottom: 1px solid ${semanticColor.line};
  }
  summary {
    align-items: center;
    cursor: pointer;
    display: flex;
    font-size: 18px;
    gap: 20px;
    justify-content: space-between;
    list-style: none;
    padding: 24px 0;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::after {
    content: '+';
    font-family: ${fontFamily('sans')};
    font-size: 24px;
  }
  details[open] summary::after {
    content: '−';
  }
  p {
    color: ${semanticColor.inkMuted};
    font-size: 16px;
    line-height: 1.8;
    max-width: 780px;
    padding: 0 32px 28px 0;
  }
`;
const StyledUseCase = styled.article`
  border-top: 1px solid ${semanticColor.lineStrong};
  display: grid;
  gap: 24px;
  padding: 36px 0;
  h3 {
    font-family: ${fontFamily('serif')};
    font-size: 32px;
    font-weight: 500;
    letter-spacing: -0.03em;
  }
  ${mediaUp('md')} {
    grid-template-columns: 1fr 1fr;
  }
`;

type PublicSiteHeroProps = {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
  secondaryHref?: string;
  secondaryLabel?: string;
  displayAccent?: boolean;
};

export const PublicSiteHero = ({
  eyebrow,
  title,
  body,
  children,
  secondaryHref = '/product',
  secondaryLabel,
  displayAccent = false,
}: PublicSiteHeroProps) => {
  const { t } = useLingui();
  return (
    <SectionShell
      rhythm="hero"
      scheme="muted"
      background={
        <StyledHeroBackground>
          <PublicAsciiArt variant="bridge" subdued />
        </StyledHeroBackground>
      }
      fullBleedBackground
    >
      <StyledCenteredIntro>
        <Eyebrow>{eyebrow}</Eyebrow>
        <HeadingPair>
          <StyledHeadingMeasure>
            <Heading
              as="h1"
              size="lg"
              weight="light"
              displayAccent={displayAccent}
            >
              {title}
            </Heading>
          </StyledHeadingMeasure>
          <Body muted size="sm">
            {body}
          </Body>
        </HeadingPair>
        <StyledActions>
          <Button href={AppPath.SignInUp} label={t`Create your workspace`} />
          <Button
            href={secondaryHref}
            label={secondaryLabel ?? t`Explore the suite`}
            variant="outlined"
          />
        </StyledActions>
      </StyledCenteredIntro>
      {children !== undefined && children !== null && (
        <StyledHeroVisual>{children}</StyledHeroVisual>
      )}
    </SectionShell>
  );
};

export const PublicSiteAppStrip = () => {
  const { t, i18n } = useLingui();
  return (
    <SectionShell>
      <StyledStrip>
        <CornerMarkers />
        <span>{t`One suite. Your way.`}</span>
        {PUBLIC_SITE_APPLICATIONS.map(({ id, name, Icon }) => (
          <Link key={id} to={`/apps/${id}`}>
            <Icon size={18} />
            {i18n._(name)}
          </Link>
        ))}
      </StyledStrip>
    </SectionShell>
  );
};

export const PublicSiteProblem = () => {
  const { t } = useLingui();
  return (
    <SectionShell>
      <StyledSplit>
        <StyledProblem aria-hidden="true">
          <PublicAsciiArt variant="bridge" />
          <span>{t`The notes in one place`}</span>
          <span>{t`The plan in another`}</span>
          <span>{t`The context in your head`}</span>
          <strong>{t`A little more connected.`}</strong>
        </StyledProblem>
        <div>
          <SectionIntro>
            <Eyebrow>{t`Room to focus.`}</Eyebrow>
            <Heading
              size="md"
              weight="light"
            >{t`Your work is connected. *Your tools should be, too.*`}</Heading>
          </SectionIntro>
          <StyledPoints>
            <div>
              <h3>{t`Keep the context.`}</h3>
              <Body
                muted
                size="sm"
              >{t`Ideas become pages, pages support projects, and plans make room in your calendar. Find the thread without retracing every step.`}</Body>
            </div>
            <div>
              <h3>{t`Start with what you need.`}</h3>
              <Body
                muted
                size="sm"
              >{t`Choose a workspace that feels right today. Add applications as your work grows, with one account and familiar navigation.`}</Body>
            </div>
          </StyledPoints>
        </div>
      </StyledSplit>
    </SectionShell>
  );
};

export const PublicSitePrinciples = () => {
  const { t } = useLingui();
  const cards = [
    {
      title: t`A space to think`,
      body: t`Collect the brief, the rough idea and the meeting note. Give your knowledge a clear, reusable structure.`,
      Icon: IconFileText,
      tone: 'green',
    },
    {
      title: t`A rhythm to work`,
      body: t`Bring tasks, projects and plans into the same workspace. Keep the next step visible and the details close.`,
      Icon: IconLayoutSidebar,
      tone: 'pink',
    },
    {
      title: t`A foundation to grow`,
      body: t`Add files, client work, finance or AI when your team needs them. Shape the workspace around the way you work.`,
      Icon: IconShield,
      tone: 'yellow',
    },
  ];
  return (
    <SectionShell>
      <SectionStack>
        <StyledCenteredIntro>
          <Eyebrow>{t`Simple beginnings. More possibilities.`}</Eyebrow>
          <Heading
            size="lg"
            weight="light"
          >{t`Build your own rhythm. *Keep everything in reach.*`}</Heading>
        </StyledCenteredIntro>
        <StyledGrid>
          {cards.map(({ title, body, tone }, index) => (
            <StyledCard key={title}>
              <StyledIllustration data-tone={tone} aria-hidden="true">
                <PublicAsciiArt
                  variant={
                    index % 3 === 0
                      ? 'blocks'
                      : index % 3 === 1
                        ? 'stack'
                        : 'cube'
                  }
                />
              </StyledIllustration>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </StyledCard>
          ))}
        </StyledGrid>
      </SectionStack>
    </SectionShell>
  );
};

export const PublicSiteSteps = () => {
  const { t } = useLingui();
  return (
    <SectionShell scheme="muted">
      <StyledSplit>
        <StyledSteps>
          <article>
            <small>01 · {t`Begin`}</small>
            <h3>{t`Start with a useful little space.`}</h3>
            <Body
              muted
            >{t`Create or join a workspace. Choose a starting template for your own work, study, team or organization, or begin with an empty space.`}</Body>
          </article>
          <article>
            <small>02 · {t`Make it yours`}</small>
            <h3>{t`Bring the work you already care about.`}</h3>
            <Body
              muted
            >{t`Write your first page, preview a Notion export, or plan your next project. Organize your pages and keep useful templates close.`}</Body>
          </article>
          <article>
            <small>03 · {t`Grow`}</small>
            <h3>{t`Add the tools, and the people, you need.`}</h3>
            <Body
              muted
            >{t`Invite your team and choose their access. Open the applications installed for your workspace and shape the navigation around your day.`}</Body>
          </article>
        </StyledSteps>
        <StyledSticky>
          <Eyebrow>{t`Your workspace, taking shape`}</Eyebrow>
          <div>
            <IconFileText size={24} />
            <Body>{t`An idea worth keeping`}</Body>
          </div>
          <div>
            <IconCheck size={24} />
            <Body>{t`A next step with a home`}</Body>
          </div>
          <div>
            <IconUsers size={24} />
            <Body>{t`The right people, in the loop`}</Body>
          </div>
          <div>
            <IconSparkles size={24} />
            <Body>{t`More possibilities, at your pace`}</Body>
          </div>
          <Button
            href="/getting-started"
            label={t`See how to begin`}
            variant="outlined"
          />
        </StyledSticky>
      </StyledSplit>
    </SectionShell>
  );
};

type PublicSiteApplicationsProps = {
  applicationId?: string;
  compact?: boolean;
};

export const PublicSiteApplications = ({
  applicationId,
  compact = false,
}: PublicSiteApplicationsProps = {}) => {
  const { t, i18n } = useLingui();
  // Thin ASCII strokes need opacity compensation at card size.
  const illustrationFilterId = useId();
  const selectedApplication = PUBLIC_SITE_APPLICATIONS.find(
    (application) => application.id === applicationId,
  );
  return (
    <SectionShell>
      <SectionStack>
        <StyledCenteredIntro>
          <Eyebrow>
            {selectedApplication
              ? t`A closer look at ${i18n._(selectedApplication.name)}.`
              : t`A familiar place for different kinds of work.`}
          </Eyebrow>
          <Heading size="lg" weight="light">
            {selectedApplication
              ? t`Useful details. *A familiar way to work.*`
              : t`Your everyday essentials. *One shared workspace.*`}
          </Heading>
          <Body
            muted
          >{t`Applications are available according to your instance configuration and workspace installation.`}</Body>
        </StyledCenteredIntro>
        <svg
          width={0}
          height={0}
          aria-hidden="true"
          focusable="false"
          style={{ position: 'absolute' }}
        >
          <filter id={illustrationFilterId} colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncA type="linear" slope={3} />
            </feComponentTransfer>
          </filter>
        </svg>
        <StyledGrid data-detail={!!applicationId} data-compact={compact}>
          {PUBLIC_SITE_APPLICATIONS.filter(
            (application) => !applicationId || application.id === applicationId,
          ).map(
            ({
              id,
              name,
              Icon,
              illustration,
              heading,
              body,
              details,
              availability,
              workflow,
            }) => (
              <StyledCard id={id} key={id}>
                {!compact && (
                  <StyledIllustration aria-hidden="true">
                    {illustration ? (
                      <img
                        src={illustration}
                        style={{ filter: `url(#${illustrationFilterId})` }}
                        alt=""
                        width={1483}
                        height={1478}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    ) : (
                      <Icon size={144} aria-hidden={true} />
                    )}
                  </StyledIllustration>
                )}
                <div>
                  <Icon size={40} aria-hidden={true} />
                  <Eyebrow>{i18n._(name)}</Eyebrow>
                  <h3>{i18n._(heading)}</h3>
                  <p>{i18n._(body)}</p>
                  {!compact && (
                    <ul>
                      {details.map((detail) => (
                        <li key={detail.id}>{i18n._(detail)}</li>
                      ))}
                    </ul>
                  )}
                  {!compact && (
                    <StyledAvailability>
                      {i18n._(availability)}
                    </StyledAvailability>
                  )}
                  {applicationId && (
                    <StyledWorkflow>
                      <h3>{t`How it fits into your day`}</h3>
                      <p>{i18n._(workflow)}</p>
                    </StyledWorkflow>
                  )}
                  {!applicationId && (
                    <div style={{ marginTop: 24 }}>
                      <Button
                        href={`/apps/${id}`}
                        label={t`Explore ${i18n._(name)}`}
                        variant="outlined"
                      />
                    </div>
                  )}
                </div>
              </StyledCard>
            ),
          )}
        </StyledGrid>
      </SectionStack>
    </SectionShell>
  );
};

export const PublicSiteUseCases = () => {
  const { t } = useLingui();
  return (
    <SectionShell scheme="muted">
      <SectionStack>
        <SectionIntro>
          <Eyebrow>{t`A different day for everyone.`}</Eyebrow>
          <Heading
            size="lg"
            weight="light"
          >{t`One starting point. *Many ways to work.*`}</Heading>
        </SectionIntro>
        <div>
          <StyledUseCase id="individuals">
            <h3>{t`For your own ideas.`}</h3>
            <div>
              <Body
                muted
              >{t`A personal notebook, a course hub, a weekly plan. Keep study notes and everyday projects in a space that is easy to return to.`}</Body>
            </div>
          </StyledUseCase>
          <StyledUseCase id="teams">
            <h3>{t`For the work you share.`}</h3>
            <div>
              <Body
                muted
              >{t`A team home, a project brief, a place for meeting notes. Give each project a little structure and invite the people who make it happen.`}</Body>
            </div>
          </StyledUseCase>
          <StyledUseCase id="organizations">
            <h3>{t`For a bigger picture.`}</h3>
            <div>
              <Body
                muted
              >{t`Bring an organization’s knowledge and client work together. Add Bilan when finance belongs in the workflow, and keep access suited to each person’s role.`}</Body>
            </div>
          </StyledUseCase>
        </div>
        <StyledActions>
          <Button href={AppPath.SignInUp} label={t`Find your starting point`} />
          <Button
            href="/apps"
            label={t`Explore applications`}
            variant="outlined"
          />
        </StyledActions>
      </SectionStack>
    </SectionShell>
  );
};

export const PublicSiteFaq = () => {
  const { t, i18n } = useLingui();
  return (
    <div id="questions">
      <SectionShell scheme="dark" rhythm="spacious">
        <SectionStack>
          <SectionIntro>
            <Eyebrow>{t`A few things you might wonder.`}</Eyebrow>
            <StyledHeadingMeasure>
              <Heading
                size="lg"
                weight="light"
              >{t`A little clarity. *Then, a fresh start.*`}</Heading>
            </StyledHeadingMeasure>
            <StyledActions>
              <Button href={AppPath.SignInUp} label={t`Get started`} />
              <Button
                href="/getting-started"
                label={t`Getting started guide`}
                variant="outlined"
              />
            </StyledActions>
          </SectionIntro>
          <StyledFaqList>
            {PUBLIC_SITE_FAQ.map(({ question, answer }) => (
              <details key={question.id}>
                <summary>{i18n._(question)}</summary>
                <p>{i18n._(answer)}</p>
              </details>
            ))}
          </StyledFaqList>
        </SectionStack>
      </SectionShell>
    </div>
  );
};

type PublicSiteProductPreviewProps = { initialTabId?: string };

export const PublicSiteProductPreview = ({
  initialTabId,
}: PublicSiteProductPreviewProps = {}) => {
  const { t } = useLingui();
  return (
    <>
      <PublicWorkspacePreview
        key={initialTabId ?? 'home'}
        initialTabId={initialTabId}
      />
      <StyledCaption>{t`An interactive example with sample data. Explore the tabs to look around.`}</StyledCaption>
    </>
  );
};

export const PublicSiteImportGuide = () => {
  const { t } = useLingui();
  return (
    <div id="import">
      <SectionShell>
        <SectionStack>
          <SectionIntro>
            <Eyebrow>{t`Bring your knowledge along.`}</Eyebrow>
            <Heading
              size="lg"
              weight="light"
            >{t`Your notes deserve *a good new home.*`}</Heading>
          </SectionIntro>
          <StyledGrid>
            {[
              {
                title: t`1. Export from Notion`,
                body: t`Choose HTML or Markdown & CSV. Include subpages and files, then keep the export as a ZIP. HTML retains more formatting.`,
              },
              {
                title: t`2. Preview in Bureau`,
                body: t`Choose Import, select Notion and drop the ZIP. Browse the page tree, inspect the content and check any reported limitations.`,
              },
              {
                title: t`3. Choose a destination`,
                body: t`Import at the top of Bureau or inside an existing page. Pages and supported attachments keep their structure. Notion permissions, comments, formulas and database views are not transferred.`,
              },
            ].map(({ title, body }) => (
              <StyledCard key={title}>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </StyledCard>
            ))}
          </StyledGrid>
        </SectionStack>
      </SectionShell>
    </div>
  );
};
