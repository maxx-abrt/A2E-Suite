import { styled } from '@linaria/react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { BILAN_PULSE_PALETTE } from '@/bilan/constants/BilanPulsePalette';
import { useBilanElementSize } from '@/bilan/hooks/useBilanElementSize';
import { type BilanSpendingCategory } from '@/bilan/types/BilanPulse';
import {
  formatBilanMoney,
  formatBilanPercent,
} from '@/bilan/utils/formatBilanPulse';

type BilanPulseTreemapProps = {
  categories: BilanSpendingCategory[];
  currencyCode: string;
  locale: string;
};

type TreemapItem = BilanSpendingCategory & {
  area: number;
};

type TreemapRect = {
  id: string;
  name: string | null;
  amountMicros: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const TREEMAP_FALLBACK_SIZE = { width: 600, height: 300 };

const getTileColor = (categoryId: string, index: number): string =>
  categoryId === 'other'
    ? BILAN_PULSE_PALETTE.treemap[BILAN_PULSE_PALETTE.treemap.length - 1]
    : BILAN_PULSE_PALETTE.treemap[index % BILAN_PULSE_PALETTE.treemap.length];

const squarify = (
  items: BilanSpendingCategory[],
  x: number,
  y: number,
  width: number,
  height: number,
): TreemapRect[] => {
  const sortedItems = [...items].sort(
    (firstItem, secondItem) => secondItem.amountMicros - firstItem.amountMicros,
  );
  const total = sortedItems.reduce((sum, item) => sum + item.amountMicros, 0);

  if (total <= 0 || width <= 0 || height <= 0) {
    return [];
  }

  const scale = (width * height) / total;
  let remainingItems: TreemapItem[] = sortedItems.map((item) => ({
    ...item,
    area: item.amountMicros * scale,
  }));
  const rects: TreemapRect[] = [];

  const getWorstRatio = (row: TreemapItem[], length: number): number => {
    const rowArea = row.reduce((sum, item) => sum + item.area, 0);
    const maximumArea = Math.max(...row.map((item) => item.area));
    const minimumArea = Math.min(...row.map((item) => item.area));

    return Math.max(
      (length * length * maximumArea) / (rowArea * rowArea),
      (rowArea * rowArea) / (length * length * minimumArea),
    );
  };

  while (remainingItems.length > 0) {
    const length = Math.min(width, height);
    const row = [remainingItems[0]];
    let itemIndex = 1;

    while (
      itemIndex < remainingItems.length &&
      getWorstRatio([...row, remainingItems[itemIndex]], length) <=
        getWorstRatio(row, length)
    ) {
      row.push(remainingItems[itemIndex]);
      itemIndex += 1;
    }

    remainingItems = remainingItems.slice(itemIndex);

    const rowArea = row.reduce((sum, item) => sum + item.area, 0);

    if (width >= height) {
      const columnWidth = rowArea / height;
      let currentY = y;

      row.forEach((item) => {
        const itemHeight = item.area / columnWidth;

        rects.push({
          id: item.id,
          name: item.name,
          amountMicros: item.amountMicros,
          x,
          y: currentY,
          width: columnWidth,
          height: itemHeight,
        });
        currentY += itemHeight;
      });

      x += columnWidth;
      width -= columnWidth;
    } else {
      const rowHeight = rowArea / width;
      let currentX = x;

      row.forEach((item) => {
        const itemWidth = item.area / rowHeight;

        rects.push({
          id: item.id,
          name: item.name,
          amountMicros: item.amountMicros,
          x: currentX,
          y,
          width: itemWidth,
          height: rowHeight,
        });
        currentX += itemWidth;
      });

      y += rowHeight;
      height -= rowHeight;
    }
  }

  return rects;
};

const StyledTreemap = styled.div`
  height: 300px;
  position: relative;
  width: 100%;

  @media (max-width: 600px) {
    height: 260px;
  }
`;

const StyledTile = styled.div`
  background: linear-gradient(
    145deg,
    var(--bilan-tile-color) 0%,
    color-mix(
        in srgb,
        var(--bilan-tile-color) 78%,
        ${BILAN_PULSE_PALETTE.inkBlack}
      )
      100%
  );
  border: 1px solid ${BILAN_PULSE_PALETTE.tileBorder};
  border-radius: ${themeCssVariables.border.radius.md};
  box-sizing: border-box;
  color: ${BILAN_PULSE_PALETTE.cream};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: ${themeCssVariables.spacing[2]};
  position: absolute;
  transition:
    box-shadow calc(${themeCssVariables.animation.duration.fast} * 1s) ease,
    filter calc(${themeCssVariables.animation.duration.fast} * 1s) ease,
    transform calc(${themeCssVariables.animation.duration.fast} * 1s) ease;

  &:hover {
    box-shadow: ${BILAN_PULSE_PALETTE.tileShadow};
    filter: brightness(1.07);
    transform: translateY(-1px);
  }
`;

const StyledTileLabel = styled.span`
  align-items: center;
  color: ${BILAN_PULSE_PALETTE.creamMuted};
  display: flex;
  font-size: 9px;
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: 5px;
  letter-spacing: 0.04em;
  min-width: 0;
  text-transform: uppercase;

  & > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const StyledTileDot = styled.i`
  background: color-mix(
    in srgb,
    var(--bilan-tile-color) 45%,
    ${BILAN_PULSE_PALETTE.tileDotMixTarget}
  );
  border-radius: ${themeCssVariables.border.radius.pill};
  flex-shrink: 0;
  height: 6px;
  width: 6px;
`;

const StyledTileBottom = styled.span`
  align-items: flex-end;
  display: flex;
  gap: 4px;
  justify-content: space-between;
  min-width: 0;
`;

const StyledTileValue = styled.span<{ fontSize: number }>`
  color: ${BILAN_PULSE_PALETTE.cream};
  font-size: ${({ fontSize }) => fontSize}px;
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: -0.04em;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledTileShare = styled.span`
  background: ${BILAN_PULSE_PALETTE.tileChip};
  border-radius: 4px;
  color: ${BILAN_PULSE_PALETTE.cream};
  flex-shrink: 0;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1;
  padding: 3px 4px;
`;

const StyledTooltip = styled.div`
  background: ${themeCssVariables.background.invertedPrimary};
  border: 1px solid ${themeCssVariables.border.color.secondaryInverted};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  color: ${themeCssVariables.font.color.inverted};
  display: flex;
  flex-direction: column;
  gap: 2px;
  left: 50%;
  min-width: 150px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  pointer-events: none;
  position: absolute;
  top: 8px;
  transform: translateX(-50%);
  z-index: 2;
`;

const StyledTooltipTitle = styled.span`
  color: ${themeCssVariables.font.color.inverted};
  font-size: ${themeCssVariables.font.size.xs};
  opacity: 0.7;
`;

const StyledTooltipRow = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.inverted};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
`;

export const BilanPulseTreemap = ({
  categories,
  currencyCode,
  locale,
}: BilanPulseTreemapProps) => {
  const { i18n } = useLingui();
  const [setTreemapElement, size] = useBilanElementSize(TREEMAP_FALLBACK_SIZE);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(
    null,
  );
  const total = categories.reduce(
    (sum, category) => sum + category.amountMicros,
    0,
  );
  const rects = squarify(categories, 0, 0, size.width, size.height);
  const hoveredCategory = categories.find(
    (category) => category.id === hoveredCategoryId,
  );

  return (
    <StyledTreemap
      ref={setTreemapElement}
      role="list"
      aria-label={i18n._(msg`Spending by category`)}
      onPointerLeave={() => setHoveredCategoryId(null)}
    >
      {hoveredCategory !== undefined && (
        <StyledTooltip aria-hidden>
          <StyledTooltipTitle>
            {hoveredCategory.name ?? i18n._(msg`Uncategorized`)}
          </StyledTooltipTitle>
          <StyledTooltipRow>
            <span>{i18n._(msg`Amount`)}</span>
            <span>
              {formatBilanMoney(
                hoveredCategory.amountMicros,
                currencyCode,
                locale,
              )}
            </span>
          </StyledTooltipRow>
          <StyledTooltipRow>
            <span>{i18n._(msg`Share`)}</span>
            <span>
              {formatBilanPercent(
                (hoveredCategory.amountMicros / Math.max(1, total)) * 100,
                locale,
                1,
              )}
            </span>
          </StyledTooltipRow>
        </StyledTooltip>
      )}
      {rects.map((rect, index) => {
        const category = categories.find((item) => item.id === rect.id);

        if (category === undefined) {
          return null;
        }

        const tileColor = getTileColor(rect.id, index);
        const width = Math.max(0, rect.width - 4);
        const height = Math.max(0, rect.height - 4);
        const share = (rect.amountMicros / Math.max(1, total)) * 100;
        const showName = width >= 68 && height >= 44;
        const showValue = width >= 86 && height >= 58;
        const showShare = width >= 116 && height >= 64;
        const valueFontSize = Math.min(24, Math.max(13, width * 0.11));

        return (
          <StyledTile
            key={rect.id}
            role="listitem"
            aria-label={`${rect.name ?? i18n._(msg`Uncategorized`)}: ${formatBilanMoney(
              rect.amountMicros,
              currencyCode,
              locale,
            )} (${formatBilanPercent(share, locale, 1)})`}
            style={{
              left: rect.x + 2,
              top: rect.y + 2,
              width,
              height,
              ['--bilan-tile-color' as string]: tileColor,
            }}
            onPointerEnter={() => setHoveredCategoryId(rect.id)}
          >
            {showName && (
              <StyledTileLabel>
                <StyledTileDot />
                <span>{rect.name ?? i18n._(msg`Uncategorized`)}</span>
              </StyledTileLabel>
            )}
            {showValue && (
              <StyledTileBottom>
                <StyledTileValue fontSize={valueFontSize}>
                  {formatBilanMoney(rect.amountMicros, currencyCode, locale)}
                </StyledTileValue>
                {showShare && (
                  <StyledTileShare>
                    {formatBilanPercent(share, locale, 1)}
                  </StyledTileShare>
                )}
              </StyledTileBottom>
            )}
          </StyledTile>
        );
      })}
    </StyledTreemap>
  );
};
