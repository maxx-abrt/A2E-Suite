import { describe, expect, it } from '@jest/globals';

import { getDateReminderMentionExportText } from '@/blocknote-editor/utils/getDateReminderMentionExportText';

describe('getDateReminderMentionExportText', () => {
  it('exports the date label', () => {
    expect(getDateReminderMentionExportText('Mar 10, 2026, 9:30 AM')).toBe(
      'Mar 10, 2026, 9:30 AM',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(getDateReminderMentionExportText('  Mar 10, 2026  ')).toBe(
      'Mar 10, 2026',
    );
  });

  it('exports nothing for an unconfigured mention', () => {
    expect(getDateReminderMentionExportText('')).toBeNull();
    expect(getDateReminderMentionExportText('   ')).toBeNull();
  });
});
