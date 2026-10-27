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
export { buildSchemeContext } from '../../../../twenty-website/src/tokens/build-scheme-context';
export { buildSchemeDeclarations } from '../../../../twenty-website/src/tokens/build-scheme-declarations';
export { semanticColor } from '../../../../twenty-website/src/tokens/semantic-color';
export { RHYTHM } from '../../../../twenty-website/src/tokens/rhythm';
export { GRADIENT } from '../../../../twenty-website/src/tokens/gradient';
export { HERO_COMPOSITION } from '../../../../twenty-website/src/tokens/hero-composition';
export { type Scheme } from '../../../../twenty-website/src/tokens/scheme';
export { buildCssVariableDeclarations } from '../../../../twenty-website/src/tokens/build-css-variable-declarations';
