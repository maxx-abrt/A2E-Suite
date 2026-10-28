export { color } from '../../../../twenty-website/src/tokens/color';
export { EASING } from '../../../../twenty-website/src/tokens/easing';
export {
  FONT_WEIGHT,
  type FontWeightToken,
} from '../../../../twenty-website/src/tokens/font-weight';
export { fontFamily } from '../../../../twenty-website/src/tokens/font-family';
export { fontSize } from '../../../../twenty-website/src/tokens/font-size';
export { radius } from '../../../../twenty-website/src/tokens/radius';
export { spacing } from '../../../../twenty-website/src/tokens/spacing';
export { DURATION } from '../../../../twenty-website/src/tokens/duration';
export { REDUCED_MOTION } from '../../../../twenty-website/src/tokens/reduced-motion';
export { mediaUp } from '../../../../twenty-website/src/tokens/media-up';
export { GUTTER } from '../../../../twenty-website/src/tokens/gutter';
export { MAX_CONTENT_WIDTH_PX } from '../../../../twenty-website/src/tokens/max-content-width';
import { typeRampDeclarations as websiteTypeRampDeclarations } from '../../../../twenty-website/src/tokens/type-ramp-declarations';
import { UNITS } from '../../../../twenty-website/src/tokens/units';

// The product root is 13px; scope the website's 16px type scale without changing the application root.
export const typeRampDeclarations: typeof websiteTypeRampDeclarations = (
  ramp,
) =>
  websiteTypeRampDeclarations(ramp).replace(
    /(-?\d+(?:\.\d+)?)rem/g,
    (_, remValue: string) =>
      `calc(var(--font-base) * ${Number(remValue) / UNITS.fontBaseRem})`,
  );

import { buildSchemeDeclarations as buildWebsiteSchemeDeclarations } from '../../../../twenty-website/src/tokens/build-scheme-declarations';
import { type Scheme } from '../../../../twenty-website/src/tokens/scheme';
export { semanticColor } from '../../../../twenty-website/src/tokens/semantic-color';
export { RHYTHM } from '../../../../twenty-website/src/tokens/rhythm';
export { GRADIENT } from '../../../../twenty-website/src/tokens/gradient';
export { HERO_COMPOSITION } from '../../../../twenty-website/src/tokens/hero-composition';
export { type Scheme } from '../../../../twenty-website/src/tokens/scheme';
import { buildCssVariableDeclarations as buildWebsiteCssVariableDeclarations } from '../../../../twenty-website/src/tokens/build-css-variable-declarations';
import {
  PALETTE,
  type PaletteToken,
} from '../../../../twenty-website/src/tokens/palette';
import { ALPHA_SCALE } from '../../../../twenty-website/src/tokens/alpha-scale';
import { A2E_BRAND_COLORS } from '../../../../twenty-ui/src/theme/constants/A2eBrandColors';

const PUBLIC_BRAND_PALETTE: Record<PaletteToken, string> = {
  white: A2E_BRAND_COLORS.cream,
  black: A2E_BRAND_COLORS.charcoal,
  'black-hover': A2E_BRAND_COLORS.charcoal,
  'white-hover': A2E_BRAND_COLORS.peach,
  graphite: A2E_BRAND_COLORS.charcoal,
  silver: A2E_BRAND_COLORS.cream,
  neutral: A2E_BRAND_COLORS.cream,
  blue: A2E_BRAND_COLORS.lavender,
  pink: A2E_BRAND_COLORS.peach,
  green: A2E_BRAND_COLORS.olive,
  yellow: A2E_BRAND_COLORS.amber,
  error: A2E_BRAND_COLORS.red,
  ash: A2E_BRAND_COLORS.rose,
  fog: A2E_BRAND_COLORS.cream,
  charcoal: A2E_BRAND_COLORS.charcoal,
  stone: A2E_BRAND_COLORS.olive,
  iron: A2E_BRAND_COLORS.orange,
  chalk: A2E_BRAND_COLORS.cream,
};

export const buildCssVariableDeclarations = (): string => {
  let declarations = buildWebsiteCssVariableDeclarations();

  for (const token of Object.keys(PALETTE) as PaletteToken[]) {
    declarations = declarations.replace(
      `--color-${token}: ${PALETTE[token]};`,
      `--color-${token}: ${PUBLIC_BRAND_PALETTE[token]};`,
    );
  }

  for (const base of ALPHA_SCALE.colors) {
    for (const [step, opacity] of Object.entries(ALPHA_SCALE.stepHex)) {
      declarations = declarations.replace(
        `--color-${base}-${step}: ${PALETTE[base]}${opacity};`,
        `--color-${base}-${step}: ${PUBLIC_BRAND_PALETTE[base]}${opacity};`,
      );
    }
  }

  return readableSchemeInk(declarations);
};

// The supplied muted pigments need the stronger neutral ink for small copy.
const readableSchemeInk = (declarations: string): string =>
  declarations
    .replaceAll('var(--color-black-60)', 'var(--color-black-70)')
    .replaceAll('var(--color-white-60)', 'var(--color-white-80)');

export const buildSchemeDeclarations = (scheme: Scheme): string =>
  readableSchemeInk(buildWebsiteSchemeDeclarations(scheme));

export const buildSchemeContext = (scheme: Scheme): string =>
  `${buildSchemeDeclarations(scheme)}\ncolor: var(--ink);`;
