import { formatHomeWidgetDayLabel } from '@/home-dashboard/utils/formatHomeWidgetDayLabel';
import { i18n } from '@lingui/core';

describe('formatHomeWidgetDayLabel', () => {
  afterEach(() => {
    i18n.activate('en');
  });
  it('formats a valid timestamp', () => {
    const label = formatHomeWidgetDayLabel('2026-09-18T10:00:00.000Z');

    expect(label).toContain('18');
    expect(label).toContain('Sep');
  });

  it('returns an empty string for an invalid timestamp', () => {
    expect(formatHomeWidgetDayLabel('not-a-date')).toBe('');
  });

  it('uses the chosen interface language for shared deadline labels', () => {
    i18n.load('fr-FR', {});
    i18n.activate('fr-FR');
    expect(formatHomeWidgetDayLabel('2026-09-18T10:00:00Z')).toBe('18 sept.');
  });
});
