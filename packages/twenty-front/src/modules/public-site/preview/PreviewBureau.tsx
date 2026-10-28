import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import {
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconFileText,
  IconNotes,
  IconTable,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import {
  StyledPreviewAvatar,
  StyledPreviewBadge,
  StyledPreviewButton,
  PreviewTable,
} from './PreviewPrimitives';

const StyledDocument = styled.article`
  margin: auto;
  max-width: 760px;
  padding: 30px 36px 36px;
  h3 {
    font-size: 29px;
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1.25;
    margin: 14px 0 12px;
  }
  h4 {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 24px 0 12px;
  }
  p {
    color: ${themeCssVariables.font.color.secondary};
    font-size: 13px;
    line-height: 1.8;
    margin: 12px 0;
  }
  @media (max-width: 600px) {
    padding: 24px 18px;
  }
`;
const StyledByline = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-wrap: wrap;
  font-size: 11px;
  gap: 7px;
  margin: 0 0 22px;
`;
const StyledCallout = styled.div`
  align-items: start;
  background: ${themeCssVariables.accent.quaternary};
  border: 1px solid ${themeCssVariables.accent.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  font-size: 13px;
  gap: 12px;
  line-height: 1.8;
  margin: 20px 0;
  padding: 14px 16px;
  svg {
    flex-shrink: 0;
    margin-top: 3px;
  }
`;
const StyledPages = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  overflow: hidden;
  button {
    align-items: center;
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    display: flex;
    font: inherit;
    font-size: 12px;
    gap: 9px;
    padding: 12px 14px;
    text-align: left;
    width: 100%;
  }
  button + button {
    border-top: 1px solid ${themeCssVariables.border.color.light};
  }
  button:hover {
    background: ${themeCssVariables.background.secondary};
  }
  button > svg:last-child {
    color: ${themeCssVariables.font.color.tertiary};
    margin-left: auto;
  }
`;
const StyledDatabase = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  overflow: hidden;
  > header {
    align-items: center;
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    display: flex;
    font-size: 11px;
    gap: 8px;
    padding: 9px 12px;
  }
`;

export const PreviewBureau = () => {
  const { t } = useLingui();
  const [noteId, setNoteId] = useState('home');
  const notes = [
    {
      id: 'brief',
      title: t`Project brief`,
      body: t`A shared place for the next chapter. Capture the goal, the people involved and the decisions that shape the project.`,
      detail: t`Our goal: create a useful team handbook. Start with onboarding, project context and a clear home for recurring meeting notes.`,
    },
    {
      id: 'ideas',
      title: t`Ideas & inspiration`,
      body: t`Give unfinished ideas a place to grow. Group research, useful links and sketches before turning them into a plan.`,
      detail: t`Keep the structure simple: a welcome page, a project index and a place to record what we learn along the way.`,
    },
    {
      id: 'meeting',
      title: t`Meeting notes`,
      body: t`Weekly review · Design and planning`,
      detail: t`Decision: begin with a small handbook. Next step: gather the first ideas and review the project brief together.`,
    },
  ];
  const currentNote = notes.find((note) => note.id === noteId);
  return (
    <StyledDocument>
      {currentNote ? (
        <StyledPreviewButton type="button" onClick={() => setNoteId('home')}>
          <IconArrowLeft size={14} />
          {t`Back to parent page`}
        </StyledPreviewButton>
      ) : (
        <IconNotes size={34} aria-hidden />
      )}
      <h3>{currentNote?.title ?? t`A little space to think.`}</h3>
      <StyledByline>
        <StyledPreviewAvatar>ML</StyledPreviewAvatar>
        <span>{t`Maya Laurent`}</span>
        <span aria-hidden>·</span>
        <span>{t`Shared with A2E Studio`}</span>
        <StyledPreviewBadge data-tone="green">{t`Team knowledge`}</StyledPreviewBadge>
      </StyledByline>
      <p>
        {currentNote?.body ??
          t`Good work starts with a clear idea. Collect it here, give it a little structure, and see where it takes you.`}
      </p>
      <StyledCallout>
        <IconCheck size={17} aria-hidden />
        <span>
          {currentNote?.detail ??
            t`One place for the brief, the meeting notes and the next step. Everything stays connected.`}
        </span>
      </StyledCallout>
      <h4>{currentNote ? t`Related pages` : t`Our next chapter`}</h4>
      <StyledPages>
        {notes
          .filter((note) => note.id !== noteId)
          .map((note) => (
            <button
              type="button"
              key={note.id}
              onClick={() => setNoteId(note.id)}
            >
              <IconFileText size={15} aria-hidden />
              {note.title}
              <IconChevronRight size={14} aria-hidden />
            </button>
          ))}
      </StyledPages>
      <h4>{t`Project overview`}</h4>
      <StyledDatabase>
        <header>
          <IconTable size={14} aria-hidden />
          {t`Connected work`}
        </header>
        <PreviewTable
          label={t`Connected project overview`}
          columns={[t`Project`, t`Status`, t`Owner`]}
        >
          <tr>
            <td>
              <button type="button" onClick={() => setNoteId('brief')}>
                <IconFileText size={14} />
                {t`Team handbook`}
              </button>
            </td>
            <td>
              <StyledPreviewBadge data-tone="orange">{t`In progress`}</StyledPreviewBadge>
            </td>
            <td>
              <StyledPreviewAvatar>ML</StyledPreviewAvatar>
            </td>
          </tr>
          <tr>
            <td>
              <button type="button" onClick={() => setNoteId('meeting')}>
                <IconFileText size={14} />
                {t`Weekly review`}
              </button>
            </td>
            <td>
              <StyledPreviewBadge>{t`Planned`}</StyledPreviewBadge>
            </td>
            <td>
              <StyledPreviewAvatar>AR</StyledPreviewAvatar>
            </td>
          </tr>
        </PreviewTable>
      </StyledDatabase>
    </StyledDocument>
  );
};
