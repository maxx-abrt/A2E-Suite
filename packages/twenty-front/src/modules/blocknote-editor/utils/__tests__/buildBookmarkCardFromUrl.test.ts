import {
  buildBookmarkCardFromUrl,
  getBookmarkHostname,
} from '@/blocknote-editor/utils/buildBookmarkCardFromUrl';
import { describe, expect, it } from '@jest/globals';

describe('getBookmarkHostname', () => {
  it('returns the hostname without the www prefix', () => {
    expect(getBookmarkHostname('https://www.example.com/page')).toBe(
      'example.com',
    );
  });

  it('returns empty string for an invalid URL', () => {
    expect(getBookmarkHostname('not a url')).toBe('');
  });
});

describe('buildBookmarkCardFromUrl', () => {
  it('falls back to the hostname as the title', () => {
    expect(buildBookmarkCardFromUrl('https://www.example.com')).toEqual({
      url: 'https://www.example.com',
      title: 'example.com',
      hostname: 'example.com',
    });
  });

  it('keeps an explicit title over the hostname', () => {
    expect(
      buildBookmarkCardFromUrl('https://example.com', ' Agenda '),
    ).toMatchObject({ title: 'Agenda' });
  });

  it('rejects a URL without a resolvable hostname', () => {
    expect(buildBookmarkCardFromUrl('   ')).toBeNull();
    expect(buildBookmarkCardFromUrl('not a url')).toBeNull();
    expect(buildBookmarkCardFromUrl('https://')).toBeNull();
  });
});
