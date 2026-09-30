import { getFileEmbedKind } from '@/blocknote-editor/utils/getFileEmbedKind';
import { describe, expect, it } from '@jest/globals';

describe('getFileEmbedKind', () => {
  it.each([
    ['IMAGE', 'image'],
    ['VIDEO', 'video'],
    ['AUDIO', 'audio'],
    ['TEXT_DOCUMENT', 'link'],
    ['SPREADSHEET', 'link'],
    ['PRESENTATION', 'link'],
    ['ARCHIVE', 'link'],
    ['OTHER', 'link'],
  ] as const)('maps %s to %s', (fileCategory, expectedKind) => {
    expect(getFileEmbedKind(fileCategory)).toBe(expectedKind);
  });
});
