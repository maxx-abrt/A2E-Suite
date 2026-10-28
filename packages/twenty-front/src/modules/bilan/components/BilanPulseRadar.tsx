import { styled } from '@linaria/react';
import { useId, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { BILAN_PULSE_PALETTE } from '@/bilan/constants/BilanPulsePalette';
import { formatBilanMoney } from '@/bilan/utils/formatBilanPulse';

type BilanPulseRadarProps = {
  values: number[];
  labels: string[];
  currencyCode: string;
  locale: string;
  ariaLabel: string;
};

const RADAR_SIZE = 320;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 118;
const RADAR_LABEL_RADIUS = 139;

const StyledRadar = styled.div`
  margin: 0 auto;
  max-width: ${RADAR_SIZE}px;
  position: relative;
  width: 100%;
`;

const StyledRadarTooltip = styled.div`
  background: ${themeCssVariables.background.invertedPrimary};
  border: 1px solid ${themeCssVariables.border.color.secondaryInverted};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  color: ${themeCssVariables.font.color.inverted};
  display: flex;
  flex-direction: column;
  gap: 2px;
  left: 50%;
  min-width: 138px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  pointer-events: none;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  z-index: 1;
`;

const StyledRadarTooltipLabel = styled.span`
  color: ${themeCssVariables.font.color.inverted};
  font-size: ${themeCssVariables.font.size.xs};
  opacity: 0.7;
`;

const StyledRadarTooltipValue = styled.span`
  color: ${themeCssVariables.font.color.inverted};
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const buildClosedSmoothPath = (points: [number, number][]): string => {
  const count = points.length;

  if (count === 0) {
    return '';
  }

  const tension = 0.16;
  let path = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;

  for (let index = 0; index < count; index += 1) {
    const previousPoint = points[(index - 1 + count) % count];
    const currentPoint = points[index];
    const nextPoint = points[(index + 1) % count];
    const followingPoint = points[(index + 2) % count];

    path += `C${(
      currentPoint[0] +
      (nextPoint[0] - previousPoint[0]) * tension
    ).toFixed(2)},${(
      currentPoint[1] +
      (nextPoint[1] - previousPoint[1]) * tension
    ).toFixed(2)} ${(
      nextPoint[0] -
      (followingPoint[0] - currentPoint[0]) * tension
    ).toFixed(2)},${(
      nextPoint[1] -
      (followingPoint[1] - currentPoint[1]) * tension
    ).toFixed(2)} ${nextPoint[0].toFixed(2)},${nextPoint[1].toFixed(2)}`;
  }

  return `${path}Z`;
};

const buildRadarPoints = (values: number[]): [number, number][] => {
  const maxValue = Math.max(1, ...values);

  return values.map((value, index) => {
    const ratio = 0.16 + (value / maxValue) * 0.84;
    const angle = -Math.PI / 2 + (index / values.length) * Math.PI * 2;

    return [
      RADAR_CENTER + Math.cos(angle) * RADAR_RADIUS * ratio,
      RADAR_CENTER + Math.sin(angle) * RADAR_RADIUS * ratio,
    ];
  });
};

export const BilanPulseRadar = ({
  values,
  labels,
  currencyCode,
  locale,
  ariaLabel,
}: BilanPulseRadarProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');
  const count = Math.min(values.length, labels.length);

  if (count === 0) {
    return null;
  }

  const visibleValues = values.slice(0, count);
  const visibleLabels = labels.slice(0, count);
  const radarPoints = buildRadarPoints(visibleValues);
  const shape = buildClosedSmoothPath(radarPoints);
  const hoveredPoint = hoveredIndex === null ? null : radarPoints[hoveredIndex];

  const handlePointerMove = (event: ReactPointerEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement;

    if (svg === null) {
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const scale = RADAR_SIZE / bounds.width;
    const x = (event.clientX - bounds.left) * scale - RADAR_CENTER;
    const y = (event.clientY - bounds.top) * scale - RADAR_CENTER;

    if (Math.hypot(x, y) < RADAR_RADIUS * 0.18) {
      setHoveredIndex(null);
      return;
    }

    let angle = Math.atan2(y, x) + Math.PI / 2;

    if (angle < 0) {
      angle += Math.PI * 2;
    }

    setHoveredIndex(Math.round((angle / (Math.PI * 2)) * count) % count);
  };

  return (
    <StyledRadar>
      <svg
        width="100%"
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <radialGradient id={`${gradientId}-fill`} cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              style={{
                stopColor: BILAN_PULSE_PALETTE.cashIncome,
                stopOpacity: 0.05,
              }}
            />
            <stop
              offset="100%"
              style={{
                stopColor: BILAN_PULSE_PALETTE.cashIncome,
                stopOpacity: 0.16,
              }}
            />
          </radialGradient>
        </defs>
        {[0.33, 0.66, 1].map((ratio) => (
          <circle
            key={ratio}
            cx={RADAR_CENTER}
            cy={RADAR_CENTER}
            r={RADAR_RADIUS * ratio}
            fill="none"
            strokeWidth={1}
            style={{ stroke: themeCssVariables.border.color.light }}
          />
        ))}
        {visibleLabels.map((label, index) => {
          const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
          const labelX = RADAR_CENTER + Math.cos(angle) * RADAR_LABEL_RADIUS;
          const labelY = RADAR_CENTER + Math.sin(angle) * RADAR_LABEL_RADIUS;

          return (
            <g key={label}>
              <line
                x1={RADAR_CENTER + Math.cos(angle) * RADAR_RADIUS * 0.2}
                y1={RADAR_CENTER + Math.sin(angle) * RADAR_RADIUS * 0.2}
                x2={RADAR_CENTER + Math.cos(angle) * RADAR_RADIUS}
                y2={RADAR_CENTER + Math.sin(angle) * RADAR_RADIUS}
                strokeWidth={1}
                style={{ stroke: themeCssVariables.border.color.light }}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                style={{ fill: themeCssVariables.font.color.tertiary }}
              >
                {label}
              </text>
            </g>
          );
        })}
        <path
          d={shape}
          strokeWidth={2.2}
          strokeLinejoin="round"
          style={{
            fill: `url(#${gradientId}-fill)`,
            stroke: BILAN_PULSE_PALETTE.cashIncome,
          }}
        />
        <circle
          cx={RADAR_CENTER}
          cy={RADAR_CENTER}
          r={4}
          style={{
            fill: themeCssVariables.background.primary,
            stroke: themeCssVariables.border.color.light,
          }}
          strokeWidth={1}
        />
        {hoveredPoint !== null && (
          <circle
            cx={hoveredPoint[0]}
            cy={hoveredPoint[1]}
            r={4.5}
            strokeWidth={2}
            style={{
              fill: BILAN_PULSE_PALETTE.cashIncome,
              stroke: themeCssVariables.background.primary,
            }}
          />
        )}
        <rect
          width={RADAR_SIZE}
          height={RADAR_SIZE}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoveredIndex(null)}
        />
      </svg>
      {hoveredIndex !== null && (
        <StyledRadarTooltip>
          <StyledRadarTooltipLabel>
            {visibleLabels[hoveredIndex]}
          </StyledRadarTooltipLabel>
          <StyledRadarTooltipValue>
            {formatBilanMoney(
              visibleValues[hoveredIndex],
              currencyCode,
              locale,
            )}
          </StyledRadarTooltipValue>
        </StyledRadarTooltip>
      )}
    </StyledRadar>
  );
};
