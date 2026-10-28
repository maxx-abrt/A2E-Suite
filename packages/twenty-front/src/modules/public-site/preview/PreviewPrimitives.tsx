import { styled } from '@linaria/react';
import { RECORD_TABLE_ROW_HEIGHT } from '@/object-record/record-table/constants/RecordTableRowHeight';
import { type ReactNode } from 'react';
import { useLingui } from '@lingui/react/macro';
import { IconSearch, IconX, type IconComponent } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const StyledPreviewButton = styled.button`
  align-items: center;
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 12px;
  gap: 6px;
  justify-content: center;
  min-height: 30px;
  padding: 5px 9px;
  white-space: nowrap;

  &:hover,
  &[aria-pressed='true'] {
    background: ${themeCssVariables.accent.tertiary};
    color: ${themeCssVariables.font.color.primary};
  }
`;
export const StyledPreviewToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: space-between;
  min-height: 48px;
  padding: 8px 16px;
  > div {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
`;
const StyledSearch = styled.label`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  gap: 6px;
  max-width: 100%;
  padding: 5px 8px;
  input {
    background: transparent;
    border: 0;
    color: ${themeCssVariables.font.color.primary};
    font: inherit;
    font-size: 12px;
    min-width: 0;
    outline: none;
    width: 128px;
    &::placeholder {
      color: ${themeCssVariables.font.color.tertiary};
      opacity: 1;
    }
  }
  &:focus-within {
    outline: 2px solid ${themeCssVariables.font.color.primary};
    outline-offset: 2px;
  }
`;
type PreviewSearchProps = { value: string; onChange: (value: string) => void };

export const PreviewSearch = ({ value, onChange }: PreviewSearchProps) => {
  const { t } = useLingui();
  return (
    <StyledSearch>
      <IconSearch size={14} aria-hidden />
      <input
        aria-label={t`Search example records`}
        placeholder={t`Search records…`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </StyledSearch>
  );
};
export const StyledPreviewBadge = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  display: inline-flex;
  font-size: 11px;
  gap: 5px;
  padding: 3px 7px;
  white-space: nowrap;
  &::before {
    background: ${themeCssVariables.color.blue};
    border-radius: 50%;
    corner-shape: round;
    content: '';
    height: 5px;
    width: 5px;
  }
  &[data-tone='green']::before {
    background: ${themeCssVariables.color.green};
  }
  &[data-tone='orange']::before {
    background: ${themeCssVariables.color.orange};
  }
  &[data-tone='rose']::before {
    background: ${themeCssVariables.color.pink};
  }
`;
export const StyledPreviewAvatar = styled.span`
  align-items: center;
  background: ${themeCssVariables.accent.tertiary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: 50%;
  color: ${themeCssVariables.font.color.primary};
  corner-shape: round;
  display: inline-flex;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  height: 24px;
  justify-content: center;
  width: 24px;
`;
const StyledTableScroll = styled.div`
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
  table {
    border-collapse: collapse;
    font-size: 12px;
    text-align: left;
    white-space: nowrap;
    width: 100%;
  }
  th {
    background: ${themeCssVariables.background.secondary};
    color: ${themeCssVariables.font.color.tertiary};
    font-size: 11px;
    font-weight: 500;
  }
  td,
  th {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    border-right: 1px solid ${themeCssVariables.border.color.light};
    height: ${RECORD_TABLE_ROW_HEIGHT}px;
    padding: 4px 12px;
  }
  td:last-child,
  th:last-child {
    border-right: 0;
  }
  th > span {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }
  tbody tr:hover {
    background: ${themeCssVariables.background.secondary};
  }
  td > span {
    vertical-align: middle;
    align-items: center;
    display: inline-flex;
    gap: 7px;
  }
  td:first-child {
    padding-left: 16px;
  }
  button {
    align-items: center;
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    gap: 7px;
    padding: 0;
    text-align: left;
  }
  button:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  input {
    accent-color: ${themeCssVariables.font.color.primary};
    cursor: pointer;
  }
`;
type PreviewTableProps = {
  label: string;
  columns: string[];
  columnIcons?: IconComponent[];
  children: ReactNode;
};

export const PreviewTable = ({
  label,
  columns,
  columnIcons,
  children,
}: PreviewTableProps) => (
  <StyledTableScroll tabIndex={0} role="region" aria-label={label}>
    <table aria-label={label}>
      <thead>
        <tr>
          {columns.map((column, index) => {
            const ColumnIcon = columnIcons?.[index];
            return (
              <th key={column} scope="col">
                <span>
                  {ColumnIcon && <ColumnIcon size={13} aria-hidden />}
                  {column}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </StyledTableScroll>
);
export const StyledPreviewEmpty = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: 12px;
  padding: 24px;
`;
export const StyledPreviewSummary = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: 11px;
  padding: 12px 16px;
`;
const StyledDetail = styled.aside`
  background: ${themeCssVariables.background.secondary};
  border-left: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  flex: 0 0 250px;
  min-width: 0;
  padding: 20px;
  header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  h4 {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.03em;
    margin: 16px 0;
  }
  p {
    color: ${themeCssVariables.font.color.secondary};
    font-size: 12px;
    line-height: 1.7;
  }
  dl {
    display: grid;
    font-size: 12px;
    gap: 12px;
    margin: 24px 0;
  }
  dt {
    color: ${themeCssVariables.font.color.tertiary};
  }
  dd {
    margin: -6px 0 0;
    overflow-wrap: anywhere;
  }
  @media (max-width: 1000px) {
    border-left: 0;
    border-top: 1px solid ${themeCssVariables.border.color.light};
    flex-basis: auto;
  }
`;
type PreviewDetailProps = {
  title: string;
  Icon: IconComponent;
  children: ReactNode;
  onClose: () => void;
};

export const PreviewDetail = ({
  title,
  Icon,
  children,
  onClose,
}: PreviewDetailProps) => {
  const { t } = useLingui();
  return (
    <StyledDetail aria-label={t`Example record details`}>
      <header>
        <Icon size={20} aria-hidden />
        <StyledPreviewButton
          type="button"
          aria-label={t`Close details`}
          onClick={onClose}
        >
          <IconX size={14} />
        </StyledPreviewButton>
      </header>
      <h4>{title}</h4>
      {children}
    </StyledDetail>
  );
};
export const StyledPreviewSplit = styled.div`
  align-items: stretch;
  display: flex;
  min-height: 420px;
  > div:first-child {
    flex: 1;
    min-width: 0;
  }
  @media (max-width: 1000px) {
    flex-direction: column;
  }
`;
export const StyledPreviewViewGroup = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;
export const StyledPreviewHeading = styled.div`
  padding: 18px 20px 16px;
  h3 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.04em;
    margin: 0 0 8px;
  }
  p {
    color: ${themeCssVariables.font.color.secondary};
    font-size: 12px;
    line-height: 1.7;
    margin: 0;
  }
`;
