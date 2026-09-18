import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { IconChevronDown, IconChevronRight, IconFolder } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type DriveFolderNode } from '@/drive/types/DriveRecord';

const StyledTree = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledTreeNested = styled(StyledTree)`
  margin-left: ${themeCssVariables.spacing[3]};
`;

const StyledRow = styled.li`
  align-items: center;
  display: flex;
  gap: 2px;
`;

const StyledToggle = styled.button`
  background: transparent;
  border: none;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  padding: 2px;

  &:hover {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledToggleSpacer = styled.span`
  display: inline-block;
  width: 20px;
`;

const StyledFolderButton = styled.button<{ isSelected: boolean }>`
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
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-align: left;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledFolderName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  padding: ${themeCssVariables.spacing[2]};
`;

export type DriveFolderTreeProps = {
  nodes: DriveFolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
};

const DriveFolderTreeItem = ({
  node,
  selectedFolderId,
  onSelectFolder,
}: {
  node: DriveFolderNode;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <StyledRow data-testid={`drive-folder-node-${node.id}`}>
      {hasChildren ? (
        <StyledToggle
          type="button"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={isExpanded}
          data-testid={`drive-folder-toggle-${node.id}`}
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? (
            <IconChevronDown size={14} />
          ) : (
            <IconChevronRight size={14} />
          )}
        </StyledToggle>
      ) : (
        <StyledToggleSpacer />
      )}
      <StyledFolderButton
        type="button"
        isSelected={node.id === selectedFolderId}
        aria-current={node.id === selectedFolderId}
        data-testid={`drive-folder-item-${node.id}`}
        onClick={() => onSelectFolder(node.id)}
      >
        <IconFolder size={16} />
        <StyledFolderName>{node.name}</StyledFolderName>
      </StyledFolderButton>
      {hasChildren && isExpanded && (
        <StyledTreeNested>
          {node.children.map((child) => (
            <DriveFolderTreeItem
              key={child.id}
              node={child}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </StyledTreeNested>
      )}
    </StyledRow>
  );
};

export const DriveFolderTree = ({
  nodes,
  selectedFolderId,
  onSelectFolder,
}: DriveFolderTreeProps) => {
  const { t } = useLingui();

  if (nodes.length === 0) {
    return (
      <StyledEmptyState data-testid="drive-folder-tree-empty">
        {t`No folders yet`}
      </StyledEmptyState>
    );
  }

  return (
    <StyledTree data-testid="drive-folder-tree">
      {nodes.map((node) => (
        <DriveFolderTreeItem
          key={node.id}
          node={node}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
        />
      ))}
    </StyledTree>
  );
};
