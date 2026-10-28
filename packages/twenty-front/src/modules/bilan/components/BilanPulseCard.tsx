import { styled } from '@linaria/react';
import { Link } from 'react-router-dom';
import { type ReactNode } from 'react';
import { IconArrowUpRight, type IconComponent } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { BILAN_PULSE_PALETTE } from '@/bilan/constants/BilanPulsePalette';

export type BilanPulseCardSpan = 5 | 7 | 12;

export type BilanPulseCardTone = 'default' | 'ocean' | 'ink';

export type BilanPulseCardAction = {
  label: string;
  to: string;
};

export type BilanPulseCardProps = {
  title: string;
  Icon: IconComponent;
  span: BilanPulseCardSpan;
  tone?: BilanPulseCardTone;
  meta?: ReactNode;
  action?: BilanPulseCardAction;
  testId?: string;
  children: ReactNode;
};

const StyledCard = styled.section<{
  span: BilanPulseCardSpan;
  tone: BilanPulseCardTone;
}>`
  animation: bilan-pulse-card-in 0.5s cubic-bezier(0.2, 0.9, 0.25, 1) both;
  background: ${({ tone }) => {
    if (tone === 'ocean') {
      return `linear-gradient(145deg, ${BILAN_PULSE_PALETTE.ocean.from} 0%, ${BILAN_PULSE_PALETTE.ocean.via} 52%, ${BILAN_PULSE_PALETTE.ocean.to} 100%)`;
    }

    if (tone === 'ink') {
      return `linear-gradient(160deg, ${BILAN_PULSE_PALETTE.ink.from} 0%, ${BILAN_PULSE_PALETTE.ink.via} 55%, ${BILAN_PULSE_PALETTE.ink.to} 100%)`;
    }

    return themeCssVariables.background.secondary;
  }};
  border: 1px solid
    ${({ tone }) =>
      tone === 'default'
        ? themeCssVariables.border.color.light
        : BILAN_PULSE_PALETTE.accentBorder};
  border-radius: ${themeCssVariables.border.radius.lg};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  grid-column: span ${({ span }) => span};
  min-width: 0;
  overflow: hidden;
  padding: ${themeCssVariables.spacing[5]};
  position: relative;
  transition: border-color
    calc(${themeCssVariables.animation.duration.fast} * 1s) ease;

  @keyframes bilan-pulse-card-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }

    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  &:hover {
    border-color: ${({ tone }) =>
      tone === 'default'
        ? themeCssVariables.border.color.medium
        : BILAN_PULSE_PALETTE.accentBorderHover};
  }

  @media (max-width: 1080px) {
    grid-column: span 12;
  }

  @media (max-width: 600px) {
    padding: ${themeCssVariables.spacing[4]};
  }
`;

const StyledCardGlow = styled.div<{ tone: BilanPulseCardTone }>`
  background: radial-gradient(
    circle at 82% -8%,
    ${({ tone }) =>
      tone === 'ocean'
        ? BILAN_PULSE_PALETTE.accentGlowStrong
        : BILAN_PULSE_PALETTE.accentGlowSoft},
    transparent 58%
  );
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 0;
`;

const StyledCardRim = styled.div`
  border-radius: inherit;
  box-shadow: ${BILAN_PULSE_PALETTE.accentRimShadow};
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 2;
`;

const StyledHeader = styled.header`
  align-items: flex-start;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-width: 0;
  position: relative;
  z-index: 1;
`;

const StyledTitleGroup = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledIcon = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledHeaderAside = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledMeta = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  white-space: nowrap;
`;

const StyledSegmented = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.pill};
  display: inline-flex;
  gap: 2px;
  padding: 2px;
`;

const StyledSegmentButton = styled.button<{ isActive: boolean }>`
  background: ${({ isActive }) =>
    isActive ? themeCssVariables.background.primary : 'transparent'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.pill};
  box-shadow: ${({ isActive }) =>
    isActive ? themeCssVariables.boxShadow.light : 'none'};
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1;
  padding: 4px 8px;
  transition:
    background calc(${themeCssVariables.animation.duration.fast} * 1s) ease,
    color calc(${themeCssVariables.animation.duration.fast} * 1s) ease;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

export type BilanPulseSegmentedItem = {
  label: string;
  value: string;
};

export type BilanPulseSegmentedProps = {
  items: BilanPulseSegmentedItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

export const BilanPulseSegmented = ({
  items,
  value,
  onChange,
  ariaLabel,
}: BilanPulseSegmentedProps) => (
  <StyledSegmented role="group" aria-label={ariaLabel}>
    {items.map((item) => (
      <StyledSegmentButton
        key={item.value}
        type="button"
        isActive={item.value === value}
        aria-pressed={item.value === value}
        onClick={() => onChange(item.value)}
      >
        {item.label}
      </StyledSegmentButton>
    ))}
  </StyledSegmented>
);

const StyledActionLink = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  margin: -2px -4px;
  padding: 2px 4px;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

const StyledBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  min-height: 0;
  position: relative;
  z-index: 1;
`;

