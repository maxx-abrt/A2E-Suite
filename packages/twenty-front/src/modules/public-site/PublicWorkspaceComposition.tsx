import {
  IconAgenda,
  IconBilan,
  IconBureau,
} from '@/a2e-workspace/components/A2eAppLogo';
import { PublicAsciiArt } from '@/public-site/PublicAsciiArt';
import {
  color,
  fontFamily,
  mediaUp,
  semanticColor,
} from '@/public-site/tokens';
import { Body } from '@/public-site/ui/Body';
import { Button } from '@/public-site/ui/Button';
import { Eyebrow } from '@/public-site/ui/Eyebrow';
import { Heading } from '@/public-site/ui/Heading';
import { SectionIntro } from '@/public-site/ui/SectionIntro';
import { SectionShell } from '@/public-site/ui/SectionShell';
import { SectionStack } from '@/public-site/ui/SectionStack';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { IconCheck, IconPlus, IconUsers } from 'twenty-ui/icon';

const StyledLayout = styled.div`
  display: grid;
  gap: 40px;
  grid-template-columns: minmax(0, 1fr);
  ${mediaUp('md')} {
    align-items: start;
    grid-template-columns: 1fr 1fr;
  }
`;
const StyledChoices = styled.fieldset`
  border: 0;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 28px 0 20px;
  min-width: 0;
  padding: 0;
  legend {
    color: ${semanticColor.inkMuted};
    font-size: 14px;
    margin-bottom: 16px;
  }
  label {
    align-items: center;
    border: 1px solid ${semanticColor.line};
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    font-size: 14px;
    gap: 10px;
    min-height: 48px;
    padding: 12px;
  }
  label[data-selected='true'] {
    background: ${color('blue-5')};
    border-color: ${color('blue')};
  }
  label:focus-within {
    outline: 2px solid ${color('blue')};
    outline-offset: 3px;
  }
  input {
    accent-color: ${color('blue')};
    flex-shrink: 0;
    margin: 0;
  }
`;
const StyledWorkspace = styled.div`
  background: ${color('white')};
  border: 1px solid ${semanticColor.lineStrong};
  border-radius: 10px;
  box-shadow: 0 12px 40px ${color('black-5')};
  overflow: hidden;
  > header {
    align-items: center;
    border-bottom: 1px solid ${semanticColor.line};
    display: flex;
    font-family: ${fontFamily('mono')};
    font-size: 11px;
    gap: 8px;
    padding: 16px 20px;
    text-transform: uppercase;
  }
  > div {
    padding: 24px;
  }
  h3 {
    font-size: 24px;
    font-weight: 400;
    letter-spacing: -0.03em;
    margin: 0 0 8px;
  }
  ul {
    display: grid;
    gap: 12px;
    list-style: none;
    margin: 24px 0;
    padding: 0;
  }
  li {
    align-items: center;
    border-bottom: 1px solid ${semanticColor.line};
    display: flex;
    font-size: 14px;
    gap: 12px;
    padding: 0 0 12px;
  }
  li > svg:first-child {
    color: ${color('blue')};
    flex-shrink: 0;
  }
  li > svg:last-child {
    color: ${color('blue')};
    margin-left: auto;
  }
`;
const StyledArtSlot = styled.div`
  height: 180px;
  margin: -12px 0;
  overflow: hidden;
`;
const StyledFootnote = styled.p`
  color: ${semanticColor.inkMuted};
  font-size: 12px;
  line-height: 1.7;
  margin: 20px 0 0 !important;
`;

