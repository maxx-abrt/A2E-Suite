// Fractional order keys, local port of twenty-shared's
// generateFractionalIndexBetween (CC0 fractional-indexing reference,
// Greenspan/Figma 2017). The front-component sandbox only links
// twenty-client-sdk/twenty-sdk plus declared shared dependencies, and this
// app does not declare twenty-shared — same constraint as field-vocabulary.ts
// porting TagColor. Keep byte-compatible with the twenty-shared util so a
// position written here sorts against positions written server-side.

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const INT_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const ZERO = DIGITS[0];
const LAST = DIGITS[DIGITS.length - 1];

const digitValues = new Uint8Array(256);
for (let index = 0; index < DIGITS.length; index++) {
  digitValues[DIGITS.charCodeAt(index)] = index;
}
const headValues = new Uint8Array(256);
for (let index = 0; index < INT_DIGITS.length; index++) {
  headValues[INT_DIGITS.charCodeAt(index)] = index;
}

const HALF_HEAD_COUNT = INT_DIGITS.length / 2;

const getIntegerLength = (head: string): number => {
  const headIndex = headValues[head.charCodeAt(0)];

  if (INT_DIGITS[headIndex] !== head) {
    throw new Error(`invalid order key head: ${head}`);
  }

  return headIndex < HALF_HEAD_COUNT
    ? HALF_HEAD_COUNT - headIndex + 1
    : headIndex - HALF_HEAD_COUNT + 2;
};

const getIntegerPart = (key: string): string => {
  const integerPartLength = getIntegerLength(key[0]);

  if (integerPartLength > key.length) {
    throw new Error(`invalid order key: ${key}`);
  }

  return key.slice(0, integerPartLength);
};

// Midpoint of two digit strings; `previous` may be empty, `next` may be null.
const midpoint = (previous: string, next: string | null): string => {
  if (next !== null) {
    let commonLength = 0;

    while ((previous[commonLength] ?? ZERO) === next[commonLength]) {
      commonLength += 1;
    }

    if (commonLength > 0) {
      return (
        next.slice(0, commonLength) +
        midpoint(previous.slice(commonLength), next.slice(commonLength))
      );
    }
  }

  const previousValue = previous ? digitValues[previous.charCodeAt(0)] : 0;
  const nextValue =
    next !== null ? digitValues[next.charCodeAt(0)] : DIGITS.length;

  if (nextValue - previousValue > 1) {
    return DIGITS[Math.round(0.5 * (previousValue + nextValue))];
  }

  if (next !== null && next.length > 1) {
    return next.slice(0, 1);
  }

  return DIGITS[previousValue] + midpoint(previous.slice(1), null);
};

const incrementInteger = (integerPart: string): string | null => {
  const head = integerPart[0];
  let trailing = '';

  for (let index = integerPart.length - 1; index >= 1; index--) {
    const nextValue = digitValues[integerPart.charCodeAt(index)] + 1;

    if (nextValue === DIGITS.length) {
      trailing = ZERO + trailing;
    } else {
      return head + integerPart.slice(1, index) + DIGITS[nextValue] + trailing;
    }
  }

  const headIndex = headValues[head.charCodeAt(0)];

  if (headIndex === INT_DIGITS.length - 1) {
    return null;
  }

  const nextHead = INT_DIGITS[headIndex + 1];
  const lengthDelta = getIntegerLength(nextHead) - getIntegerLength(head);

  return (
    nextHead +
    (lengthDelta > 0
      ? trailing + ZERO
      : lengthDelta < 0
        ? trailing.slice(1)
        : trailing)
  );
};

const decrementInteger = (integerPart: string): string | null => {
  const head = integerPart[0];
  let trailing = '';

  for (let index = integerPart.length - 1; index >= 1; index--) {
    const nextValue = digitValues[integerPart.charCodeAt(index)] - 1;

    if (nextValue === -1) {
      trailing = LAST + trailing;
    } else {
      return head + integerPart.slice(1, index) + DIGITS[nextValue] + trailing;
    }
  }

  const headIndex = headValues[head.charCodeAt(0)];

  if (headIndex === 0) {
    return null;
  }

  const nextHead = INT_DIGITS[headIndex - 1];
  const lengthDelta = getIntegerLength(nextHead) - getIntegerLength(head);

  return (
    nextHead +
    (lengthDelta > 0
      ? trailing + LAST
      : lengthDelta < 0
        ? trailing.slice(1)
        : trailing)
  );
};

export type FractionalIndexBounds = {
  previous?: string;
  next?: string;
};

export const generateFractionalIndexBetween = (
  bounds: FractionalIndexBounds,
): string => {
  const previous = bounds.previous ?? null;
  const next = bounds.next ?? null;

  if (previous !== null && next !== null && previous >= next) {
    throw new Error(
      'generateFractionalIndexBetween: previous must sort before next',
    );
  }

  if (previous === null) {
    if (next === null) {
      return INT_DIGITS[HALF_HEAD_COUNT] + ZERO;
    }

    const nextIntegerPart = getIntegerPart(next);
    const nextFractionPart = next.slice(nextIntegerPart.length);

    if (nextIntegerPart < next) {
      return nextIntegerPart;
    }

    const decremented = decrementInteger(nextIntegerPart);

    if (decremented === null) {
      return nextIntegerPart + midpoint('', nextFractionPart);
    }

    return decremented;
  }

  if (next === null) {
    const previousIntegerPart = getIntegerPart(previous);
    const previousFractionPart = previous.slice(previousIntegerPart.length);
    const incremented = incrementInteger(previousIntegerPart);

    return (
      incremented ?? previousIntegerPart + midpoint(previousFractionPart, null)
    );
  }

  const previousIntegerPart = getIntegerPart(previous);
  const nextIntegerPart = getIntegerPart(next);

  if (previousIntegerPart === nextIntegerPart) {
    return (
      previousIntegerPart +
      midpoint(
        previous.slice(previousIntegerPart.length),
        next.slice(nextIntegerPart.length),
      )
    );
  }

  const incremented = incrementInteger(previousIntegerPart);

  if (incremented !== null && incremented < next) {
    return incremented;
  }

  return (
    previousIntegerPart +
    midpoint(previous.slice(previousIntegerPart.length), null)
  );
};

// Position used by every "append at the end of a sibling list" write in the
// browser (new root, new sub-document, drop onto a parent).
export const buildAppendPosition = (previousPosition?: string | null): string =>
  generateFractionalIndexBetween({ previous: previousPosition ?? undefined });
