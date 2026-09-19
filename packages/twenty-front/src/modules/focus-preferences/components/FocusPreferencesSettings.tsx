import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Card } from 'twenty-ui/surfaces';
import { IconCommand, IconTextSize } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { FOCUS_DURATION_PRESET_MINUTES } from '@/focus-preferences/constants/FocusDurationPresetMinutes';
import { FOCUS_SESSION_TARGET_PRESETS } from '@/focus-preferences/constants/FocusSessionTargetPresets';
import { useFocusPreferences } from '@/focus-preferences/hooks/useFocusPreferences';
import { SettingsOptionCardContentToggle } from '@/settings/components/SettingsOptions/SettingsOptionCardContentToggle';
import { Select } from '@/ui/input/components/Select';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledSelectGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

export const FocusPreferencesSettings = () => {
  const { t } = useLingui();
  const {
    focusPreferences,
    setDensity,
    setEasyRead,
    setShortcutsEnabled,
    setPomodoroFocusDurationMinutes,
    setPomodoroSessionTarget,
  } = useFocusPreferences();

  return (
    <StyledContainer>
      <StyledSelectGroup>
        <Select
          dropdownId="focus-preference-density-select"
          label={t`Density`}
          fullWidth
          value={focusPreferences.density}
          onChange={setDensity}
          options={[
            { label: t`Comfortable`, value: 'comfortable' },
            { label: t`Compact`, value: 'compact' },
          ]}
        />
        <Select
          dropdownId="focus-preference-duration-select"
          label={t`Pomodoro focus duration`}
          fullWidth
          value={focusPreferences.pomodoroFocusDurationMinutes}
          onChange={setPomodoroFocusDurationMinutes}
          options={FOCUS_DURATION_PRESET_MINUTES.map((minutes) => ({
            label: t`${minutes} minutes`,
            value: minutes,
          }))}
        />
        <Select
          dropdownId="focus-preference-session-target-select"
          label={t`Pomodoro daily session target`}
          fullWidth
          value={focusPreferences.pomodoroSessionTarget}
          onChange={setPomodoroSessionTarget}
          options={FOCUS_SESSION_TARGET_PRESETS.map((target) => ({
            label: t`${target} sessions`,
            value: target,
          }))}
        />
      </StyledSelectGroup>
      <Card rounded fullWidth>
        <SettingsOptionCardContentToggle
          Icon={IconTextSize}
          title={t`Easy read`}
          description={t`Increase line height and letter spacing across the interface`}
          checked={focusPreferences.easyRead}
          onChange={setEasyRead}
        />
      </Card>
      <Card rounded fullWidth>
        <SettingsOptionCardContentToggle
          Icon={IconCommand}
          title={t`Keyboard shortcuts`}
          description={t`Enable keyboard shortcuts such as opening search`}
          checked={focusPreferences.shortcutsEnabled}
          onChange={setShortcutsEnabled}
        />
      </Card>
    </StyledContainer>
  );
};
