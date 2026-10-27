import {
  IconAgenda,
  IconBilan,
  IconBureau,
  IconSyna,
} from '@/a2e-workspace/components/A2eAppLogo';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useRef, useState } from 'react';
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconCheckbox,
  IconSearch,
  IconFolder,
  IconUsers,
  IconSparkles,
  IconArrowLeft,
} from 'twenty-ui/icon';
import { color, mediaUp, semanticColor } from '@/public-site/tokens';

const StyledFrame = styled.div`
  background: ${color('white')};
  border: 1px solid ${semanticColor.lineStrong};
  border-radius: 12px;
  box-shadow: 0 24px 80px ${color('black-10')};
  color: ${color('black')};
  font-family: 'Inter', sans-serif;
  margin: auto;
  max-width: 1040px;
  overflow: hidden;
  position: relative;
  text-align: left;
  width: 100%;
`;
const StyledTitlebar = styled.div`
  align-items: center;
  background: ${color('white')};
  border-bottom: 1px solid ${semanticColor.line};
  color: ${semanticColor.inkMuted};
  display: flex;
  font-size: 12px;
  gap: 6px;
  padding: 12px 16px;
  > i {
    background: ${semanticColor.lineStrong};
    border-radius: 50%;
    height: 8px;
    width: 8px;
  }
  > span {
    margin: auto;
    padding-right: 36px;
  }
`;
const StyledLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 480px;
  ${mediaUp('md')} {
    grid-template-columns: 200px minmax(0, 1fr);
  }
