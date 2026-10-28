import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import {
  IconArrowsSort,
  IconBuildingSkyscraper,
  IconFilter,
  IconLink,
  IconUser,
  IconUsers,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { PreviewRecords } from './PreviewRecords';
import {
  PreviewDetail,
  PreviewSearch,
  PreviewTable,
  StyledPreviewAvatar,
  StyledPreviewBadge,
  StyledPreviewButton,
  StyledPreviewEmpty,
  StyledPreviewHeading,
  StyledPreviewSplit,
  StyledPreviewSummary,
  StyledPreviewToolbar,
  StyledPreviewViewGroup,
} from './PreviewPrimitives';

const StyledSections = styled.div`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: 5px;
  padding: 8px 16px;
`;
const StyledDomain = styled.span`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.secondary};
  font-size: 11px;
  padding: 2px 8px;
`;
const StyledCompanyMark = styled.span`
  align-items: center;
  background: ${themeCssVariables.accent.tertiary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: inline-flex;
  font-size: 9px;
  font-weight: 600;
  height: 20px;
  justify-content: center;
  width: 20px;
`;
const PreviewCompanies = () => {
  const { t, i18n } = useLingui();
  const [query, setQuery] = useState('');
  const [myAccounts, setMyAccounts] = useState(false);
  const [descending, setDescending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const companies = [
    {
      id: 'north',
      name: 'Studio North',
      mark: 'SN',
      domain: 'studio-north.example',
      city: 'Dijon',
      owner: 'ML',
      contact: t`Maya Laurent`,
      detail: t`Website project and ongoing support. Keep the brief, proposal and follow-up attached to the company.`,
    },
    {
      id: 'atelier',
      name: 'Atelier',
      mark: 'A',
      domain: 'atelier.example',
      city: 'Lyon',
      owner: 'JL',
      contact: t`Jonas Leroy`,
      detail: t`A team workspace project, from the first conversation to onboarding.`,
    },
    {
      id: 'collective',
      name: 'Local Collective',
      mark: 'LC',
      domain: 'local-collective.example',
      city: 'Paris',
      owner: 'AR',
      contact: t`Alex Rivera`,
      detail: t`A workshop bringing people together around a shared goal.`,
    },
    {
      id: 'common',
      name: 'Common Ground',
      mark: 'CG',
      domain: 'common-ground.example',
      city: 'Nantes',
      owner: 'ML',
      contact: t`Maya Laurent`,
      detail: t`Project planning and documentation for a growing team.`,
    },
    {
      id: 'ripple',
      name: 'Maison Ripple',
      mark: 'MR',
      domain: 'maison-ripple.example',
      city: 'Bordeaux',
      owner: 'JL',
      contact: t`Jonas Leroy`,
      detail: t`A shared home for client work and useful project references.`,
    },
    {
      id: 'olive',
      name: 'Olive Studio',
      mark: 'OS',
      domain: 'olive-studio.example',
      city: 'Lille',
      owner: 'AR',
      contact: t`Alex Rivera`,
      detail: t`Knowledge structure, project context and the next review.`,
    },
    {
      id: 'field',
      name: 'Open Field',
      mark: 'OF',
      domain: 'open-field.example',
      city: 'Strasbourg',
      owner: 'ML',
      contact: t`Maya Laurent`,
      detail: t`Team onboarding and a clear place for recurring meeting notes.`,
    },
    {
      id: 'paper',
      name: 'Paper & Co.',
      mark: 'P',
      domain: 'paper-and-co.example',
      city: 'Rennes',
      owner: 'JL',
      contact: t`Jonas Leroy`,
      detail: t`A new collaboration, with the people and their goals kept in context.`,
    },
  ];
  const locale = i18n.locale === 'pseudo-en' ? 'en' : i18n.locale;
  const visible = companies
    .filter(
      (company) =>
        (!myAccounts || company.owner === 'ML') &&
        `${company.name} ${company.domain} ${company.city} ${company.contact}`
          .toLocaleLowerCase(locale)
          .includes(query.trim().toLocaleLowerCase(locale)),
    )
    .sort(
      (left, right) =>
        (descending ? -1 : 1) * left.name.localeCompare(right.name, locale),
    );
  const selected = companies.find((company) => company.id === selectedId);
  return (
    <>
      <StyledPreviewHeading>
        <h3>{t`Companies`}</h3>
        <p>{t`The people, projects and conversations behind every relationship.`}</p>
      </StyledPreviewHeading>
      <StyledPreviewToolbar>
        <StyledPreviewViewGroup>
          <IconBuildingSkyscraper size={15} />
          <span>
            {t`All companies`} · {visible.length}
          </span>
        </StyledPreviewViewGroup>
        <div>
          <StyledPreviewButton
            type="button"
            aria-pressed={myAccounts}
            onClick={() => setMyAccounts(!myAccounts)}
          >
            <IconFilter size={14} />
            {t`My accounts`}
          </StyledPreviewButton>
          <StyledPreviewButton
            type="button"
            aria-label={t`Reverse company order`}
            aria-pressed={descending}
            onClick={() => setDescending(!descending)}
          >
            <IconArrowsSort size={14} />
          </StyledPreviewButton>
          <PreviewSearch value={query} onChange={setQuery} />
        </div>
      </StyledPreviewToolbar>
      <StyledPreviewSplit>
        <div>
          <PreviewTable
            label={t`Example companies`}
            columns={[t`Company`, t`Domain`, t`Account owner`, t`City`]}
            columnIcons={[
              IconBuildingSkyscraper,
              IconLink,
              IconUser,
              IconBuildingSkyscraper,
            ]}
          >
            {visible.map((company) => (
              <tr key={company.id}>
                <td>
                  <button
                    type="button"
                    onClick={() => setSelectedId(company.id)}
                  >
                    <StyledCompanyMark>{company.mark}</StyledCompanyMark>
                    {company.name}
                  </button>
                </td>
                <td>
                  <StyledDomain>{company.domain}</StyledDomain>
                </td>
                <td>
                  <span>
                    <StyledPreviewAvatar>{company.owner}</StyledPreviewAvatar>
                    {company.contact}
                  </span>
                </td>
                <td>{company.city}</td>
              </tr>
            ))}
          </PreviewTable>
          {visible.length === 0 && (
            <StyledPreviewEmpty role="status">{t`No example records match your search.`}</StyledPreviewEmpty>
          )}
          <StyledPreviewSummary>{t`${visible.length} example companies`}</StyledPreviewSummary>
        </div>
        {selected && (
          <PreviewDetail
            title={selected.name}
            Icon={IconBuildingSkyscraper}
            onClose={() => setSelectedId(null)}
          >
            <StyledPreviewBadge>{t`Company`}</StyledPreviewBadge>
            <dl>
              <dt>{t`Domain`}</dt>
              <dd>{selected.domain}</dd>
              <dt>{t`Account owner`}</dt>
              <dd>{selected.contact}</dd>
              <dt>{t`City`}</dt>
              <dd>{selected.city}</dd>
            </dl>
            <p>{selected.detail}</p>
          </PreviewDetail>
        )}
      </StyledPreviewSplit>
    </>
  );
};
export const PreviewCrm = () => {
  const { t } = useLingui();
  const [section, setSection] = useState('companies');
  return (
    <>
      <StyledSections aria-label={t`CRM example sections`}>
        <StyledPreviewButton
          type="button"
          aria-pressed={section === 'companies'}
          onClick={() => setSection('companies')}
        >
          <IconBuildingSkyscraper size={14} />
          {t`Companies`}
        </StyledPreviewButton>
        <StyledPreviewButton
          type="button"
          aria-pressed={section === 'opportunities'}
          onClick={() => setSection('opportunities')}
        >
          <IconUsers size={14} />
          {t`Opportunities`}
        </StyledPreviewButton>
      </StyledSections>
      <div hidden={section !== 'companies'}>
        <PreviewCompanies />
      </div>
      <div hidden={section !== 'opportunities'}>
        <PreviewRecords kind="crm" />
      </div>
    </>
  );
};
