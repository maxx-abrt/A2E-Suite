import { css } from '@linaria/core';
import { Fragment } from 'react';

import {
  FONT_WEIGHT,
  fontFamily,
  type FontWeightToken,
  typeRampDeclarations,
} from '@/public-site/tokens';

import { parseHeadingNotation } from './heading-notation';

const headingClassName = css`
  &[data-wrap='balance'] {
    text-wrap: balance;
  }

  &[data-wrap='normal'] {
    text-wrap: normal;
  }

  &[data-family='serif'] {
    font-family: ${fontFamily('serif')};
    letter-spacing: -0.02em;
  }

  &[data-family='sans'] {
    font-family: ${fontFamily('sans')};
    letter-spacing: -0.04em;
  }

  /* A quote set at heading size reads at the page's natural tracking, not
     the family's tightened default — placed after the family rules so it
     wins the equal-specificity tie. */
  &[data-tracking='normal'] {
    letter-spacing: normal;
  }

  &[data-weight='light'] {
    font-weight: ${FONT_WEIGHT.medium};
  }

  &[data-weight='regular'] {
    font-weight: ${FONT_WEIGHT.regular};
  }

  &[data-weight='medium'] {
    font-weight: ${FONT_WEIGHT.medium};
  }

  &[data-size='xl'] {
    ${typeRampDeclarations('headingXl')}
  }

  &[data-size='lg'] {
    ${typeRampDeclarations('headingLg')}
  }

  &[data-size='md'] {
    ${typeRampDeclarations('headingMd')}
  }

  &[data-size='sm'] {
    ${typeRampDeclarations('headingSm')}
  }

  &[data-size='xs'] {
    ${typeRampDeclarations('headingXs')}
  }

  [data-accent] {
    letter-spacing: -0.04em;
  }

  &[data-display-accent='true'] [data-accent] {
    display: inline-block;
    isolation: isolate;
    position: relative;
    font-size: 0.9em;
    font-family: 'Dream Kudos', ${fontFamily('sans')};
    font-weight: 400;
    letter-spacing: 0;

    &::before {
      background: var(--color-pink);
      border-radius: 999px;
      bottom: 0.04em;
      content: '';
      height: 0.3em;
      left: -0.04em;
      position: absolute;
      right: -0.04em;
      transform: rotate(-2deg);
      z-index: -1;
    }
  }

  &[data-family='serif']:not([data-display-accent='true']) [data-accent] {
    font-family: ${fontFamily('sans')};
  }

  &[data-family='sans']:not([data-display-accent='true']) [data-accent] {
    font-family: ${fontFamily('serif')};
    letter-spacing: -0.02em;
  }
`;

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type HeadingSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs';
export type HeadingFamily = 'serif' | 'sans';
export type HeadingTracking = 'tight' | 'normal';
export type HeadingWrap = 'balance' | 'normal';

export type HeadingProps = {
  as?: HeadingLevel;
  children: string;
  className?: string;
  family?: HeadingFamily;
  displayAccent?: boolean;
  size?: HeadingSize;
  tracking?: HeadingTracking;
  weight?: FontWeightToken;
  wrap?: HeadingWrap;
};

export function Heading({
  as: Tag = 'h2',
  children,
  className,
  family = 'sans',
  displayAccent = false,
  size = 'md',
  tracking = 'tight',
  weight = 'regular',
  wrap = 'balance',
}: HeadingProps) {
  // Keys are the segment's character offset in the heading: data-derived,
  // unique even when the same word appears twice (breaks count one).
  let offset = 0;
  const keyedSegments = parseHeadingNotation(children).map((segment) => {
    const text = segment.kind === 'break' ? '' : segment.text;
    const keyed = {
      key: `${segment.kind}-${offset}`,
      kind: segment.kind,
      text,
    };
    offset += text.length + (segment.kind === 'break' ? 1 : 0);
    return keyed;
  });

  return (
    <Tag
      className={[headingClassName, className].filter(Boolean).join(' ')}
      data-family={family}
      data-display-accent={displayAccent || undefined}
      data-size={size}
      data-tracking={tracking}
      data-weight={weight}
      data-wrap={wrap}
    >
      {keyedSegments.map((segment) =>
        segment.kind === 'accent' ? (
          <span data-accent key={segment.key}>
            {segment.text}
          </span>
        ) : segment.kind === 'break' ? (
          <br key={segment.key} />
        ) : (
          <Fragment key={segment.key}>{segment.text}</Fragment>
        ),
      )}
    </Tag>
  );
}
