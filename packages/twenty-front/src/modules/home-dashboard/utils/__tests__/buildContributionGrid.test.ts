import {
  buildContributionGrid,
  countContributionGridActivities,
  getLocalDayKey,
  getStartOfWeek,
} from '@/home-dashboard/utils/buildContributionGrid';

const today = new Date(2026, 8, 18);

describe('getLocalDayKey', () => {
  it('formats the local calendar day with zero padding', () => {
    expect(getLocalDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('getStartOfWeek', () => {
  it('defaults to Monday', () => {
    expect(getStartOfWeek(today)).toEqual(new Date(2026, 8, 14));
  });

  it('supports Sunday as the first day', () => {
    expect(getStartOfWeek(today, 0)).toEqual(new Date(2026, 8, 13));
  });
});

describe('buildContributionGrid', () => {
  it('buckets timestamps per local day and pads days after today', () => {
    const weeks = buildContributionGrid({
      activityTimestamps: [
        new Date(2026, 8, 7, 10).toISOString(),
        new Date(2026, 8, 7, 16).toISOString(),
        new Date(2026, 8, 16, 9).toISOString(),
      ],
      today,
      weekCount: 2,
    });

    expect(weeks).toHaveLength(2);
    expect(weeks[0].days[0]).toEqual({
      date: '2026-09-07',
      count: 2,
      level: 4,
    });
    expect(weeks[0].days[6]).toEqual({
      date: '2026-09-13',
      count: 0,
      level: 0,
    });
    expect(weeks[1].days[2]).toEqual({
      date: '2026-09-16',
      count: 1,
      level: 2,
    });
    expect(weeks[1].days[5]).toBeNull();
    expect(weeks[1].days[6]).toBeNull();
  });

  it('ignores timestamps outside the window and invalid dates', () => {
    const weeks = buildContributionGrid({
      activityTimestamps: [
        new Date(2026, 8, 1).toISOString(),
        new Date(2026, 8, 25).toISOString(),
        'not-a-date',
      ],
      today,
      weekCount: 2,
    });

    expect(countContributionGridActivities(weeks)).toBe(0);
    expect(weeks[0].days.every((cell) => cell?.level === 0)).toBe(true);
  });

  it('starts the grid on the first day of the week when configured', () => {
    const weeks = buildContributionGrid({
      activityTimestamps: [],
      today,
      weekCount: 1,
      firstDayOfWeek: 0,
    });

    expect(weeks[0].days[0]).toEqual({
      date: '2026-09-13',
      count: 0,
      level: 0,
    });
    expect(weeks[0].days[5]).toEqual({
      date: '2026-09-18',
      count: 0,
      level: 0,
    });
    expect(weeks[0].days[6]).toBeNull();
  });

  it('clamps an invalid week count to a single week', () => {
    const weeks = buildContributionGrid({
      activityTimestamps: [],
      today,
      weekCount: 0,
    });

    expect(weeks).toHaveLength(1);
  });
});
