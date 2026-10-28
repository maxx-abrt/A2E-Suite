import { BACKGROUND_DARK } from '@ui/theme/constants/BackgroundDark';
import { FONT_DARK } from '@ui/theme/constants/FontDark';
import { COLOR_DARK } from '@ui/theme/constants/ColorsDark';

export const SNACK_BAR_DARK = {
  success: {
    color: COLOR_DARK.turquoise11,
    backgroundColor: BACKGROUND_DARK.transparent.success,
  },
  error: {
    color: COLOR_DARK.red11,
    backgroundColor: BACKGROUND_DARK.transparent.danger,
  },
  warning: {
    color: COLOR_DARK.orange11,
    backgroundColor: BACKGROUND_DARK.transparent.orange,
  },
  info: {
    color: COLOR_DARK.blue11,
    backgroundColor: BACKGROUND_DARK.transparent.blue,
  },
  default: {
    color: FONT_DARK.color.primary,
    backgroundColor: BACKGROUND_DARK.transparent.light,
  },
};
