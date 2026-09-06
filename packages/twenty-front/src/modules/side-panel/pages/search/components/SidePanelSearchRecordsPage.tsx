import { useCloseCommandMenu } from '@/command-menu-item/hooks/useCloseCommandMenu';
import { CommandMenuItem } from '@/command-menu/components/CommandMenuItem';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { SidePanelList } from '@/side-panel/components/SidePanelList';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { SidePanelSearchRecordPreviewCard } from '@/side-panel/pages/search/components/SidePanelSearchRecordPreviewCard';
import { SIDE_PANEL_SEARCH_RECORD_PREVIEW_WIDTH } from '@/side-panel/pages/search/constants/SidePanelSearchRecordPreviewWidth';
import { useAppSearchResultItems } from '@/side-panel/pages/search/hooks/useAppSearchResultItems';
import { useRecordSearchObjectUsage } from '@/side-panel/pages/search/hooks/useRecordSearchObjectUsage';
import { useSidePanelSearchRecordPreviewItem } from '@/side-panel/pages/search/hooks/useSidePanelSearchRecordPreviewItem';
import { useSidePanelSearchRecords } from '@/side-panel/pages/search/hooks/useSidePanelSearchRecords';
import { searchRecordsFrecencyByObjectState } from '@/side-panel/pages/search/states/searchRecordsFrecencyByObjectState';
import { computeSearchRecordObjectFrecencyRank } from '@/side-panel/pages/search/utils/computeSearchRecordObjectFrecencyRank';
import { getSidePanelSearchResultAnchorId } from '@/side-panel/pages/search/utils/getSidePanelSearchResultAnchorId';
import { groupSearchResultItems } from '@/side-panel/pages/search/utils/groupSearchResultItems';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { css } from '@linaria/core';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import { Avatar } from 'twenty-ui/data-display';
import { AppTooltip, TooltipDelay } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';

// The card brings its own surface, so the tooltip only contributes the shadow.
// Tooltips render at 0.9 opacity, which would make the card translucent.
const previewTooltipClass = css`
  background: transparent !important;
  border-radius: ${themeCssVariables.border.radius.md} !important;
  box-shadow: ${themeCssVariables.boxShadow.strong} !important;
  opacity: 1 !important;
  padding: 0 !important;
`;

export const SidePanelSearchRecordsPage = () => {
  const { sidePanelSearch, searchResultItems, loading, noResults } =
    useSidePanelSearchRecords();
  const { appSearchResultItems } = useAppSearchResultItems({
    searchInput: sidePanelSearch,
    skip: false,
  });
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const { closeCommandMenu } = useCloseCommandMenu();
  const { recordSearchObjectUsage } = useRecordSearchObjectUsage();
  const searchRecordsFrecencyByObject = useAtomStateValue(
    searchRecordsFrecencyByObjectState,
  );
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { groups, orderedItems } = useMemo(() => {
    const nowTimestamp = Date.now();

    const frecencyRankByGroupKey = Object.fromEntries(
      Object.entries(searchRecordsFrecencyByObject).map(
        ([objectKey, frecency]) => [
          objectKey,
          computeSearchRecordObjectFrecencyRank({ frecency, nowTimestamp }),
        ],
      ),
    );

    return groupSearchResultItems({
      items: [...searchResultItems, ...appSearchResultItems],
      frecencyRankByGroupKey,
    });
  }, [searchRecordsFrecencyByObject, searchResultItems, appSearchResultItems]);

  const selectableItemIds = useMemo(
    () => orderedItems.map((item) => item.id),
    [orderedItems],
  );

  const previewedItem = useSidePanelSearchRecordPreviewItem(orderedItems);

  const shouldDisplayPreview = !isMobile && isDefined(previewedItem);

  return (
    <>
      <SidePanelList
        selectableItemIds={selectableItemIds}
        loading={loading}
        noResults={noResults}
      >
        {groups.map(({ groupKey, heading, items }) => (
          <SidePanelGroup key={groupKey} heading={heading}>
            {items.map((item) => {
              const isTaskOrNote = [
                CoreObjectNameSingular.Task,
                CoreObjectNameSingular.Note,
              ].includes(item.objectNameSingular as CoreObjectNameSingular);

              const handleClick = () => {
                recordSearchObjectUsage(item.groupKey);

                if (isDefined(item.path)) {
                  closeCommandMenu();
                  navigate(item.path);
                } else if (isTaskOrNote) {
                  openRecordInSidePanel({
                    recordId: item.recordId,
                    objectNameSingular:
                      item.objectNameSingular as CoreObjectNameSingular,
                  });
                } else {
                  closeCommandMenu();
                  navigate(
                    getAppPath(AppPath.RecordShowPage, {
                      objectNameSingular: item.objectNameSingular,
                      objectRecordId: item.recordId,
                    }),
                  );
                }
              };

              return (
                <SelectableListItem
                  key={item.id}
                  itemId={item.id}
                  onEnter={handleClick}
                >
                  <div id={getSidePanelSearchResultAnchorId(item.id)}>
                    <CommandMenuItem
                      id={item.id}
                      label={item.label}
                      description={item.description ?? item.objectLabel}
                      onClick={handleClick}
                      LeftComponent={
                        <Avatar
                          type={item.avatarType}
                          avatarUrl={getAbsoluteImageUrl(item.imageUrl)}
                          placeholderColorSeed={item.recordId}
                          placeholder={item.label}
                        />
                      }
                    />
                  </div>
                </SelectableListItem>
              );
            })}
          </SidePanelGroup>
        ))}
      </SidePanelList>

      {shouldDisplayPreview && (
        <AppTooltip
          anchorSelect={`#${getSidePanelSearchResultAnchorId(previewedItem.id)}`}
          place="left-start"
          offset={16}
          noArrow
          clickable
          isOpen
          delay={TooltipDelay.noDelay}
          className={previewTooltipClass}
          width={`${SIDE_PANEL_SEARCH_RECORD_PREVIEW_WIDTH}px`}
        >
          <SidePanelSearchRecordPreviewCard
            key={previewedItem.recordId}
            objectNameSingular={previewedItem.objectNameSingular}
            recordId={previewedItem.recordId}
            label={previewedItem.label}
          />
        </AppTooltip>
      )}
    </>
  );
};
