import { formatHomeWidgetDayLabel } from '@/home-dashboard/utils/formatHomeWidgetDayLabel';

describe('formatHomeWidgetDayLabel', () => {
  it('formats a valid timestamp', () => {
    const label = formatHomeWidgetDayLabel('2026-09-18T10:00:00.000Z');

    expect(label).toContain('18');
    expect(label).toContain('Sep');
  });

  it('returns an empty string for an invalid timestamp', () => {
    expect(formatHomeWidgetDayLabel('not-a-date')).toBe('');
  });
});
