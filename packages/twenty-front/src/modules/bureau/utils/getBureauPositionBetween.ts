import { isDefined } from 'twenty-shared/utils';

// A position strictly between two neighbours, or `null` when there is no
// room left (equal/inverted neighbours or float precision exhausted).
export const getBureauPositionBetween = (
  previousPosition: number | undefined,
  nextPosition: number | undefined,
): number | null => {
  if (!isDefined(previousPosition) && !isDefined(nextPosition)) {
    return 0;
  }

  if (!isDefined(previousPosition)) {
    return (nextPosition as number) - 1;
  }

  if (!isDefined(nextPosition)) {
    return previousPosition + 1;
  }

  if (previousPosition >= nextPosition) {
    return null;
  }

  const middlePosition = (previousPosition + nextPosition) / 2;

  return middlePosition > previousPosition && middlePosition < nextPosition
    ? middlePosition
    : null;
};
