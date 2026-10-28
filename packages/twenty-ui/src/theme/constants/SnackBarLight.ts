import { BACKGROUND_LIGHT } from '@ui/theme/constants/BackgroundLight';
import { FONT_LIGHT } from '@ui/theme/constants/FontLight';
import { COLOR_LIGHT } from '@ui/theme/constants/ColorsLight';

export const SNACK_BAR_LIGHT = {
  success: {
    color: COLOR_LIGHT.turquoise11,
    backgroundColor: BACKGROUND_LIGHT.transparent.success,
  },
  error: {
    color: COLOR_LIGHT.red11,
    backgroundColor: BACKGROUND_LIGHT.transparent.danger,
  },
  warning: {
    color: COLOR_LIGHT.orange11,
    backgroundColor: BACKGROUND_LIGHT.transparent.orange,
  },
  info: {
    color: COLOR_LIGHT.blue11,
    backgroundColor: BACKGROUND_LIGHT.transparent.blue,
  },
  default: {
    color: FONT_LIGHT.color.primary,
    backgroundColor: BACKGROUND_LIGHT.transparent.light,
  },
};
