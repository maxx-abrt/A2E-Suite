import { BureauSidebarAction } from '@/bureau/components/BureauSidebarAction';
import { BureauTreeItem } from '@/bureau/components/BureauTreeItem';
import { BUREAU_LANDING_TEMPLATE_CATEGORY } from '@/bureau/constants/BureauLandingTemplateCategory';
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
  IconTrash,
  IconUpload,
} from 'twenty-ui/icon';
import { LightIconButton } from 'twenty-ui/input';
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

const StyledHeadingRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const StyledTree = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
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
    openTrash,
    draggedPageId,
    setDraggedPageId,
    isLoading,
    error,
    resyncDocuments,
    permissions,
  } = useBureauWorkspace();
  const { openTemplateGallery } = useOpenTemplateGallery();
  const { openModal } = useModal();

  return (
    <StyledSection aria-label={t`Bureau pages`}>
      <BureauSidebarAction
        Icon={IconHome}
        label={t`Bureau`}
        testId="bureau-home"
        to={AppPath.Bureau}
        isActive={activeDocumentId === null}
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
      <StyledHeadingRow>
        <StyledHeading>{t`Pages`}</StyledHeading>
        {permissions.canUpdateObjectRecords && (
          <LightIconButton
            Icon={IconPlus}
            aria-label={t`New page`}
            size="small"
            onClick={() => {
              void actions.createPage();
            }}
          />
        )}
      </StyledHeadingRow>
      {isLoading && <span role="status">{t`Loading pages…`}</span>}
      {error ? (
        <BureauSidebarAction
          Icon={IconSearch}
          label={t`Could not load pages. Retry`}
          testId="bureau-retry-pages"
          onClick={resyncDocuments}
        />
      ) : null}
      <StyledTree role="tree" aria-label={t`Pages`}>
        {(tree.childrenByParentId.get(null) ?? []).map((page) => (
          <BureauTreeItem key={page.id} page={page} depth={0} section="pages" />
        ))}
      </StyledTree>
      {draggedPageId && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            event.preventDefault();
            void actions.movePage(draggedPageId, null, 'inside');
            setDraggedPageId(null);
          }}
        >
          <StyledHeading>{t`Move to top level`}</StyledHeading>
        </div>
      )}
      <BureauSidebarAction
        Icon={IconTrash}
        label={t`Trash`}
        testId="bureau-trash"
        onClick={openTrash}
      />
      {permissions.canUpdateObjectRecords && (
        <BureauSidebarAction
          Icon={IconUpload}
          label={t`Import from Notion`}
          testId="bureau-import"
          onClick={() => openModal(BUREAU_IMPORT_MODAL_ID)}
        />
      )}
    </StyledSection>
  );
};
