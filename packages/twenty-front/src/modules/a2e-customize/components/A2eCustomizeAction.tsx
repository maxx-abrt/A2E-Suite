import { A2E_CUSTOMIZE_ACTION_DROPDOWN_ID } from '@/a2e-customize/constants/A2eCustomizeActionDropdownId';
import { useA2eCustomizeActions } from '@/a2e-customize/hooks/useA2eCustomizeActions';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconListDetails, IconPaint, IconTable } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { MenuItem } from 'twenty-ui/navigation';

import { PermissionFlagType } from '~/generated-metadata/graphql';

type A2eCustomizeActionProps = {
  // The surface's record object plural, so the action can offer its native views
  // and fields settings. Optional because a future app-home surface may be its
  // own page with no record index to customise.
  objectNamePlural?: string;
};

// M13d entry point: one "Customize" action on an app landing page that opens the
// native layout edit mode and the surface's own views/fields settings. It adds
// no editor of its own — the per-managed-item "Reset to default" lives in the
// native page-layout side panel and stays the single owner of provenance-based
// resets.
export const A2eCustomizeAction = ({
  objectNamePlural,
}: A2eCustomizeActionProps) => {
  const { t } = useLingui();
  const hasLayoutsPermission = useHasPermissionFlag(PermissionFlagType.LAYOUTS);
  const { editLayout, openViews, openFields } =
    useA2eCustomizeActions(objectNamePlural);

  return (
    <Dropdown
      dropdownId={A2E_CUSTOMIZE_ACTION_DROPDOWN_ID}
      dropdownPlacement="bottom-end"
      clickableComponent={
        <Button
          Icon={IconPaint}
          title={t`Customize`}
          variant="secondary"
          dataTestId="a2e-customize"
        />
      }
      dropdownComponents={
        <DropdownContent widthInPixels={GenericDropdownContentWidth.Medium}>
          <DropdownMenuItemsContainer>
            <MenuItem
              LeftIcon={IconPaint}
              text={t`Layout customization`}
              onClick={editLayout}
              disabled={!hasLayoutsPermission}
              testId="a2e-customize-edit-layout"
            />
            {isDefined(objectNamePlural) && (
              <>
                <MenuItem
                  LeftIcon={IconTable}
                  text={t`Views`}
                  onClick={openViews}
                  testId="a2e-customize-views"
                />
                <MenuItem
                  LeftIcon={IconListDetails}
                  text={t`Fields`}
                  onClick={openFields}
                  testId="a2e-customize-fields"
                />
              </>
            )}
          </DropdownMenuItemsContainer>
        </DropdownContent>
      }
    />
  );
};
