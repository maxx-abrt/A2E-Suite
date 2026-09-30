import { describe, expect, it } from '@jest/globals';

import { getRecordViewEmbedExportText } from '@/blocknote-editor/utils/getRecordViewEmbedExportText';

describe('getRecordViewEmbedExportText', () => {
  it('exports the view name when configured', () => {
    expect(getRecordViewEmbedExportText('Tasks by project')).toBe(
      'Tasks by project',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(getRecordViewEmbedExportText('  Tasks  ')).toBe('Tasks');
  });

  it('exports nothing for an unconfigured embed', () => {
    expect(getRecordViewEmbedExportText('')).toBeNull();
    expect(getRecordViewEmbedExportText('   ')).toBeNull();
  });
});
