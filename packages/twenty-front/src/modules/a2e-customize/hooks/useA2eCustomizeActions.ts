import { A2E_CUSTOMIZE_ACTION_DROPDOWN_ID } from '@/a2e-customize/constants/A2eCustomizeActionDropdownId';
import { useEnterLayoutCustomizationMode } from '@/layout-customization/hooks/useEnterLayoutCustomizationMode';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { AppPath, SettingsPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

// The M13d entry points share one implementation so the landing component stays
// presentational and the navigation/close side effects are unit-testable without
// rendering the dropdown portal.
export const useA2eCustomizeActions = (objectNamePlural?: string) => {
  const { closeDropdown } = useCloseDropdown();
  const { enterLayoutCustomizationMode } = useEnterLayoutCustomizationMode();
  const navigateApp = useNavigateApp();
  const navigateSettings = useNavigateSettings();

  const editLayout = () => {
    closeDropdown(A2E_CUSTOMIZE_ACTION_DROPDOWN_ID);
    enterLayoutCustomizationMode();
  };

  const openViews = () => {
    if (!isDefined(objectNamePlural)) {
      return;
    }

    closeDropdown(A2E_CUSTOMIZE_ACTION_DROPDOWN_ID);
    navigateApp(AppPath.RecordIndexPage, { objectNamePlural });
  };

  const openFields = () => {
    if (!isDefined(objectNamePlural)) {
      return;
    }

    closeDropdown(A2E_CUSTOMIZE_ACTION_DROPDOWN_ID);
    navigateSettings(SettingsPath.ObjectDetail, { objectNamePlural });
  };

  return { editLayout, openViews, openFields };
};