export const StyledBilanPulseValue = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-feature-settings: 'tnum';
  font-size: clamp(30px, 3.4vw, 38px);
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: -0.04em;
  line-height: 1;
`;

export const StyledBilanPulseMetricRow = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

export const StyledBilanPulseLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledDelta = styled.span<{
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
  variant: 'default' | 'onAccent';
}>`
  align-items: center;
  color: ${({ tone, variant }) => {
    if (variant === 'onAccent') {
      if (tone === 'positive') {
        return BILAN_PULSE_PALETTE.onAccent.positive;
      }

      if (tone === 'negative') {
        return BILAN_PULSE_PALETTE.onAccent.negative;
      }

      if (tone === 'warning') {
        return BILAN_PULSE_PALETTE.onAccent.warning;
      }

      return BILAN_PULSE_PALETTE.onAccent.neutral;
    }

    if (tone === 'positive') {
      return themeCssVariables.color.green;
    }

    if (tone === 'negative') {
      return themeCssVariables.color.red;
    }

    if (tone === 'warning') {
      return themeCssVariables.color.orange;
    }

    return themeCssVariables.font.color.tertiary;
  }};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: 3px;
  white-space: nowrap;
`;

export type BilanPulseDeltaProps = {
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
  label: string;
  Icon?: IconComponent;
  variant?: 'default' | 'onAccent';
};

export const BilanPulseDelta = ({
  tone,
  label,
  Icon,
  variant = 'default',
}: BilanPulseDeltaProps) => (
  <StyledDelta tone={tone} variant={variant}>
    {Icon !== undefined && <Icon size={13} aria-hidden />}
    {label}
  </StyledDelta>
);

const StyledEmptyState = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} 0;
`;

const StyledEmptyTitle = styled.p`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledEmptyDescription = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.5;
  margin: 0;
`;

export type BilanPulseEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export const BilanPulseEmptyState = ({
  title,
  description,
  action,
}: BilanPulseEmptyStateProps) => (
  <StyledEmptyState>
    <StyledEmptyTitle>{title}</StyledEmptyTitle>
    {description !== undefined && (
      <StyledEmptyDescription>{description}</StyledEmptyDescription>
    )}
    {action}
  </StyledEmptyState>
);

export type BilanPulseErrorStateProps = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

export const BilanPulseErrorState = ({
  message,
  retryLabel,
  onRetry,
}: BilanPulseErrorStateProps) => (
  <StyledEmptyState role="status">
    <StyledEmptyTitle>{message}</StyledEmptyTitle>
    <Button
      title={retryLabel}
      ariaLabel={retryLabel}
      size="small"
      variant="secondary"
      onClick={onRetry}
    />
  </StyledEmptyState>
);

const StyledSkeletonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSkeletonLine = styled.div`
  animation: bilan-pulse-shimmer 1.6s ease-in-out infinite;
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};

  @keyframes bilan-pulse-shimmer {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.55;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.7;
  }
`;

export const BilanPulseSkeleton = () => (
  <StyledSkeletonGroup aria-hidden>
    <StyledSkeletonLine style={{ height: 38, width: '58%' }} />
    <StyledSkeletonLine style={{ height: 12, width: '34%' }} />
    <StyledSkeletonLine style={{ height: 110, width: '100%' }} />
  </StyledSkeletonGroup>
);

export const BilanPulseCard = ({
  title,
  Icon,
  span,
  tone = 'default',
  meta,
  action,
  testId,
  children,
}: BilanPulseCardProps) => (
  <StyledCard
    span={span}
    tone={tone}
    className={tone === 'default' ? undefined : 'dark'}
    aria-label={title}
    data-testid={testId}
    data-tone={tone}
  >
    {tone !== 'default' && <StyledCardGlow tone={tone} aria-hidden />}
    <StyledHeader>
      <StyledTitleGroup>
        <StyledIcon>
          <Icon size={16} aria-hidden />
        </StyledIcon>
        <StyledTitle>{title}</StyledTitle>
      </StyledTitleGroup>
      {(meta !== undefined || action !== undefined) && (
        <StyledHeaderAside>
          {meta !== undefined && <StyledMeta>{meta}</StyledMeta>}
          {action !== undefined && (
            <StyledActionLink to={action.to}>
              {action.label}
              <IconArrowUpRight size={12} aria-hidden />
            </StyledActionLink>
          )}
        </StyledHeaderAside>
      )}
    </StyledHeader>
    <StyledBody>{children}</StyledBody>
    {tone !== 'default' && <StyledCardRim aria-hidden />}
  </StyledCard>
);