`;
const StyledSidebar = styled.div`
  background: ${color('neutral')};
  border-bottom: 1px solid ${semanticColor.line};
  padding: 12px;
  > strong {
    align-items: center;
    display: none;
    font-size: 14px;
    gap: 8px;
    padding: 12px 8px 28px;
  }
  > div {
    display: grid;
    gap: 4px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  button {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: ${semanticColor.inkMuted};
    cursor: pointer;
    display: flex;
    flex: 1;
    flex-direction: column;
    font-family: inherit;
    font-size: 13px;
    gap: 8px;
    padding: 10px 4px;
    text-align: left;
  }
  button[aria-selected='true'] {
    background: ${color('black-5')};
    color: ${semanticColor.ink};
  }
  button:hover {
    background: ${color('black-5')};
  }
  ${mediaUp('md')} {
    border-bottom: none;
    border-right: 1px solid ${semanticColor.line};
    > strong {
      display: flex;
    }
    > div {
      display: flex;
      flex-direction: column;
    }
    button {
      flex-direction: row;
      padding: 10px;
    }
  }
`;
const StyledMain = styled.div`
  min-width: 0;
  > header {
    align-items: center;
    border-bottom: 1px solid ${semanticColor.line};
    color: ${semanticColor.inkMuted};
    display: flex;
    font-size: 12px;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
  }
  > article {
    animation: public-preview-arrive 240ms ease both;
    padding: 28px 24px;
  }
  h3 {
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -0.04em;
    margin: 12px 0;
  }
  h4 {
    font-size: 15px;
    font-weight: 500;
    margin: 24px 0 12px;
  }
  p {
    color: ${semanticColor.inkMuted};
    font-size: 14px;
    line-height: 1.7;
    margin: 12px 0;
  }
  ul {
    color: ${semanticColor.inkMuted};
    font-size: 13px;
    line-height: 1.8;
    padding-left: 20px;
  }
  ${mediaUp('md')} {
    > article {
      padding: 36px 52px;
    }
  }
  @keyframes public-preview-arrive {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
const StyledCallout = styled.div`
  align-items: start;
  background: ${color('blue-5')};
  border: 1px solid ${color('blue-10')};
  border-radius: 6px;
  display: flex;
  font-size: 13px;
  gap: 12px;
  line-height: 1.7;
  margin: 20px 0;
  padding: 16px;
  svg {
    flex-shrink: 0;
    margin-top: 3px;
  }
`;
const StyledRows = styled.div`
  border: 1px solid ${semanticColor.line};
  border-radius: 6px;
  overflow: hidden;
  > div,
  > button,
  > label {
    align-items: center;
    display: flex;
    font-size: 13px;
    gap: 12px;
    justify-content: space-between;
    min-height: 44px;
    padding: 12px;
  }
  span {
    align-items: center;
    display: flex;
    gap: 10px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  small {
    background: ${color('blue-5')};
    border-radius: 4px;
    color: ${color('blue')};
    padding: 4px 6px;
    white-space: nowrap;
  }
  > button {
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    width: 100%;
  }
  > button:hover,
  > label:hover {
    background: ${color('neutral')};
  }
  > label {
    cursor: pointer;
  }
  input {
    accent-color: ${color('blue')};
  }
  > * + * {
    border-top: 1px solid ${semanticColor.line};
  }
`;
const StyledBack = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: ${semanticColor.inkMuted};
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 12px;
  gap: 6px;
  padding: 0;
`;
const StyledCalendar = styled.div`
  display: grid;
  gap: 1px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  > div {
    background: ${color('neutral')};
    border: 1px solid ${semanticColor.line};
    border-radius: 4px;
    min-height: 180px;
    padding: 8px;
  }
  strong {
    color: ${semanticColor.inkMuted};
    font-size: 11px;
    font-weight: 400;
  }
  p {
    background: ${color('blue-5')};
    border-left: 2px solid ${color('blue')};
    border-radius: 3px;
    font-size: 11px;
    line-height: 1.5;
    overflow-wrap: anywhere;
    padding: 8px;
  }
`;

type PublicWorkspacePreviewProps = { initialTabId?: string };

export const PublicWorkspacePreview = ({
  initialTabId = 'bureau',
}: PublicWorkspacePreviewProps = {}) => {
  const { t } = useLingui();
  const tabs = [
    { id: 'bureau', label: t`Bureau`, Icon: IconBureau },
    { id: 'projects', label: t`Projects`, Icon: IconCheckbox },
    { id: 'agenda', label: t`Agenda`, Icon: IconAgenda },
    { id: 'bilan', label: t`Bilan`, Icon: IconBilan },
    { id: 'archive', label: t`Archive`, Icon: IconFolder },
    { id: 'crm', label: t`CRM`, Icon: IconUsers },
    { id: 'syna', label: t`Syna`, Icon: IconSyna },
  ];
  const [activeId, setActiveId] = useState(
    tabs.some((tab) => tab.id === initialTabId) ? initialTabId : 'bureau',
  );
  const [noteId, setNoteId] = useState('home');
  const [completedTasks, setCompletedTasks] = useState(['brief']);
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
  const tabListRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  return (
    <StyledFrame aria-label={t`Interactive example workspace`}>
      <StyledTitlebar aria-hidden="true">
        <i />
        <i />
        <i />
        <span>A2E Suite · {t`Example workspace`}</span>
      </StyledTitlebar>
      <StyledLayout>
        <StyledSidebar>
          <strong>
            A2E Studio <IconChevronDown size={14} />
            <IconSearch size={14} />
          </strong>
          <div
            role="tablist"
            aria-label={t`Explore the applications`}
            ref={tabListRef}
          >
            {tabs.map(({ id, label, Icon }, index) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`preview-tab-${id}`}
                aria-controls="public-preview-panel"
                aria-selected={activeId === id}
                tabIndex={activeId === id ? 0 : -1}
                onClick={() => setActiveId(id)}
                onKeyDown={(event) => {
                  const offset =
                    event.key === 'ArrowRight' || event.key === 'ArrowDown'
                      ? 1
                      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                        ? -1
                        : 0;
                  if (
                    offset === 0 &&
                    event.key !== 'Home' &&
                    event.key !== 'End'
                  )
                    return;
                  event.preventDefault();
                  const nextIndex =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tabs.length - 1
                        : (index + offset + tabs.length) % tabs.length;
                  setActiveId(tabs[nextIndex].id);
                  tabListRef.current
                    ?.querySelectorAll<HTMLButtonElement>('button')
                    [nextIndex]?.focus();
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </StyledSidebar>
        <StyledMain
          role="tabpanel"
          id="public-preview-panel"
          aria-labelledby={`preview-tab-${activeId}`}
          tabIndex={0}
        >
          <header>
            <activeTab.Icon size={14} />
            {activeTab.label}
            <IconChevronRight size={12} />
            {currentNote && activeId === 'bureau'
              ? currentNote.title
              : t`A fresh start`}
          </header>
          <article key={activeId}>
            {activeId === 'bureau' && !currentNote && (
              <>
                <IconBureau size={48} />
                <h3>{t`A little space to think.`}</h3>
                <p>{t`Good work starts with a clear idea. Collect it here, give it a little structure, and see where it takes you.`}</p>
                <StyledCallout>
                  <IconCheck size={18} />
                  <span>{t`One place for the brief, the meeting notes and the next step. Everything stays connected.`}</span>
                </StyledCallout>
                <h4>{t`Our next chapter`}</h4>
                <StyledRows>
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => setNoteId(note.id)}
                    >
                      <span>
                        <IconFileText size={15} />
                        {note.title}
                      </span>
                      <IconChevronRight size={14} />
                    </button>
                  ))}
                </StyledRows>
              </>
            )}
            {activeId === 'bureau' && currentNote && (
              <>
                <StyledBack type="button" onClick={() => setNoteId('home')}>
                  <IconArrowLeft size={14} />
                  {t`Back to parent page`}
                </StyledBack>
                <h3>{currentNote.title}</h3>
                <p>{currentNote.body}</p>
                <StyledCallout>
                  <IconFileText size={18} />
                  <span>{currentNote.detail}</span>
                </StyledCallout>
                <h4>{t`Related pages`}</h4>
                <StyledRows>
                  {notes
                    .filter((note) => note.id !== noteId)
                    .map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => setNoteId(note.id)}
                      >
                        <span>
                          <IconFileText size={15} />
                          {note.title}
                        </span>
                        <IconChevronRight size={14} />
                      </button>
                    ))}
                </StyledRows>
              </>
            )}
            {activeId === 'projects' && (
              <>
                <IconCheckbox size={32} />
                <h3>{t`Small steps. Real progress.`}</h3>
                <p>{t`Turn the brief into a plan and give every next step a home.`}</p>
                <p>{t`${completedTasks.length} of 3 steps complete`}</p>
                <StyledRows>
                  {[
                    { id: 'brief', label: t`Write the project brief` },
                    { id: 'ideas', label: t`Gather the first ideas` },
                    { id: 'review', label: t`Plan the next review` },
                  ].map(({ id, label }) => (
                    <label key={id}>
                      <span>
                        <input
                          type="checkbox"
                          aria-label={label}
                          checked={completedTasks.includes(id)}
                          onChange={() =>
                            setCompletedTasks((previous) =>
                              previous.includes(id)
                                ? previous.filter((entry) => entry !== id)
                                : [...previous, id],
                            )
                          }
                        />
                        {label}
                      </span>
                      <small>
                        {completedTasks.includes(id) ? t`Done` : t`To do`}
                      </small>
                    </label>
                  ))}
                </StyledRows>
              </>
            )}
            {activeId === 'agenda' && (
              <>
                <IconAgenda size={48} />
                <h3>{t`Make room for what matters.`}</h3>
                <p>{t`A little perspective on the week ahead.`}</p>
                <StyledCalendar>
                  {[t`Mon`, t`Tue`, t`Wed`, t`Thu`, t`Fri`].map(
                    (day, index) => (
                      <div key={day}>
                        <strong>{day}</strong>
                        {index === 0 && (
                          <p>
                            10:00
                            <br />
                            {t`Weekly planning`}
                          </p>
                        )}
                        {index === 2 && (
                          <p>
                            14:00
                            <br />
                            {t`Project review`}
                          </p>
                        )}
                        {index === 4 && (
                          <p>
                            11:00
                            <br />
                            {t`Team catch-up`}
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </StyledCalendar>
              </>
            )}
            {activeId === 'bilan' && (
              <>
                <IconBilan size={48} />
                <h3>{t`A clearer view of the numbers.`}</h3>
                <p>{t`Keep financial documents beside the work they support. Example data for the optional Bilan application.`}</p>
                <StyledRows>
                  <div>
                    <span>{t`Project quote`}</span>
                    <small>{t`Draft`}</small>
                  </div>
                  <div>
                    <span>{t`Monthly budget`}</span>
                    <small>{t`Planning`}</small>
                  </div>
                  <div>
                    <span>{t`Supplier documents`}</span>
                    <IconFileText size={16} />
                  </div>
                </StyledRows>
              </>
            )}
            {activeId === 'archive' && (
              <>
                <IconFolder size={32} />
                <h3>{t`A home for the files behind your work.`}</h3>
                <p>{t`Organize folders, upload documents and preview supported files. Archive is available when installed in your workspace.`}</p>
                <StyledRows>
                  <div>
                    <span>
                      <IconFolder size={16} />
                      {t`Project documents`}
                    </span>
                    <small>{t`Folder`}</small>
                  </div>
                  <div>
                    <span>
                      <IconFileText size={16} />
                      {t`Team handbook.pdf`}
                    </span>
                    <small>PDF</small>
                  </div>
                  <div>
                    <span>
                      <IconFileText size={16} />
                      {t`Project sketch.png`}
                    </span>
                    <small>PNG</small>
                  </div>
                </StyledRows>
              </>
            )}
            {activeId === 'crm' && (
              <>
                <IconUsers size={32} />
                <h3>{t`Keep the people and the context together.`}</h3>
                <p>{t`Work with contacts, companies and opportunities. Choose the CRM starting point or enable CRM navigation for your workspace.`}</p>
                <h4>{t`Opportunities`}</h4>
                <StyledRows>
                  <div>
                    <span>{t`Studio North · Website project`}</span>
                    <small>{t`New`}</small>
                  </div>
                  <div>
                    <span>{t`Atelier · Team workspace`}</span>
                    <small>{t`Proposal`}</small>
                  </div>
                  <div>
                    <span>{t`Local collective · Workshop`}</span>
                    <small>{t`Meeting`}</small>
                  </div>
                </StyledRows>
              </>
            )}
            {activeId === 'syna' && (
              <>
                <IconSyna size={48} />
                <h3>{t`A little help with the next step.`}</h3>
                <p>{t`Ask questions and work with an AI assistant when your instance has a provider configured. Available tools depend on your access.`}</p>
                <h4>{t`Example conversation`}</h4>
                <p>{t`How could I structure a team handbook?`}</p>
                <StyledCallout>
                  <IconSparkles size={18} />
                  <span>{t`Start with a welcome page, the team's ways of working, an index of projects and a place for recurring meeting notes. Review the outline with your team before expanding it.`}</span>
                </StyledCallout>
                <p>{t`Illustrative answer. This preview does not send a request to an AI service.`}</p>
              </>
            )}
          </article>
        </StyledMain>
      </StyledLayout>
    </StyledFrame>
  );
};
