import { getLinkNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/link/utils/getLinkNavigationMenuItemComputedLink';

describe('getLinkNavigationMenuItemComputedLink', () => {
  it.each(['/calendar', '/drive', '/discussions', '/inbox', '/chat', '/home'])(
    'should return the allow-listed host route %s unchanged',
    (link) => {
      expect(getLinkNavigationMenuItemComputedLink({ link })).toBe(link);
    },
  );

  it('should keep a nested allow-listed route relative', () => {
    expect(
      getLinkNavigationMenuItemComputedLink({ link: '/chat/thread-42' }),
    ).toBe('/chat/thread-42');
  });

  it('should keep the https:// prefixing for absolute external links', () => {
    expect(
      getLinkNavigationMenuItemComputedLink({ link: 'https://twenty.com' }),
    ).toBe('https://twenty.com');
    expect(
      getLinkNavigationMenuItemComputedLink({ link: 'http://twenty.com' }),
    ).toBe('http://twenty.com');
  });

  it('should prefix bare external links with https://', () => {
    expect(getLinkNavigationMenuItemComputedLink({ link: 'twenty.com' })).toBe(
      'https://twenty.com',
    );
  });

  it('should not treat a non-allow-listed path as internal', () => {
    expect(getLinkNavigationMenuItemComputedLink({ link: '/settings' })).toBe(
      'https:///settings',
    );
    expect(getLinkNavigationMenuItemComputedLink({ link: '//evil.com' })).toBe(
      'https:////evil.com',
    );
  });

  it('should return an empty string when the link is empty', () => {
    expect(getLinkNavigationMenuItemComputedLink({ link: '' })).toBe('');
    expect(getLinkNavigationMenuItemComputedLink({ link: null })).toBe('');
    expect(getLinkNavigationMenuItemComputedLink({})).toBe('');
  });
});
