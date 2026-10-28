import { useRef, useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import {
  IconArrowsSort,
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconCircleDot,
  IconCurrencyEuro,
  IconUser,
  IconCheckbox,
  IconFileText,
  IconFilter,
  IconFolder,
  IconLayoutKanban,
  IconTable,
  IconUsers,
} from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import {
  StyledPreviewAvatar,
  StyledPreviewBadge,
  StyledPreviewButton,
  PreviewDetail,
  StyledPreviewEmpty,
  StyledPreviewHeading,
  PreviewSearch,
  StyledPreviewSplit,
  StyledPreviewSummary,
  PreviewTable,
  StyledPreviewToolbar,
  StyledPreviewViewGroup,
} from './PreviewPrimitives';

type PreviewRecord = {
  id: string;
  name: string;
  status: string;
  tone: string;
  owner: string;
  date: string;
  amount: number;
  detail: string;
  company?: string;
};
type PreviewRecordsProps = { kind: 'projects' | 'bilan' | 'archive' | 'crm' };
const StyledBoard = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  overflow-x: auto;
  padding: 16px;
  section {
    background: ${themeCssVariables.background.secondary};
    border-radius: ${themeCssVariables.border.radius.md};
    min-height: 270px;
    padding: 10px;
  }
  h4 {
    align-items: center;
    display: flex;
    font-size: 11px;
    font-weight: 500;
    justify-content: space-between;
    margin: 0 0 14px;
  }
  button {
    background: ${themeCssVariables.background.primary};
    border: 1px solid ${themeCssVariables.border.color.light};
    border-radius: ${themeCssVariables.border.radius.sm};
    color: inherit;
    cursor: pointer;
    display: grid;
    font: inherit;
    font-size: 12px;
    gap: 16px;
    margin-bottom: 8px;
    padding: 12px;
    text-align: left;
    width: 100%;
  }
  button:hover {
    border-color: ${themeCssVariables.border.color.strong};
  }
  small {
    align-items: center;
    color: ${themeCssVariables.font.color.tertiary};
    display: flex;
    gap: 6px;
    justify-content: space-between;
  }
`;
const StyledMetrics = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 0 24px 22px;
  > div {
    border: 1px solid ${themeCssVariables.border.color.light};
    border-radius: ${themeCssVariables.border.radius.md};
    padding: 12px;
  }
  span {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
    font-size: 11px;
  }
  strong {
    display: block;
    font-size: clamp(14px, 2vw, 21px);
    font-weight: 600;
    letter-spacing: -0.04em;
    margin-top: 7px;
    overflow-wrap: anywhere;
  }
`;

export const PreviewRecords = ({ kind }: PreviewRecordsProps) => {
  const { t, i18n } = useLingui();
  const recordSurfaceRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState(false);
  const [descending, setDescending] = useState(false);
  const [completedTasks, setCompletedTasks] = useState(['brief']);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [financeView, setFinanceView] = useState('invoices');
  const [folderOpen, setFolderOpen] = useState(false);
  const locale = i18n.locale === 'pseudo-en' ? 'en' : i18n.locale;
  const currency = (amount: number) =>
    new Intl.NumberFormat(i18n.locale === 'pseudo-en' ? 'en' : i18n.locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  const records: PreviewRecord[] =
    kind === 'projects'
      ? [
          {
            id: 'brief',
            name: t`Write the project brief`,
            status: t`Done`,
            tone: 'green',
            owner: 'ML',
            date: t`Oct 26`,
            amount: 0,
            detail: t`A clear goal, a shared outline and a home for the decisions that matter.`,
          },
          {
            id: 'ideas',
            name: t`Gather the first ideas`,
            status: t`In progress`,
            tone: 'orange',
            owner: 'JL',
            date: t`Oct 28`,
            amount: 0,
            detail: t`Collect references and useful links in Ideas & inspiration before the next review.`,
          },
          {
            id: 'review',
            name: t`Plan the next review`,
            status: t`To do`,
            tone: 'blue',
            owner: 'AR',
            date: t`Oct 30`,
            amount: 0,
            detail: t`Bring the team together to review the handbook and agree on the next steps.`,
          },
          {
            id: 'onboard',
            name: t`Prepare the welcome page`,
            status: t`To do`,
            tone: 'blue',
            owner: 'ML',
            date: t`Nov 2`,
            amount: 0,
            detail: t`Make the first day easier with a welcome page and links to the team's everyday tools.`,
          },
          {
            id: 'share',
            name: t`Share the team handbook`,
            status: t`In progress`,
            tone: 'orange',
            owner: 'JL',
            date: t`Nov 4`,
            amount: 0,
            detail: t`Check the page structure with the team before sharing the final handbook.`,
          },
        ]
      : kind === 'bilan'
        ? financeView === 'invoices'
          ? [
              {
                id: 'INV-026',
                name: t`Website project`,
                company: 'Studio North',
                status: t`Sent`,
                tone: 'orange',
                owner: 'ML',
                date: t`Oct 30`,
                amount: 2400,
                detail: t`Design and development · 2 milestones. Example invoice linked to the client project.`,
              },
              {
                id: 'INV-025',
                name: t`Team workshop`,
                company: 'Local Collective',
                status: t`Paid`,
                tone: 'green',
                owner: 'AR',
                date: t`Oct 24`,
                amount: 850,
                detail: t`Workshop preparation and facilitation. Example payment recorded against the invoice.`,
              },
              {
                id: 'INV-024',
                name: t`Workspace setup`,
                company: 'Atelier',
                status: t`Draft`,
                tone: 'blue',
                owner: 'JL',
                date: t`Nov 5`,
                amount: 1200,
                detail: t`Knowledge structure and team onboarding. A draft stays editable until it is ready to send.`,
              },
              {
                id: 'INV-023',
                name: t`Project follow-up`,
                company: 'Studio North',
                status: t`Paid`,
                tone: 'green',
                owner: 'ML',
                date: t`Oct 20`,
                amount: 600,
                detail: t`Monthly project follow-up and documentation. Example paid invoice.`,
              },
            ]
          : [
              {
                id: 'QUO-012',
                name: t`Project quote`,
                company: 'Atelier',
                status: t`Draft`,
                tone: 'blue',
                owner: 'JL',
                date: t`Nov 7`,
                amount: 3200,
                detail: t`A draft quote for the next project, with the client and scope kept together.`,
              },
              {
                id: 'QUO-011',
                name: t`Team workshop`,
                company: 'Local Collective',
                status: t`Sent`,
                tone: 'orange',
                owner: 'AR',
                date: t`Nov 10`,
                amount: 950,
                detail: t`A sample quote awaiting the client's reply.`,
              },
            ]
        : kind === 'archive'
          ? [
              ...(!folderOpen
                ? [
                    {
                      id: 'folder',
                      name: t`Project documents`,
                      status: t`Folder`,
                      tone: 'orange',
                      owner: 'ML',
                      date: t`Oct 28`,
                      amount: 0,
                      detail: t`The project brief, handbook and visual references, collected in one place.`,
                    },
                  ]
                : []),
              {
                id: 'handbook',
                name: t`Team handbook.pdf`,
                status: 'PDF',
                tone: 'rose',
                owner: 'ML',
                date: t`Oct 28`,
                amount: 240,
                detail: t`Welcome to A2E Studio. Our shared handbook brings the team's ways of working, project context and meeting notes together.`,
              },
              {
                id: 'sketch',
                name: t`Project sketch.png`,
                status: 'PNG',
                tone: 'green',
                owner: 'JL',
                date: t`Oct 27`,
                amount: 860,
                detail: t`Visual research for the next chapter. A sample file with its type, size and owner shown in context.`,
              },
              {
                id: 'notes',
                name: t`Workshop notes.md`,
                status: 'MD',
                tone: 'blue',
                owner: 'AR',
                date: t`Oct 26`,
                amount: 12,
                detail: t`Workshop notes: agree on the goal, collect the first ideas and plan a useful review.`,
              },
            ]
          : [
              {
                id: 'north',
                name: t`Website project`,
                company: 'Studio North',
                status: t`New`,
                tone: 'blue',
                owner: 'ML',
                date: t`Oct 30`,
                amount: 4800,
                detail: t`A new website project. Keep meeting notes, the project brief and the next conversation attached to the opportunity.`,
              },
              {
                id: 'atelier',
                name: t`Team workspace`,
                company: 'Atelier',
                status: t`Proposal`,
                tone: 'green',
                owner: 'JL',
                date: t`Nov 4`,
                amount: 3200,
                detail: t`A shared workspace for the team. The proposal covers onboarding, knowledge structure and project setup.`,
              },
              {
                id: 'collective',
                name: t`Workshop`,
                company: 'Local Collective',
                status: t`Meeting`,
                tone: 'orange',
                owner: 'AR',
                date: t`Oct 29`,
                amount: 950,
                detail: t`A first conversation about a practical workshop, with the team and their goals in view.`,
              },
              {
                id: 'north-care',
                name: t`Ongoing support`,
                company: 'Studio North',
                status: t`Proposal`,
                tone: 'green',
                owner: 'ML',
                date: t`Nov 6`,
                amount: 1800,
                detail: t`A follow-up proposal for project documentation and ongoing support.`,
              },
            ];
  const displayRecords = records.map((record) =>
    kind === 'projects'
      ? {
          ...record,
          status: completedTasks.includes(record.id)
            ? t`Done`
            : record.status === t`Done`
              ? t`To do`
              : record.status,
          tone: completedTasks.includes(record.id)
            ? 'green'
            : record.status === t`Done`
              ? 'blue'
              : record.tone,
        }
      : record,
  );
  const visibleRecords = displayRecords
    .filter(
      (record) =>
        `${record.id} ${record.name} ${record.company ?? ''} ${record.status}`
          .toLocaleLowerCase(locale)
          .includes(query.trim().toLocaleLowerCase(locale)) &&
        (!filtered ||
          (kind === 'projects'
            ? record.status !== t`Done`
            : kind === 'bilan'
              ? financeView === 'invoices'
                ? record.status !== t`Paid`
                : record.status === t`Sent`
              : kind === 'crm'
                ? record.status === t`Proposal`
                : record.status === 'PDF')),
    )
    .sort(
      (left, right) =>
        (descending ? -1 : 1) * left.name.localeCompare(right.name, locale),
    );
  const selected = displayRecords.find((record) => record.id === selectedId);
  const Icon =
    kind === 'bilan'
      ? IconFileText
      : kind === 'archive'
        ? IconFolder
        : kind === 'crm'
          ? IconUsers
          : IconCheckbox;
  const title =
    kind === 'projects'
      ? t`Team handbook`
      : kind === 'bilan'
        ? t`Sales documents`
        : kind === 'archive'
          ? t`Files & folders`
          : t`Opportunities`;
  const stages =
    kind === 'projects'
      ? [t`To do`, t`In progress`, t`Done`]
      : [t`New`, t`Meeting`, t`Proposal`];
  const columns =
    kind === 'projects'
      ? [t`Task`, t`Status`, t`Assignee`, t`Due date`]
      : kind === 'archive'
        ? [t`Name`, t`Type`, t`Owner`, t`Size`]
        : [
            kind === 'bilan' ? t`Document` : t`Opportunity`,
            t`Company`,
            t`Status`,
            t`Amount`,
          ];
  const openRecord = (record: PreviewRecord) => {
    if (record.id === 'folder') setFolderOpen(true);
    else setSelectedId(record.id);
  };
  return (
    <>
      <StyledPreviewHeading>
        <h3>{title}</h3>
        <p>
          {kind === 'projects'
            ? t`A shared project, from the first idea to the next review.`
            : kind === 'bilan'
              ? t`Quotes, invoices and payments, connected to your client work.`
              : kind === 'archive'
                ? t`The files behind your projects, with their context close by.`
                : t`Client work, with the people and the next step in view.`}
        </p>
      </StyledPreviewHeading>
      {kind === 'bilan' && (
        <StyledMetrics aria-label={t`Example document totals`}>
          <div>
            <span>{t`Total`}</span>
            <strong>
              {currency(
                records.reduce((sum, record) => sum + record.amount, 0),
              )}
            </strong>
          </div>
          <div>
            <span>
              {financeView === 'invoices'
                ? t`Awaiting payment`
                : t`Awaiting reply`}
            </span>
            <strong>
              {currency(
                records
                  .filter((record) => record.status === t`Sent`)
                  .reduce((sum, record) => sum + record.amount, 0),
              )}
            </strong>
          </div>
          <div>
            <span>{t`Paid`}</span>
            <strong>
              {currency(
                records
                  .filter((record) => record.status === t`Paid`)
                  .reduce((sum, record) => sum + record.amount, 0),
              )}
            </strong>
          </div>
        </StyledMetrics>
      )}
      <StyledPreviewToolbar>
        <StyledPreviewViewGroup aria-label={t`Example views`}>
          {kind === 'bilan' ? (
            <>
              {['invoices', 'quotes'].map((id) => (
                <StyledPreviewButton
                  key={id}
                  type="button"
                  aria-pressed={financeView === id}
                  onClick={() => {
                    setFinanceView(id);
                    setSelectedId(null);
                    setFiltered(false);
                    setQuery('');
                  }}
                >
                  <IconFileText size={14} />
                  {id === 'invoices' ? t`Invoices` : t`Quotes`}
                </StyledPreviewButton>
              ))}
            </>
          ) : (
            <>
              <StyledPreviewButton
                type="button"
                aria-pressed={view === 'table'}
                onClick={() => setView('table')}
              >
                <IconTable size={14} />
                {t`Table`}
              </StyledPreviewButton>
              {(kind === 'projects' || kind === 'crm') && (
                <StyledPreviewButton
                  type="button"
                  aria-pressed={view === 'board'}
                  onClick={() => setView('board')}
                >
                  <IconLayoutKanban size={14} />
                  {t`Board`}
                </StyledPreviewButton>
              )}
              {kind === 'archive' && folderOpen && (
                <StyledPreviewButton
                  type="button"
                  onClick={() => {
                    setFolderOpen(false);
                    setSelectedId(null);
                  }}
                >{t`All files`}</StyledPreviewButton>
              )}
            </>
          )}
        </StyledPreviewViewGroup>
        <div>
          <StyledPreviewButton
            type="button"
            aria-pressed={filtered}
            onClick={() => setFiltered(!filtered)}
          >
            <IconFilter size={14} />
            {kind === 'projects'
              ? t`Incomplete`
              : kind === 'bilan'
                ? financeView === 'invoices'
                  ? t`Unpaid`
                  : t`Awaiting reply`
                : kind === 'crm'
                  ? t`Proposals`
                  : t`PDF only`}
          </StyledPreviewButton>
          <StyledPreviewButton
            type="button"
            aria-label={t`Reverse record order`}
            aria-pressed={descending}
            onClick={() => setDescending(!descending)}
          >
            <IconArrowsSort size={14} />
          </StyledPreviewButton>
          <PreviewSearch value={query} onChange={setQuery} />
        </div>
      </StyledPreviewToolbar>
      <StyledPreviewSplit ref={recordSurfaceRef} tabIndex={-1}>
        <div>
          {view === 'board' && (kind === 'projects' || kind === 'crm') ? (
            <StyledBoard aria-label={t`Example board`}>
              {stages.map((stage) => (
                <section key={stage} aria-label={stage}>
                  <h4>
                    <StyledPreviewBadge>{stage}</StyledPreviewBadge>
                    <span>
                      {
                        visibleRecords.filter(
                          (record) => record.status === stage,
                        ).length
                      }
                    </span>
                  </h4>
                  {visibleRecords
                    .filter((record) => record.status === stage)
                    .map((record) => (
                      <button
                        type="button"
                        key={record.id}
                        data-preview-record-id={record.id}
                        onClick={() => openRecord(record)}
                      >
                        {record.name}
                        <small>
                          {record.company ?? record.date}
                          <StyledPreviewAvatar>
                            {record.owner}
                          </StyledPreviewAvatar>
                        </small>
                      </button>
                    ))}
                </section>
              ))}
            </StyledBoard>
          ) : (
            <PreviewTable
              label={title}
              columns={columns}
              columnIcons={
                kind === 'projects'
                  ? [IconFileText, IconCircleDot, IconUser, IconCalendarEvent]
                  : kind === 'crm' || kind === 'bilan'
                    ? [
                        IconFileText,
                        IconBuildingSkyscraper,
                        IconCircleDot,
                        IconCurrencyEuro,
                      ]
                    : undefined
              }
            >
              {visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <span>
                      {kind === 'projects' && (
                        <Checkbox
                          aria-label={record.name}
                          checked={completedTasks.includes(record.id)}
                          onCheckedChange={() =>
                            setCompletedTasks((previous) =>
                              previous.includes(record.id)
                                ? previous.filter((id) => id !== record.id)
                                : [...previous, record.id],
                            )
                          }
                        />
                      )}
                      <button
                        type="button"
                        data-preview-record-id={record.id}
                        onClick={() => openRecord(record)}
                      >
                        {kind !== 'projects' &&
                          (record.id === 'folder' ? (
                            <IconFolder size={15} />
                          ) : (
                            <Icon size={15} />
                          ))}
                        {kind === 'bilan' ? record.id : record.name}
                      </button>
                    </span>
                  </td>
                  {kind === 'projects' ? (
                    <>
                      <td>
                        <StyledPreviewBadge data-tone={record.tone}>
                          {record.status}
                        </StyledPreviewBadge>
                      </td>
                      <td>
                        <StyledPreviewAvatar>
                          {record.owner}
                        </StyledPreviewAvatar>
                      </td>
                      <td>{record.date}</td>
                    </>
                  ) : kind === 'archive' ? (
                    <>
                      <td>
                        <StyledPreviewBadge data-tone={record.tone}>
                          {record.status}
                        </StyledPreviewBadge>
                      </td>
                      <td>
                        <StyledPreviewAvatar>
                          {record.owner}
                        </StyledPreviewAvatar>
                      </td>
                      <td>{record.amount ? t`${record.amount} KB` : '—'}</td>
                    </>
                  ) : (
                    <>
                      <td>{record.company}</td>
                      <td>
                        <StyledPreviewBadge data-tone={record.tone}>
                          {record.status}
                        </StyledPreviewBadge>
                      </td>
                      <td>{currency(record.amount)}</td>
                    </>
                  )}
                </tr>
              ))}
            </PreviewTable>
          )}
          {visibleRecords.length === 0 && (
            <StyledPreviewEmpty role="status">{t`No example records match your search.`}</StyledPreviewEmpty>
          )}
          <StyledPreviewSummary aria-live="polite">
            {kind === 'projects'
              ? t`${completedTasks.length} of 5 steps complete`
              : t`${visibleRecords.length} example records`}
          </StyledPreviewSummary>
        </div>
        {selected && (
          <PreviewDetail
            title={selected.name}
            Icon={Icon}
            onClose={() => {
              setSelectedId(null);
              const opener =
                recordSurfaceRef.current?.querySelector<HTMLButtonElement>(
                  `[data-preview-record-id="${selected.id}"]`,
                );
              (opener ?? recordSurfaceRef.current)?.focus();
            }}
          >
            <StyledPreviewBadge data-tone={selected.tone}>
              {selected.status}
            </StyledPreviewBadge>
            <dl>
              <dt>{t`Reference`}</dt>
              <dd>{kind === 'bilan' ? selected.id : title}</dd>
              <dt>
                {kind === 'bilan' || kind === 'crm' ? t`Company` : t`Owner`}
              </dt>
              <dd>{selected.company ?? selected.owner}</dd>
              <dt>
                {kind === 'bilan' || kind === 'crm' ? t`Amount` : t`Date`}
              </dt>
              <dd>
                {kind === 'bilan' || kind === 'crm'
                  ? currency(selected.amount)
                  : selected.date}
              </dd>
            </dl>
            <p>{selected.detail}</p>
            {kind === 'projects' && (
              <StyledPreviewButton
                type="button"
                onClick={() =>
                  setCompletedTasks((previous) =>
                    previous.includes(selected.id)
                      ? previous.filter((id) => id !== selected.id)
                      : [...previous, selected.id],
                  )
                }
              >
                <IconCheckbox size={14} />
                {completedTasks.includes(selected.id)
                  ? t`Mark incomplete`
                  : t`Complete task`}
              </StyledPreviewButton>
            )}
            {kind === 'archive' && selected.id === 'handbook' && (
              <>
                <h4>{t`In this document`}</h4>
                <p>{t`Welcome · Our ways of working · Projects · Meeting notes`}</p>
              </>
            )}
          </PreviewDetail>
        )}
      </StyledPreviewSplit>
    </>
  );
};
