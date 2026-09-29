import { isInternalNavigationMenuItemRoute } from '@/utils/navigation/isInternalNavigationMenuItemRoute';

describe('isInternalNavigationMenuItemRoute', () => {
  it.each(['/calendar', '/chat', '/discussions', '/drive', '/home', '/inbox'])(
    'should accept the allow-listed route %s',
    (link) => {
      expect(isInternalNavigationMenuItemRoute(link)).toBe(true);
    },
  );

  it('should accept a nested path under an allow-listed route', () => {
    expect(isInternalNavigationMenuItemRoute('/chat/thread-42')).toBe(true);
  });

  it('should accept query and hash suffixes on an allow-listed route', () => {
    expect(isInternalNavigationMenuItemRoute('/drive?folderId=abc')).toBe(true);
    expect(isInternalNavigationMenuItemRoute('/drive#section')).toBe(true);
  });

  it('should accept a trailing slash on an allow-listed route', () => {
    expect(isInternalNavigationMenuItemRoute('/discussions/')).toBe(true);
  });

  it('should trim surrounding whitespace before matching', () => {
    expect(isInternalNavigationMenuItemRoute('  /drive  ')).toBe(true);
  });

  it.each([
    '//evil',
    '//evil.com',
    'javascript:alert(1)',
    'https://evil.com',
    'http://evil.com',
    '/settings',
    '/driveevil',
    '/drive/../evil',
    'drive',
    '',
    'not a link',
  ])('should reject %s', (link) => {
    expect(isInternalNavigationMenuItemRoute(link)).toBe(false);
  });
});
