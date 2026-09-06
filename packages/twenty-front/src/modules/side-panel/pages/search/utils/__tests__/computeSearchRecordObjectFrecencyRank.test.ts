import { type SearchRecordObjectFrecency } from '@/side-panel/pages/search/states/searchRecordsFrecencyByObjectState';
import { computeSearchRecordObjectFrecencyRank } from '@/side-panel/pages/search/utils/computeSearchRecordObjectFrecencyRank';

const HOUR_MS = 60 * 60 * 1000;

describe('computeSearchRecordObjectFrecencyRank', () => {
  it('returns 0 for entries with no usage', () => {
    expect(
      computeSearchRecordObjectFrecencyRank({
        frecency: undefined,
        nowTimestamp: 1_000,
      }),
    ).toBe(0);
  });

  it('ranks heavier use higher for the same recency', () => {
    const nowTimestamp = 10_000 * HOUR_MS;
    const singleUse: SearchRecordObjectFrecency = {
      lastUsedAtTimestamp: nowTimestamp,
      useCount: 1,
    };
    const heavyUse: SearchRecordObjectFrecency = {
      lastUsedAtTimestamp: nowTimestamp,
      useCount: 10,
    };

    expect(
      computeSearchRecordObjectFrecencyRank({
        frecency: heavyUse,
        nowTimestamp,
      }),
    ).toBeGreaterThan(
      computeSearchRecordObjectFrecencyRank({
        frecency: singleUse,
        nowTimestamp,
      }),
    );
  });

  it('ranks recent use higher than old use for the same count', () => {
    const nowTimestamp = 10_000 * HOUR_MS;
    const recent: SearchRecordObjectFrecency = {
      lastUsedAtTimestamp: nowTimestamp,
      useCount: 3,
    };
    const stale: SearchRecordObjectFrecency = {
      lastUsedAtTimestamp: nowTimestamp - 100 * HOUR_MS,
      useCount: 3,
    };

    expect(
      computeSearchRecordObjectFrecencyRank({ frecency: recent, nowTimestamp }),
    ).toBeGreaterThan(
      computeSearchRecordObjectFrecencyRank({ frecency: stale, nowTimestamp }),
    );
  });

  it('never returns a negative rank for clock skew', () => {
    expect(
      computeSearchRecordObjectFrecencyRank({
        frecency: { lastUsedAtTimestamp: 5_000 * HOUR_MS, useCount: 2 },
        nowTimestamp: 1_000 * HOUR_MS,
      }),
    ).toBeGreaterThan(0);
  });
});