export const PublicWorkspaceComposition = () => {
  const { t } = useLingui();
  const presets = [
    {
      id: 'individual',
      label: t`Individual`,
      description: t`A personal home for notes, projects and your week.`,
    },
    {
      id: 'student',
      label: t`Student`,
      description: t`A starting point for course notes, assignments and study plans.`,
    },
    {
      id: 'team',
      label: t`Team`,
      description: t`A shared home for team knowledge, projects and discussions.`,
    },
    {
      id: 'non-profit',
      label: t`Non-profit`,
      description: t`Bureau and Bilan together for an organization's work and finance documents.`,
    },
    {
      id: 'small-business',
      label: t`Small business`,
      description: t`Knowledge, projects and financial documents in one workspace.`,
    },
    {
      id: 'crm',
      label: t`CRM`,
      description: t`Start with contacts, companies and opportunities for client work.`,
    },
  ];
  const [selectedId, setSelectedId] = useState('individual');
  const preset = presets.find((entry) => entry.id === selectedId) ?? presets[0];
  const includesBilan =
    selectedId === 'non-profit' || selectedId === 'small-business';
  return (
    <div id="workspace-setup">
      <SectionShell scheme="muted">
        <SectionStack>
          <StyledLayout>
            <div>
              <SectionIntro>
                <Eyebrow>{t`A workspace that starts with you.`}</Eyebrow>
                <Heading
                  size="lg"
                  weight="light"
                >{t`Choose a starting point. *Make room to grow.*`}</Heading>
                <Body
                  muted
                >{t`Start with a useful set of tools or an empty workspace. Add available applications later, and keep CRM navigation optional.`}</Body>
              </SectionIntro>
              <StyledChoices>
                <legend>{t`Explore workspace starting points`}</legend>
                {presets.map(({ id, label }) => (
                  <label key={id} data-selected={selectedId === id}>
                    <input
                      type="radio"
                      name="public-workspace-preset"
                      value={id}
                      checked={selectedId === id}
                      onChange={() => setSelectedId(id)}
                    />
                    {label}
                  </label>
                ))}
              </StyledChoices>
              <Button
                href="/getting-started"
                label={t`How workspace setup works`}
                variant="outlined"
              />
              <StyledFootnote>{t`This is an illustration of setup. You review app availability and installation when creating your workspace. Archive and AI availability are configured separately.`}</StyledFootnote>
            </div>
            <StyledWorkspace
              role="region"
              aria-label={t`Starting point preview`}
            >
              <header>
                <IconPlus size={14} />
                A2E Suite · {t`Workspace setup`}
              </header>
              <div>
                <h3>{preset.label}</h3>
                <Body muted size="sm">
                  {preset.description}
                </Body>
                <StyledArtSlot>
                  <PublicAsciiArt
                    variant={includesBilan ? 'stack' : 'blocks'}
                  />
                </StyledArtSlot>
                <ul>
                  {selectedId === 'crm' ? (
                    <li>
                      <IconUsers size={18} />
                      <span>{t`Contacts, companies & opportunities`}</span>
                      <IconCheck size={16} />
                    </li>
                  ) : (
                    <>
                      <li>
                        <IconBureau size={24} />
                        <span>{t`Bureau Pages`}</span>
                        <IconCheck size={16} />
                      </li>
                      <li>
                        <IconCheck size={18} />
                        <span>{t`Projects & tasks`}</span>
                        <IconCheck size={16} />
                      </li>
                      <li>
                        <IconUsers size={18} />
                        <span>{t`Discussions`}</span>
                        <IconCheck size={16} />
                      </li>
                      {includesBilan && (
                        <li>
                          <IconBilan size={24} />
                          <span>{t`Bilan`}</span>
                          <IconCheck size={16} />
                        </li>
                      )}
                    </>
                  )}
                  <li>
                    <IconAgenda size={24} />
                    <span>{t`Agenda`}</span>
                    <IconCheck size={16} />
                  </li>
                </ul>
                <Body muted size="xs">
                  {selectedId === 'crm'
                    ? t`Bureau can be added later when your workspace needs notes and projects.`
                    : t`CRM navigation stays hidden in these starting points. You can enable it when you need it.`}
                </Body>
              </div>
            </StyledWorkspace>
          </StyledLayout>
        </SectionStack>
      </SectionShell>
    </div>
  );
};
