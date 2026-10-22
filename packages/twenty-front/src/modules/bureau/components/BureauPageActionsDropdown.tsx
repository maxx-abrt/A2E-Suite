import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { getBureauPagePath } from '@/bureau/utils/getBureauPagePath';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { DropdownMenuSeparator } from '@/ui/layout/dropdown/components/DropdownMenuSeparator';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { useLingui } from '@lingui/react/macro';
import {
  IconDotsVertical,
  IconLink,
  IconMaximize,
  IconPencil,
  IconPlus,
  IconStar,
  IconTextSize,
  IconTrash,
} from 'twenty-ui/icon';
import { LightIconButton } from 'twenty-ui/input';
import { MenuItem, MenuItemToggle } from 'twenty-ui/navigation';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';

type BureauPageReadingControls = {
  isFullWidth: boolean;
  isSmallText: boolean;
  onFullWidthChange: (isFullWidth: boolean) => void;
  onSmallTextChange: (isSmallText: boolean) => void;
};

type BureauPageActionsDropdownProps = {
  page: BureauDocument;
  dropdownId: string;
  onRename?: () => void;
  readingControls?: BureauPageReadingControls;
};

export const BureauPageActionsDropdown = ({
  page,
  dropdownId,
  onRename,
  readingControls,
}: BureauPageActionsDropdownProps) => {
  const { t } = useLingui();
  const { closeDropdown } = useCloseDropdown();
  const { copyToClipboard } = useCopyToClipboard();
  const { actions, favoriteDocumentIds, toggleFavorite } = useBureauWorkspace();
  const isFavorite = favoriteDocumentIds.has(page.id);

  const closeThen = (callback: () => void) => () => {
    closeDropdown(dropdownId);
    callback();
  };

  return (
    <Dropdown
      dropdownId={dropdownId}
      dropdownPlacement="bottom-start"
      clickableComponent={
        <LightIconButton
          Icon={IconDotsVertical}
          accent="tertiary"
          size="small"
          aria-label={t`Page actions`}
          testId={`${dropdownId}-button`}
        />
      }
      dropdownComponents={
        <DropdownContent>
          <DropdownMenuItemsContainer>
            <MenuItem
              LeftIcon={IconPlus}
              text={t`Add a sub-page`}
              testId={`${dropdownId}-add-sub-page`}
              onClick={closeThen(() => {
                void actions.createPage({ parentId: page.id });
              })}
            />
            {onRename ? (
              <MenuItem
                LeftIcon={IconPencil}
                text={t`Rename`}
                testId={`${dropdownId}-rename`}
                onClick={closeThen(onRename)}
              />
            ) : null}
            <MenuItem
              LeftIcon={IconStar}
              text={
                isFavorite ? t`Remove from favorites` : t`Add to favorites`
              }
              testId={`${dropdownId}-favorite`}
              onClick={closeThen(() => {
                void toggleFavorite(page.id);
              })}
            />
            <MenuItem
              LeftIcon={IconLink}
              text={t`Copy link`}
              testId={`${dropdownId}-copy-link`}
              onClick={closeThen(() => {
                void copyToClipboard(
                  `${window.location.origin}${getBureauPagePath(page.id)}`,
                  t`Link copied`,
                );
              })}
            />
          </DropdownMenuItemsContainer>
          {readingControls ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItemsContainer>
                <MenuItemToggle
                  LeftIcon={IconMaximize}
                  text={t`Full width`}
                  toggled={readingControls.isFullWidth}
                  onToggleChange={readingControls.onFullWidthChange}
                />
                <MenuItemToggle
                  LeftIcon={IconTextSize}
                  text={t`Small text`}
                  toggled={readingControls.isSmallText}
                  onToggleChange={readingControls.onSmallTextChange}
                />
              </DropdownMenuItemsContainer>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItemsContainer>
            <MenuItem
              accent="danger"
              LeftIcon={IconTrash}
              text={t`Move to trash`}
              testId={`${dropdownId}-trash`}
              onClick={closeThen(() => {
                void actions.trashPage(page.id);
              })}
            />
          </DropdownMenuItemsContainer>
        </DropdownContent>
      }
    />
  );
};
