import { styled } from '@linaria/react';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useState } from 'react';
import { getDateFnsLocale } from '@/ui/field/display/utils/getDateFnsLocale';
import { Select } from '@/ui/input/components/Select';
import { useUpdateWorkspaceMemberSettings } from '@/settings/profile/hooks/useUpdateWorkspaceMemberSettings';

import { useInvalidateMetadataStore } from '@/metadata-store/hooks/useInvalidateMetadataStore';
import { useStore } from 'jotai';
import { useLingui } from '@lingui/react/macro';
import { enUS } from 'date-fns/locale';
import { type APP_LOCALES } from 'twenty-shared/translations';
import { isDefined } from 'twenty-shared/utils';
import { useLocaleOptions } from '~/localization/hooks/useLocaleOptions';
import { dateLocaleState } from '~/localization/states/dateLocaleState';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';
import { logError } from '~/utils/logError';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

export const LocalePicker = () => {
  const { t } = useLingui();
  const store = useStore();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { updateWorkspaceMemberSettings } = useUpdateWorkspaceMemberSettings();
  const localeOptions = useLocaleOptions();

  const { invalidateMetadataStore } = useInvalidateMetadataStore();

  const { enqueueErrorSnackBar, enqueueInfoSnackBar } = useSnackBar();
  const [isSaving, setIsSaving] = useState(false);

  const handleLocaleChange = async (value: keyof typeof APP_LOCALES) => {
    if (!isDefined(currentWorkspaceMember) || isSaving) return;
    const workspaceMemberId = currentWorkspaceMember.id;
    const isCurrentMember = () =>
      store.get(currentWorkspaceMemberState.atom)?.id === workspaceMemberId;
    setIsSaving(true);

    try {
      const didSave = await updateWorkspaceMemberSettings({
        workspaceMemberId,
        update: { locale: value },
      });
      if (!didSave) throw new Error('Language preference was not saved');
      if (!isCurrentMember()) return;

      const dateFnsLocale = await getDateFnsLocale(value);
      if (!isCurrentMember()) return;
      const activatedLocale = await dynamicActivate(value, {
        canActivate: isCurrentMember,
      });
      if (!isDefined(activatedLocale) || !isCurrentMember()) return;

      store.set(dateLocaleState.atom, {
        locale: activatedLocale,
        localeCatalog:
          activatedLocale === value ? (dateFnsLocale ?? enUS) : enUS,
      });
      try {
        localStorage.setItem('locale', value);
      } catch {
        // The server preference remains durable when storage is unavailable.
      }
      if (activatedLocale !== value) {
        enqueueInfoSnackBar({
          message: t`Your language was saved. English is shown while its translations are unavailable.`,
        });
      }
      invalidateMetadataStore();
    } catch (error) {
      logError(error);
      if (isCurrentMember()) {
        enqueueErrorSnackBar({
          message: t`Could not save language. Please try again.`,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isDefined(currentWorkspaceMember)) return null;

  return (
    <StyledContainer>
      <Select
        dropdownId="preferred-locale"
        label={t`Language`}
        dropdownWidthAuto
        fullWidth
        disabled={isSaving}
        withSearchInput
        value={currentWorkspaceMember.locale}
        options={localeOptions}
        onChange={(value) =>
          handleLocaleChange(value as keyof typeof APP_LOCALES)
        }
      />
    </StyledContainer>
  );
};
