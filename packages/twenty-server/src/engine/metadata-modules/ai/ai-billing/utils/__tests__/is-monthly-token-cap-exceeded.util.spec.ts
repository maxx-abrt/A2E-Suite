import { isMonthlyTokenCapExceeded } from 'src/engine/metadata-modules/ai/ai-billing/utils/is-monthly-token-cap-exceeded.util';

describe('isMonthlyTokenCapExceeded', () => {
  it('fails open when no cap is configured', () => {
    expect(
      isMonthlyTokenCapExceeded({ usedTokens: 10_000, capTokens: null }),
    ).toBe(false);
    expect(
      isMonthlyTokenCapExceeded({ usedTokens: 10_000, capTokens: undefined }),
    ).toBe(false);
    expect(
      isMonthlyTokenCapExceeded({ usedTokens: 10_000, capTokens: 0 }),
    ).toBe(false);
  });

  it('preserves the count-0 no-op', () => {
    expect(isMonthlyTokenCapExceeded({ usedTokens: 0, capTokens: 1_000 })).toBe(
      false,
    );
  });

  it('stays within the cap below the limit', () => {
    expect(
      isMonthlyTokenCapExceeded({ usedTokens: 999, capTokens: 1_000 }),
    ).toBe(false);
  });

  it('trips at the limit and above', () => {
    expect(
      isMonthlyTokenCapExceeded({ usedTokens: 1_000, capTokens: 1_000 }),
    ).toBe(true);
    expect(
      isMonthlyTokenCapExceeded({ usedTokens: 1_001, capTokens: 1_000 }),
    ).toBe(true);
  });
});
