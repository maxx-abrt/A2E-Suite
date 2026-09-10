import { generateFractionalIndexBetween } from '../generateFractionalIndexBetween.util';

const sortBefore = (first: string, second: string): void => {
  expect(first < second).toBe(true);
};

const initialKey = (): string => generateFractionalIndexBetween({});

describe('generateFractionalIndexBetween', () => {
  it('returns an initial key when no bounds are given', () => {
    expect(initialKey()).toBe('a0');
  });

  it('throws when bounds are inverted or equal', () => {
    expect(() =>
      generateFractionalIndexBetween({ previous: 'b00', next: 'a0' }),
    ).toThrow();
    expect(() =>
      generateFractionalIndexBetween({ previous: 'a0', next: 'a0' }),
    ).toThrow('generateFractionalIndexBetween: previous must sort before next');
  });

  it('generates an index after the last element when only previous is given', () => {
    const index = generateFractionalIndexBetween({ previous: 'a0' });

    sortBefore('a0', index);
  });

  it('generates an index before the first element when only next is given', () => {
    const index = generateFractionalIndexBetween({ next: 'a0' });

    sortBefore(index, 'a0');
  });

  it('generates a valid index between two bounds sharing an integer part', () => {
    const index = generateFractionalIndexBetween({
      previous: 'a0a',
      next: 'a0b',
    });

    sortBefore('a0a', index);
    sortBefore(index, 'a0b');
  });

  it('keeps keys short across two thousand genuinely interleaved inserts', () => {
    const keys: string[] = [initialKey()];
    let maximumLength = 0;

    for (let insertCount = 0; insertCount < 2000; insertCount++) {
      // Deterministic pseudo-random insertion point: spreads inserts over the
      // whole list instead of always touching one boundary.
      const targetIndex = (insertCount * 7919) % (keys.length + 1);
      const previous = keys[targetIndex - 1];
      const next = keys[targetIndex];

      const generated = generateFractionalIndexBetween({ previous, next });

      if (previous !== undefined) {
        sortBefore(previous, generated);
      }
      if (next !== undefined) {
        sortBefore(generated, next);
      }

      keys.splice(targetIndex, 0, generated);
      maximumLength = Math.max(maximumLength, generated.length);
    }

    expect([...keys].sort()).toEqual(keys);
    // Interleaved access (drag-reorder of a document tree) converges to
    // compact keys; 2000 inserts stay well under any storage concern.
    expect(maximumLength).toBeLessThan(12);
  });

  it('survives three thousand sequential appends at the last position', () => {
    let previous: string | undefined = initialKey();
    let lastGenerated = '';
    let maximumLength = 0;

    for (let insertCount = 0; insertCount < 3000; insertCount++) {
      lastGenerated = generateFractionalIndexBetween({ previous });

      sortBefore(previous as string, lastGenerated);
      previous = lastGenerated;
      maximumLength = Math.max(maximumLength, lastGenerated.length);
    }

    expect(maximumLength).toBeLessThan(8);
  });

  it('survives three thousand sequential prepends at the first position', () => {
    let next: string | undefined = initialKey();
    let lastGenerated = '';
    let maximumLength = 0;

    for (let insertCount = 0; insertCount < 3000; insertCount++) {
      lastGenerated = generateFractionalIndexBetween({ next });

      sortBefore(lastGenerated, next as string);
      next = lastGenerated;
      maximumLength = Math.max(maximumLength, lastGenerated.length);
    }

    expect(maximumLength).toBeLessThan(8);
  });
});
