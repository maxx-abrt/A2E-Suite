import { BureauBulkActions } from '@/bureau/components/BureauBulkActions';
import { BureauTrashDropTarget } from '@/bureau/components/BureauTrashDropTarget';
import { BureauSidebarAction } from '@/bureau/components/BureauSidebarAction';
import { BureauTreeItem } from '@/bureau/components/BureauTreeItem';
import { BUREAU_LANDING_TEMPLATE_CATEGORY } from '@/bureau/constants/BureauLandingTemplateCategory';
import { HOME_DOCUMENT_TEMPLATE_KIND } from '@/home-dashboard/utils/selectRecentPages';
import { BUREAU_IMPORT_MODAL_ID } from '@/bureau/constants/BureauImportModalId';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { useIsNavigationDrawerContentExpanded } from '@/navigation/hooks/useIsNavigationDrawerContentExpanded';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useContext } from 'react';
import { AppPath } from 'twenty-shared/types';
import {
  IconHome,
  IconLayout,
  IconPlus,
  IconSearch,
  IconCheckbox,
  IconUpload,
} from 'twenty-ui/icon';
import { useLocation } from 'react-router-dom';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledSection = styled.section`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[1]};
`;

const StyledHeading = styled.h2`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: ${themeCssVariables.spacing[2]};
`;

const StyledTree = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledSavedTemplates = styled.details`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  > summary {
    border-radius: ${themeCssVariables.border.radius.sm};
    cursor: pointer;
    padding: ${themeCssVariables.spacing[2]};
    &:hover {
      background: ${themeCssVariables.background.transparent.light};
    }
    &:focus-visible {
      outline: 2px solid ${themeCssVariables.color.blue};
      outline-offset: -2px;
    }
  }
`;

// The drawer retains the workspace switcher, app navigation and mobile controls.
export const BureauNavigation = () => {
  const workspace = useContext(BureauWorkspaceContext);
  const isExpanded = useIsNavigationDrawerContentExpanded();

  return workspace && isExpanded ? <BureauNavigationContent /> : null;
};

const BureauNavigationContent = () => {
  const { t } = useLingui();
  const {
    actions,
    activeDocumentId,
    tree,
    favoriteDocuments,
    openSearch,
    startPageSelection,
    isSelectingPages,
    isBulkActionPending,
    moveDraggedPages,
    draggedPageId,
    setDraggedPageId,
    isLoading,
    error,
    resyncDocuments,
    permissions,
  } = useBureauWorkspace();
  const { openTemplateGallery } = useOpenTemplateGallery();
  const { openModal } = useModal();
  const { pathname } = useLocation();
  const rootPages = tree.childrenByParentId.get(null) ?? [];
  const savedTemplates = rootPages.filter(
    (page) => page.kind === HOME_DOCUMENT_TEMPLATE_KIND,
  );

  return (
    <StyledSection aria-label={t`Bureau pages`}>
      <BureauSidebarAction
        Icon={IconHome}
        label={t`Bureau`}
        testId="bureau-home"
        to={AppPath.Bureau}
        isActive={pathname === AppPath.Bureau && activeDocumentId === null}
      />
      {permissions.canUpdateObjectRecords && (
        <BureauSidebarAction
          Icon={IconPlus}
          label={t`New page`}
          testId="bureau-create-page"
          onClick={() => {
            void actions.createPage();
          }}
        />
      )}
      <BureauSidebarAction
        Icon={IconSearch}
        label={t`Search pages`}
        testId="bureau-search"
        onClick={openSearch}
      />
      <BureauSidebarAction
        Icon={IconLayout}
        label={t`Templates`}
        testId="bureau-templates"
        onClick={() =>
          openTemplateGallery({ category: BUREAU_LANDING_TEMPLATE_CATEGORY })
        }
      />
      {favoriteDocuments.length > 0 && (
        <>
          <StyledHeading>{t`Favorites`}</StyledHeading>
          <StyledTree role="tree" aria-label={t`Favorite pages`}>
            {favoriteDocuments.map((page) => (
              <BureauTreeItem
                key={page.id}
                page={page}
                depth={0}
                section="favorites"
              />
            ))}
          </StyledTree>
        </>
      )}
      <StyledHeading>{t`Pages`}</StyledHeading>
      {(permissions.canUpdateObjectRecords ||
        permissions.canSoftDeleteObjectRecords) &&
        !isSelectingPages && (
          <BureauSidebarAction
            Icon={IconCheckbox}
            label={t`Select pages`}
            testId="bureau-select-pages"
            onClick={startPageSelection}
          />
        )}
      <BureauBulkActions />
      {isLoading && <span role="status">{t`Loading pages…`}</span>}
      {error ? (
        <BureauSidebarAction
          Icon={IconSearch}
          label={t`Could not load pages. Retry`}
          testId="bureau-retry-pages"
          onClick={resyncDocuments}
        />
      ) : null}
      <StyledTree
        role="tree"
        aria-label={t`Pages`}
        aria-multiselectable={isSelectingPages}
      >
        {rootPages
          .filter((page) => page.kind !== HOME_DOCUMENT_TEMPLATE_KIND)
          .map((page) => (
            <BureauTreeItem
              key={page.id}
              page={page}
              depth={0}
              section="pages"
            />
          ))}
      </StyledTree>
      {savedTemplates.length > 0 && (
        <StyledSavedTemplates
          open={
            savedTemplates.some((page) => page.id === activeDocumentId) ||
            undefined
          }
        >
          <summary>{t`Saved templates`}</summary>
          <StyledTree
            role="tree"
            aria-label={t`Saved templates`}
            aria-multiselectable={isSelectingPages}
          >
            {savedTemplates.map((page) => (
              <BureauTreeItem
                key={page.id}
                page={page}
                depth={0}
                section="pages"
              />
            ))}
          </StyledTree>
        </StyledSavedTemplates>
      )}
      {draggedPageId &&
        permissions.canUpdateObjectRecords &&
        !isBulkActionPending &&
        !isLoading &&
        !error && (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              void moveDraggedPages(null, 'inside');
              setDraggedPageId(null);
            }}
          >
            <StyledHeading>{t`Move to top level`}</StyledHeading>
          </div>
        )}
      <BureauTrashDropTarget />
      {permissions.canUpdateObjectRecords && (
        <BureauSidebarAction
          Icon={IconUpload}
          label={t`Import`}
          testId="bureau-import"
          onClick={() => openModal(BUREAU_IMPORT_MODAL_ID)}
        />
      )}
    </StyledSection>
  );
};
