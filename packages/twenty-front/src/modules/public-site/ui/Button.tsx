import { css } from '@linaria/core';
import { type MouseEvent, type ReactNode } from 'react';

import { Link } from 'react-router-dom';
import {
  EASING,
  color,
  FONT_WEIGHT,
  fontFamily,
  fontSize,
  spacing,
  DURATION,
  REDUCED_MOTION,
} from '@/public-site/tokens';

const BUTTON_HEIGHT_PX: Record<ButtonSize, number> = {
  regular: 46,
  small: 36,
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
  background: var(--button-fill);
  border: 1px solid var(--button-stroke);
  border-radius: 999px;
  corner-shape: round;
  cursor: pointer;
  display: inline-flex;
  font-family: ${fontFamily('sans')};
  font-size: ${fontSize(3)};
  font-weight: ${FONT_WEIGHT.medium};
  height: ${BUTTON_HEIGHT_PX.regular}px;
  justify-content: center;
  letter-spacing: 0;
  padding: 0 ${spacing(5)};
  position: relative;
  text-decoration: none;
  transition: transform 180ms ease;

  &:hover {
    transform: translateY(-2px);
  }

  &[data-size='small'] {
    height: ${BUTTON_HEIGHT_PX.small}px;
    padding: 0 ${spacing(4)};
  }

  &[data-variant='filled'] {
    --button-fill: ${color('black')};
    --button-hover-fill: ${color('pink')};
    --button-label: ${color('white')};
    --button-label-hover: ${color('black')};
  }

  // Dark sections keep the same cream and charcoal pair.
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
    --button-hover-fill: ${color('pink')};
    --button-label: ${color('white')};
    --button-label-hover: ${color('black')};
  }

  [data-scheme='dark'] [data-scheme='light'] &[data-variant='outlined'] {
    --button-hover-fill: ${color('black')};
    --button-label: ${color('black')};
    --button-label-hover: ${color('black')};
    --button-stroke: ${color('black')};
  }

  &[data-variant='outlined'] {
    --button-hover-fill: ${color('black')};
    --button-hover-opacity: 0.05;
    --button-stroke: ${color('black')};
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

    border-radius: inherit;

    /* Clip the sliding fill to the button's corner radius so trailing
       corners stay rounded mid-transition. */
    inset: 0;
    opacity: var(--button-hover-opacity);
    overflow: hidden;
    pointer-events: none;
    position: absolute;

    > span {
      background: var(--button-fill);
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
      <span data-slot="hover-layer">
        <span />
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
