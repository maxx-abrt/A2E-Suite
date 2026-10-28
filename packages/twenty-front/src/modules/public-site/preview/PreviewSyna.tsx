import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { IconFileText, IconSparkles } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { IconSyna } from '@/a2e-workspace/components/A2eAppLogo';
import {
  StyledPreviewAvatar,
  StyledPreviewButton,
  StyledPreviewHeading,
} from './PreviewPrimitives';

const StyledConversation = styled.div`
  margin: auto;
  max-width: 680px;
  padding: 0 24px 28px;
  > div {
    border: 1px solid ${themeCssVariables.border.color.light};
    border-radius: ${themeCssVariables.border.radius.md};
    margin-bottom: 14px;
    padding: 18px;
  }
  > div[data-assistant] {
    background: ${themeCssVariables.accent.quaternary};
  }
  header {
    align-items: center;
    display: flex;
    font-size: 12px;
    font-weight: 600;
    gap: 8px;
  }
  p {
    font-size: 13px;
    line-height: 1.8;
    margin: 12px 0;
  }
  ol {
    color: ${themeCssVariables.font.color.secondary};
    font-size: 12px;
    line-height: 1.9;
    margin: 12px 0;
    padding-left: 20px;
  }
  > section {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 20px;
  }
  > small {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
    font-size: 11px;
    line-height: 1.8;
  }
`;
type PreviewSynaProps = { onOpenBureau: () => void };

export const PreviewSyna = ({ onOpenBureau }: PreviewSynaProps) => {
  const { t } = useLingui();
  const [prompt, setPrompt] = useState('handbook');
  return (
    <>
      <StyledPreviewHeading>
        <h3>{t`A little help with the next step.`}</h3>
        <p>{t`Explore a prepared conversation with Syna, in the context of your work.`}</p>
      </StyledPreviewHeading>
      <StyledConversation>
        <section aria-label={t`Example prompts`}>
          <StyledPreviewButton
            type="button"
            aria-pressed={prompt === 'handbook'}
            onClick={() => setPrompt('handbook')}
          >
            <IconFileText size={14} />
            {t`Structure a handbook`}
          </StyledPreviewButton>
          <StyledPreviewButton
            type="button"
            aria-pressed={prompt === 'review'}
            onClick={() => setPrompt('review')}
          >
            <IconSparkles size={14} />
            {t`Prepare the review`}
          </StyledPreviewButton>
        </section>
        <div>
          <header>
            <StyledPreviewAvatar>ML</StyledPreviewAvatar>
            {t`You`}
          </header>
          <p>
            {prompt === 'handbook'
              ? t`How could I structure a team handbook?`
              : t`What should we cover in the next project review?`}
          </p>
        </div>
        <div data-assistant="" aria-live="polite">
          <header>
            <IconSyna size={25} />
            Syna
          </header>
          <p>
            {prompt === 'handbook'
              ? t`Start with a small structure that is easy to keep useful.`
              : t`Use the project brief and the latest meeting notes to keep the review focused.`}
          </p>
          <ol>
            {(prompt === 'handbook'
              ? [
                  t`A welcome page and the team's ways of working.`,
                  t`A project index, with a clear goal and owner for each project.`,
                  t`A shared place for recurring meeting notes and decisions.`,
                ]
              : [
                  t`Revisit the goal and the decisions recorded in the brief.`,
                  t`Review what is complete, what is in progress and what needs help.`,
                  t`Agree on the next steps and record them in the meeting notes.`,
                ]
            ).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <StyledPreviewButton type="button" onClick={onOpenBureau}>
            <IconFileText size={14} />
            {t`Explore the example pages`}
          </StyledPreviewButton>
        </div>
        <small>
          {t`Illustrative answer. This preview does not send a request to an AI service.`}{' '}
          {t`Live assistant availability depends on your instance's provider configuration and your access.`}
        </small>
      </StyledConversation>
    </>
  );
};
