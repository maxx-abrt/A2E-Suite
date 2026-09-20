import { normalizeWeekStartDay } from '@/calendar/utils/normalizeWeekStartDay';

describe('normalizeWeekStartDay', () => {
  it.each([
    [0, 0],
    [1, 1],
    [6, 6],
    [-1, 1],
    [7, 1],
    [2.5, 1],
    [undefined, 1],
    [null, 1],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeWeekStartDay(input)).toBe(expected);
  });
});
