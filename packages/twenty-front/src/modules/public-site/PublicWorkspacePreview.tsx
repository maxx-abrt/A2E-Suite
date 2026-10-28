import {
  IconA2eSuite,
  IconAgenda,
  IconBilan,
  IconBureau,
  IconSyna,
} from '@/a2e-workspace/components/A2eAppLogo';
import { PreviewAgenda } from '@/public-site/preview/PreviewAgenda';
import { PreviewBureau } from '@/public-site/preview/PreviewBureau';
import { StyledPreviewButton } from '@/public-site/preview/PreviewPrimitives';
import { PreviewRecords } from '@/public-site/preview/PreviewRecords';
import { PreviewCrm } from '@/public-site/preview/PreviewCrm';
import { PreviewSyna } from '@/public-site/preview/PreviewSyna';
import { mediaUp } from '@/public-site/tokens';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useId, useRef, useState } from 'react';
import {
  IconCheckbox,
  IconFileText,
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconMoon,
  IconSun,
  IconUsers,
} from 'twenty-ui/icon';
import { ThemeProvider, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledFrame = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.strong};
  border-radius: 16px;
  box-shadow: ${themeCssVariables.boxShadow.superHeavy};
  color: ${themeCssVariables.font.color.primary};
  font-family: ${themeCssVariables.font.family};
  font-size: 13px;
  margin: auto;
  max-width: 1160px;
  overflow: hidden;
  position: relative;
  text-align: left;
  width: 100%;
  button:focus-visible,
  input:focus-visible,
  [tabindex='0']:focus-visible {
    outline: 2px solid ${themeCssVariables.font.color.primary};
    outline-offset: -2px;
  }
  button,
  input {
    font-family: inherit;
  }
  [hidden] {
    display: none;
  }
`;
const StyledTitlebar = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: 11px;
  gap: 12px;
  justify-content: space-between;
  min-height: 46px;
  padding: 8px 12px;
  > span {
    align-items: center;
    display: inline-flex;
    gap: 7px;
    min-width: 0;
  }
  > span:first-child {
    display: none;
  }
  i {
    background: ${themeCssVariables.border.color.strong};
    border-radius: 50%;
    corner-shape: round;
    height: 7px;
    width: 7px;
  }
  i:nth-child(1) {
    background: ${themeCssVariables.color.red};
  }
  i:nth-child(2) {
    background: ${themeCssVariables.color.yellow};
  }
  i:nth-child(3) {
    background: ${themeCssVariables.color.green};
  }
  ${mediaUp('md')} {
    > span:first-child {
      display: inline-flex;
    }
  }
`;
const StyledLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 620px;
  ${mediaUp('md')} {
    grid-template-columns: 208px minmax(0, 1fr);
  }
`;
const StyledSidebar = styled.aside`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  min-width: 0;
  padding: 8px;
  > strong {
    align-items: center;
    display: none;
    font-size: 12px;
    font-weight: 500;
    gap: 8px;
    padding: 14px 8px 24px;
  }
  > small {
    color: ${themeCssVariables.font.color.tertiary};
    display: none;
    font-size: 10px;
    padding: 0 10px 8px;
  }
  > div {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: thin;
  }
  button {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: ${themeCssVariables.border.radius.sm};
    color: ${themeCssVariables.font.color.secondary};
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    font: inherit;
    font-size: 12px;
    gap: 8px;
    padding: 9px 10px;
    text-align: left;
  }
  button[aria-selected='true'] {
    background: ${themeCssVariables.background.tertiary};
    color: ${themeCssVariables.font.color.primary};
  }
  button:hover {
    background: ${themeCssVariables.background.tertiary};
  }
  ${mediaUp('md')} {
    align-content: start;
    border-bottom: 0;
    border-right: 1px solid ${themeCssVariables.border.color.light};
    display: grid;
    grid-template-rows: repeat(9, min-content) 1fr;
    > strong {
      display: flex;
    }
    > small {
      display: block;
    }
    > div {
      display: contents;
    }
    > strong {
      grid-row: 1;
    }
    > small {
      grid-row: 2;
    }
    button {
      width: 100%;
    }
  }
`;
const StyledBureauSections = styled.nav`
  border-left: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  gap: 4px;
  margin: 8px 0 0 16px;
  padding-left: 10px;
  button {
    font-size: 11px;
  }
  button[aria-pressed='true'] {
    background: ${themeCssVariables.background.tertiary};
    color: ${themeCssVariables.font.color.primary};
  }
  ${mediaUp('md')} {
    flex-direction: column;
    grid-row: 4;
    margin: 4px 0 10px 16px;
  }
`;
const StyledWorkspaceInitial = styled.span`
  align-items: center;
  background: ${themeCssVariables.color.orange3};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: inline-flex;
  font-size: 10px;
  font-weight: 600;
  height: 23px;
  justify-content: center;
  width: 23px;
`;
const StyledMain = styled.div`
  min-width: 0;
  > header {
    align-items: center;
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.tertiary};
    display: flex;
    font-size: 11px;
    gap: 7px;
    min-height: 42px;
    padding: 0 18px;
  }
  > header > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
const StyledFootnote = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-wrap: wrap;
  font-size: 10px;
  gap: 8px;
  justify-content: space-between;
  line-height: 1.6;
  padding: 9px 16px;
  > span:first-child {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }
