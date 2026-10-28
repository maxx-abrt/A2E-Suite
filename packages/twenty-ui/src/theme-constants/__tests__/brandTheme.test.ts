import * as fs from 'fs';
import * as path from 'path';

import { A2E_BRAND_COLORS } from '@ui/theme/constants/A2eBrandColors';
import { THEME_DARK } from '@ui/theme/constants/ThemeDark';
import { THEME_LIGHT } from '@ui/theme/constants/ThemeLight';

const hexToChannels = (hex: string) =>
  [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);

const resolveChannels = (color: string): number[] => {
  const mix = color.match(
    /^color-mix\(in srgb, (#[\da-f]{6}) (\d+)%, (#[\da-f]{6})\)$/i,
  );

  if (mix === null) return hexToChannels(color);

  const foreground = hexToChannels(mix[1]);
  const background = hexToChannels(mix[3]);
  const opacity = Number(mix[2]) / 100;

  return foreground.map(
    (channel, index) => channel * opacity + background[index] * (1 - opacity),
  );
};

const luminance = (color: string) =>
  resolveChannels(color)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index],
      0,
    );

const contrast = (foreground: string, background: string) => {
  const values = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );

  return (values[0] + 0.05) / (values[1] + 0.05);
};

const flattenTokens = (
  object: Record<string, unknown>,
  prefix = '--t',
): Record<string, string> => {
  const tokens: Record<string, string> = {};

  for (const [key, value] of Object.entries(object)) {
    const name = `${prefix}-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    if (typeof value === 'string') tokens[name] = value;
    else if (value !== null && typeof value === 'object') {
      Object.assign(
        tokens,
        flattenTokens(value as Record<string, unknown>, name),
      );
    }
  }

  return tokens;
};

describe.each([
  ['light', THEME_LIGHT],
  ['dark', THEME_DARK],
] as const)('A2E %s theme', (mode, theme) => {
  it('uses the supplied cream and charcoal for its foundations', () => {
    expect(theme.background.primary).toBe(
      mode === 'light' ? A2E_BRAND_COLORS.cream : A2E_BRAND_COLORS.charcoal,
    );
    expect(theme.font.color.primary).toBe(
      mode === 'light' ? A2E_BRAND_COLORS.charcoal : A2E_BRAND_COLORS.cream,
    );
  });

  it('keeps normal text, muted text, errors and tag labels at AA contrast', () => {
    for (const surface of [
      theme.background.primary,
      theme.background.secondary,
    ]) {
      for (const color of [
        theme.font.color.primary,
        theme.font.color.secondary,
        theme.font.color.tertiary,
        theme.font.color.danger,
        theme.accent.accent11,
        theme.buttons.secondaryTextColor,
      ]) {
        expect(contrast(color, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }

    for (const color of Object.keys(
      theme.tag.text,
    ) as (keyof typeof theme.tag.text)[]) {
      expect(
        contrast(theme.tag.text[color], theme.tag.background[color]),
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrast(theme.font.color.inverted, theme.background.invertedSecondary),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps every runtime CSS color and font aligned with its TypeScript token', () => {
    const css = fs.readFileSync(
      path.join(__dirname, `../theme-${mode}.css`),
      'utf8',
    );
    const base = css.split('@supports (corner-shape: squircle)')[0];
    const declarations = Object.fromEntries(
      [...base.matchAll(/(--t-[\w-]+):\s*([\s\S]*?);/g)].map((match) => [
        match[1],
        match[2].replace(/\s+/g, '').toLowerCase(),
      ]),
    );
    const tokens = flattenTokens(theme);

    for (const [name, value] of Object.entries(tokens)) {
      if (name === '--t-background-noisy' || name === '--t-name') continue;
      expect({ name, value: declarations[name] }).toEqual({
        name,
        value: value.replace(/\s+/g, '').toLowerCase(),
      });
    }
  });
});
