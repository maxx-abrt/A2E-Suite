import { styled } from '@linaria/react';
import { IconLink } from 'twenty-ui/icon';

import { LinkToRecordPicker } from '@/blocknote-editor/components/LinkToRecordPicker';
import { type SuggestionItem } from '@/blocknote-editor/types/types';
import { useOpenDropdown } from '@/ui/layout/dropdown/hooks/useOpenDropdown';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';

const LINK_TO_RECORD_DROPDOWN_ID = 'link-to-record-slash-dropdown';

const StyledAnchor = styled.span`
  height: 0;
  width: 0;
`;

type LinkToRecordSlashMenuItemProps = {
  children: (item: SuggestionItem) => React.ReactNode;
};

// The slash-menu item opens the shared record picker on a fixed dropdownId;
// LinkToRecordPicker renders it subscribed to the same dropdown state. A
// render-prop keeps the item factory hook-free.
export const LinkToRecordSlashMenuItem = ({
  children,
}: LinkToRecordSlashMenuItemProps) => {
  const { openDropdown } = useOpenDropdown();

  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    LINK_TO_RECORD_DROPDOWN_ID,
  );

  const item: SuggestionItem = {
    title: 'Link to record',
    aliases: ['link', 'record'],
    group: 'Advanced',
    Icon: IconLink,
    onItemClick: () => {
      openDropdown({
        dropdownComponentInstanceIdFromProps: LINK_TO_RECORD_DROPDOWN_ID,
      });
    },
  };

  return (
    <>
      {children(item)}
      <StyledAnchor>
        <LinkToRecordPicker isDropdownOpen={isDropdownOpen} />
      </StyledAnchor>
    </>
  );
};