`;

type PublicWorkspacePreviewProps = { initialTabId?: string };

export const PublicWorkspacePreview = ({
  initialTabId = 'projects',
}: PublicWorkspacePreviewProps = {}) => {
  const { t } = useLingui();
  const tabs = [
    {
      id: 'bureau',
      label: t`Bureau`,
      page: t`Team handbook`,
      Icon: IconBureau,
    },
    {
      id: 'agenda',
      label: t`Agenda`,
      page: t`Team calendar`,
      Icon: IconAgenda,
    },
    { id: 'bilan', label: t`Bilan`, page: t`Sales documents`, Icon: IconBilan },
    { id: 'archive', label: t`Archive`, page: t`All files`, Icon: IconFolder },
    { id: 'crm', label: t`CRM`, page: t`Client workspace`, Icon: IconUsers },
    {
      id: 'syna',
      label: t`Syna`,
      page: t`Example conversation`,
      Icon: IconSyna,
    },
  ];
  const [activeId, setActiveId] = useState(
    initialTabId === 'projects' || tabs.some((tab) => tab.id === initialTabId)
      ? initialTabId
      : 'bureau',
  );
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const tabListRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const panelId = `public-preview-panel-${instanceId}`;
  const activeTab =
    tabs.find(
      (tab) => tab.id === (activeId === 'projects' ? 'bureau' : activeId),
    ) ?? tabs[0];
  return (
    <ThemeProvider colorScheme={colorScheme} applyToRoot={false}>
      <StyledFrame role="region" aria-label={t`Interactive example workspace`}>
        <StyledTitlebar>
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <IconA2eSuite size={20} />
            A2E Suite · {t`Example workspace`}
          </span>
          <StyledPreviewButton
            type="button"
            aria-label={
              colorScheme === 'light'
                ? t`Use dark preview`
                : t`Use light preview`
            }
            onClick={() =>
              setColorScheme(colorScheme === 'light' ? 'dark' : 'light')
            }
          >
            {colorScheme === 'light' ? (
              <IconMoon size={14} />
            ) : (
              <IconSun size={14} />
            )}
          </StyledPreviewButton>
        </StyledTitlebar>
        <StyledLayout>
          <StyledSidebar>
            <strong>
              <StyledWorkspaceInitial>A2E</StyledWorkspaceInitial>A2E Studio
              <IconChevronDown size={12} />
            </strong>
            <small>{t`Applications`}</small>
            <div
              role="tablist"
              aria-label={t`Explore the applications`}
              ref={tabListRef}
            >
              {tabs.map(({ id, label, Icon }, index) => (
                <button
                  key={id}
                  style={{ gridRow: index === 0 ? 3 : index + 4 }}
                  type="button"
                  role="tab"
                  id={`preview-tab-${id}-${instanceId}`}
                  aria-controls={panelId}
                  aria-selected={activeTab.id === id}
                  tabIndex={activeTab.id === id ? 0 : -1}
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
                  <Icon size={16} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <StyledBureauSections aria-label={t`Bureau example sections`}>
              <button
                type="button"
                aria-pressed={activeId === 'bureau'}
                onClick={() => setActiveId('bureau')}
              >
                <IconFileText size={14} />
                {t`Pages`}
              </button>
              <button
                type="button"
                aria-pressed={activeId === 'projects'}
                onClick={() => setActiveId('projects')}
              >
                <IconCheckbox size={14} />
                {t`Projects`}
              </button>
            </StyledBureauSections>
          </StyledSidebar>
          <StyledMain
            role="tabpanel"
            id={panelId}
            aria-labelledby={`preview-tab-${activeTab.id}-${instanceId}`}
            tabIndex={0}
          >
            <header>
              <activeTab.Icon size={16} aria-hidden />
              {activeTab.label}
              <IconChevronRight size={12} aria-hidden />
              <span>
                {activeId === 'projects' ? t`Projects` : activeTab.page}
              </span>
            </header>
            <div hidden={activeId !== 'bureau'}>
              <PreviewBureau />
            </div>
            <div hidden={activeId !== 'projects'}>
              <PreviewRecords kind="projects" />
            </div>
            <div hidden={activeId !== 'agenda'}>
              <PreviewAgenda />
            </div>
            <div hidden={activeId !== 'bilan'}>
              <PreviewRecords kind="bilan" />
            </div>
            <div hidden={activeId !== 'archive'}>
              <PreviewRecords kind="archive" />
            </div>
            <div hidden={activeId !== 'crm'}>
              <PreviewCrm />
            </div>
            <div hidden={activeId !== 'syna'}>
              <PreviewSyna
                onOpenBureau={() => {
                  setActiveId('bureau');
                  tabListRef.current
                    ?.querySelector<HTMLButtonElement>('button')
                    ?.focus();
                }}
              />
            </div>
          </StyledMain>
        </StyledLayout>
        <StyledFootnote>
          <span>
            <IconA2eSuite size={20} />
            {t`Sample data · Changes stay in this preview`}
          </span>
          <span>{t`Try a view, open a record, or explore another application.`}</span>
        </StyledFootnote>
      </StyledFrame>
    </ThemeProvider>
  );
};
