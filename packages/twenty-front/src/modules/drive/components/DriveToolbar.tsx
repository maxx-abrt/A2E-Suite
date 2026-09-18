import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  IconFolderPlus,
  IconLayoutGrid,
  IconLayoutList,
  IconSearch,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { DRIVE_FILTER_ALL, DRIVE_SOURCE_APP_UNKNOWN } from '@/drive/constants';
import {
  type DriveFileFilters,
  type DriveViewMode,
} from '@/drive/types/DriveRecord';

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledSearchInput = styled.input`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 140px;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledSearchWrapper = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 1;
  gap: ${themeCssVariables.spacing[1]};
  max-width: 320px;
  min-width: 140px;
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledToggleGroup = styled.div`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  padding: 2px;
`;

const StyledToggleButton = styled.button<{ isSelected: boolean }>`
  align-items: center;
  background: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.medium
      : 'transparent'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  padding: 4px;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledActionButton = styled.button`
  align-items: center;
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledCheckboxLabel = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
`;

export type DriveToolbarProps = {
  viewMode: DriveViewMode;
  onChangeViewMode: (viewMode: DriveViewMode) => void;
  filters: DriveFileFilters;
  onChangeFilters: (filters: DriveFileFilters) => void;
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (value: boolean) => void;
  onCreateFolder: () => void;
};

export const DriveToolbar = ({
  viewMode,
  onChangeViewMode,
  filters,
  onChangeFilters,
  includeSubfolders,
  onToggleIncludeSubfolders,
  onCreateFolder,
}: DriveToolbarProps) => {
  const { t } = useLingui();

  const updateFilter = (partial: Partial<DriveFileFilters>) =>
    onChangeFilters({ ...filters, ...partial });

  return (
    <StyledToolbar data-testid="drive-toolbar">
      <StyledSearchWrapper>
        <IconSearch size={16} />
        <StyledSearchInput
          type="search"
          value={filters.search}
          placeholder={t`Search files`}
          aria-label={t`Search files`}
          data-testid="drive-search-input"
          onChange={(event) => updateFilter({ search: event.target.value })}
        />
      </StyledSearchWrapper>

      <StyledSelect
        value={filters.fileCategory}
        aria-label={t`Filter by type`}
        data-testid="drive-filter-type"
        onChange={(event) => updateFilter({ fileCategory: event.target.value })}
      >
        <option value={DRIVE_FILTER_ALL}>{t`All types`}</option>
        <option value="TEXT_DOCUMENT">{t`Documents`}</option>
        <option value="SPREADSHEET">{t`Spreadsheets`}</option>
        <option value="PRESENTATION">{t`Presentations`}</option>
        <option value="IMAGE">{t`Images`}</option>
        <option value="VIDEO">{t`Videos`}</option>
        <option value="AUDIO">{t`Audio`}</option>
        <option value="ARCHIVE">{t`Archives`}</option>
        <option value="OTHER">{t`Other`}</option>
      </StyledSelect>

      <StyledSelect
        value={filters.sourceApp}
        aria-label={t`Filter by source app`}
        data-testid="drive-filter-source-app"
        onChange={(event) => updateFilter({ sourceApp: event.target.value })}
      >
        <option value={DRIVE_FILTER_ALL}>{t`All sources`}</option>
        <option value="crm">{t`CRM`}</option>
        <option value="documents">{t`Documents`}</option>
        <option value="chat">{t`Chat`}</option>
        <option value="drive">{t`Drive`}</option>
        <option value={DRIVE_SOURCE_APP_UNKNOWN}>{t`Unknown`}</option>
      </StyledSelect>

      <StyledSelect
        value={filters.targetObject}
        aria-label={t`Filter by record object`}
        data-testid="drive-filter-target-object"
        onChange={(event) => updateFilter({ targetObject: event.target.value })}
      >
        <option value={DRIVE_FILTER_ALL}>{t`All records`}</option>
        <option value="task">{t`Tasks`}</option>
        <option value="note">{t`Notes`}</option>
        <option value="person">{t`People`}</option>
        <option value="company">{t`Companies`}</option>
        <option value="opportunity">{t`Opportunities`}</option>
        <option value="dashboard">{t`Dashboards`}</option>
        <option value="workflow">{t`Workflows`}</option>
      </StyledSelect>

      <StyledCheckboxLabel>
        <input
          type="checkbox"
          checked={includeSubfolders}
          data-testid="drive-include-subfolders"
          onChange={(event) => onToggleIncludeSubfolders(event.target.checked)}
        />
        {t`Include subfolders`}
      </StyledCheckboxLabel>

      <StyledToggleGroup role="group" aria-label={t`View mode`}>
        <StyledToggleButton
          type="button"
          isSelected={viewMode === 'list'}
          aria-pressed={viewMode === 'list'}
          aria-label={t`List view`}
          data-testid="drive-view-list"
          onClick={() => onChangeViewMode('list')}
        >
          <IconLayoutList size={16} />
        </StyledToggleButton>
        <StyledToggleButton
          type="button"
          isSelected={viewMode === 'gallery'}
          aria-pressed={viewMode === 'gallery'}
          aria-label={t`Gallery view`}
          data-testid="drive-view-gallery"
          onClick={() => onChangeViewMode('gallery')}
        >
          <IconLayoutGrid size={16} />
        </StyledToggleButton>
      </StyledToggleGroup>

      <StyledActionButton
        type="button"
        data-testid="drive-create-folder"
        onClick={onCreateFolder}
      >
        <IconFolderPlus size={16} />
        {t`New folder`}
      </StyledActionButton>
    </StyledToolbar>
  );
};
