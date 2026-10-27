import { css } from '@linaria/core';
import { type MouseEvent, type ReactNode } from 'react';

import { Link } from 'react-router-dom';
import {
  EASING,
  color,
  FONT_WEIGHT,
  fontFamily,
  fontSize,
  radius,
  spacing,
  DURATION,
  REDUCED_MOTION,
} from '@/public-site/tokens';

import { ButtonShape } from './ButtonShape';

const BUTTON_HEIGHT_PX: Record<ButtonSize, number> = {
  regular: 40,
  small: 32,
};

// Appearance is fully CSS-variable driven so a future surface scheme can
// restyle buttons by overriding variables, never by adding props.
const buttonClassName = css`
  --button-fill: transparent;
  --button-hover-fill: transparent;
  --button-hover-opacity: 1;
  --button-label: ${color('black')};
  --button-label-hover: ${color('black')};
  --button-stroke: transparent;

  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  font-family: ${fontFamily('mono')};
  font-size: ${fontSize(3)};
  font-weight: ${FONT_WEIGHT.medium};
  height: ${BUTTON_HEIGHT_PX.regular}px;
  justify-content: center;
  letter-spacing: 0;
  padding: 0 ${spacing(5)};
  position: relative;
  text-decoration: none;
  text-transform: uppercase;

  &[data-size='small'] {
    height: ${BUTTON_HEIGHT_PX.small}px;
    padding: 0 ${spacing(4)};
  }

  &[data-variant='filled'] {
    --button-fill: ${color('black')};
    --button-hover-fill: ${color('black-hover')};
    --button-label: ${color('white')};
    --button-label-hover: ${color('white')};
  }

  /* Dark surfaces restyle via context, never via props. Filled hovers
     shift 10% toward the opposite pole;
     the old site's full invert melted the button into the section. */
  [data-scheme='dark'] &[data-variant='filled'] {
    --button-fill: ${color('white')};
    --button-hover-fill: ${color('white-hover')};
    --button-label: ${color('black')};
    --button-label-hover: ${color('black')};
  }

  [data-scheme='dark'] &[data-variant='outlined'] {
    --button-hover-fill: ${color('white')};
    --button-label: ${color('white')};
    --button-label-hover: ${color('white')};
    --button-stroke: ${color('white')};
  }

  [data-scheme='dark'] [data-scheme='light'] &[data-variant='filled'] {
    --button-fill: ${color('black')};
    --button-hover-fill: ${color('black-hover')};
    --button-label: ${color('white')};
    --button-label-hover: ${color('white')};
  }

  [data-scheme='dark'] [data-scheme='light'] &[data-variant='outlined'] {
    --button-hover-fill: ${color('black')};
    --button-label: ${color('black')};
    --button-label-hover: ${color('black')};
    --button-stroke: ${color('black')};
  }

  /* Outlined hovers are a 5% ink wash. The shape paints OPAQUE and the
     layer carries the opacity, so the wash composites once — segment
     overlaps can never double into seams, on any surface. */
  &[data-variant='outlined'] {
    --button-hover-fill: ${color('black')};
    --button-hover-opacity: 0.05;
    --button-stroke: ${color('black')};
  }

  /* The stroke stays visible through the hover fill: the base shape is
     raised above the sliding layer (menu LOG IN, FAQ TALK TO US). */
  &[data-variant='outlined'] > span[aria-hidden]:first-child {
    z-index: 1;
  }

  &:focus-visible {
    outline: 1px solid ${color('blue')};
    outline-offset: 1px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  [data-slot='hover-layer'] {
    --button-fill: var(--button-hover-fill);
    --button-stroke: transparent;

    border-radius: ${radius(1)};

    /* Clip the sliding fill to the button's corner radius so trailing
       corners stay rounded mid-transition. */
    inset: 0;
    opacity: var(--button-hover-opacity);
    overflow: hidden;
    pointer-events: none;
    position: absolute;

    > span {
      display: block;
      height: 100%;
      position: relative;
      transform: translateX(calc(-100% - ${spacing(4)}));
      transition: transform 260ms ${EASING.standard};
      width: 100%;
    }
  }

  &:is(:hover, :focus-visible) [data-slot='hover-layer'] > span {
    transform: translateX(0);
  }

  ${REDUCED_MOTION} {
    [data-slot='hover-layer'] > span {
      transition: none;
    }
  }

  &:is(:hover, :focus-visible) [data-slot='content'] {
    color: var(--button-label-hover);
  }

  [data-slot='content'] {
    align-items: center;
    color: var(--button-label);
    display: inline-flex;
    gap: ${spacing(2)};
    position: relative;
    transition: color ${DURATION.sm} ease;
  }
`;

export type ButtonSize = 'regular' | 'small';
export type ButtonVariant = 'filled' | 'outlined';

export type ButtonProps = {
  disabled?: boolean;
  ariaPressed?: boolean;
  href?: string;
  label: string;
  leadingIcon?: ReactNode;
  size?: ButtonSize;
  type?: 'button' | 'submit';
  variant?: ButtonVariant;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

export function Button({
  disabled = false,
  ariaPressed,
  href,
  label,
  leadingIcon,
  size = 'regular',
  type = 'button',
  variant = 'filled',
  onClick,
}: ButtonProps) {
  const heightPx = BUTTON_HEIGHT_PX[size];
  // mailto:/tel: open in place (mail client, dialer) — forcing target=_blank
  // would leave an orphan blank tab, so they render as a plain anchor.
  const isProtocolLink =
    href !== undefined &&
    (href.startsWith('mailto:') || href.startsWith('tel:'));
  // An in-page jump stays on the current document: it must keep its href so
  // the target is focusable and reachable without JS, and must never open a tab.
  const isHashLink = href !== undefined && href.startsWith('#');
  const isExternal =
    href !== undefined &&
    !href.startsWith('/') &&
    !isProtocolLink &&
    !isHashLink;

  const inner = (
    <>
      <ButtonShape heightPx={heightPx} outlined={variant === 'outlined'} />
      <span data-slot="hover-layer">
        <span>
          <ButtonShape heightPx={heightPx} />
        </span>
      </span>
      <span data-slot="content">
        {leadingIcon}
        {label}
      </span>
    </>
  );

  if (href === undefined) {
    return (
      <button
        className={buttonClassName}
        data-size={size}
        data-variant={variant}
        aria-busy={disabled ? true : undefined}
        aria-pressed={ariaPressed}
        disabled={disabled}
        onClick={onClick}
        type={type}
      >
        {inner}
      </button>
    );
  }

  if (isProtocolLink || isHashLink) {
    return (
      <a
        className={buttonClassName}
        data-size={size}
        data-variant={variant}
        href={href}
        onClick={onClick}
      >
        {inner}
      </a>
    );
  }

  if (isExternal) {
    return (
      <a
        className={buttonClassName}
        data-size={size}
        data-variant={variant}
        href={href}
        onClick={onClick}
        rel="noopener noreferrer"
        target="_blank"
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      className={buttonClassName}
      data-size={size}
      data-variant={variant}
      to={href}
      onClick={onClick}
    >
      {inner}
    </Link>
  );
}
