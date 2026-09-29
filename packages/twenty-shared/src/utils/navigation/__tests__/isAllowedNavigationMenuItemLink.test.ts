import { isAllowedNavigationMenuItemLink } from '@/utils/navigation/isAllowedNavigationMenuItemLink';

describe('isAllowedNavigationMenuItemLink', () => {
  it.each([
    'https://twenty.com',
    'http://localhost:3000',
    'twenty.com',
    '/calendar',
    '/drive',
    '/discussions',
    '/inbox',
    '/chat',
    '/home',
    '/chat/thread-42',
  ])('should allow %s', (link) => {
    expect(isAllowedNavigationMenuItemLink(link)).toBe(true);
  });

  it.each([
    '//evil',
    '//evil.com',
    'javascript:alert(1)',
    '/settings',
    '/driveevil',
    '/drive/../evil',
    'not a link',
    '',
  ])('should reject %s', (link) => {
    expect(isAllowedNavigationMenuItemLink(link)).toBe(false);
  });
});
