import { getLinkFaviconUrl } from '../getLinkFaviconUrl';

describe('getLinkFaviconUrl', () => {
  it.each([
    ['https://linkedin.com/company/twenty', 'linkedin.com'],
    ['http://example.com/path?query=value#section', 'example.com'],
    ['example.com/path', 'example.com'],
    ['www.example.com', 'example.com'],
    ['  https://example.com/path  ', 'example.com'],
    ['https://xn--bcher-kva.de/page', 'xn--bcher-kva.de'],
  ])('resolves the hostname of %s', (link, hostname) => {
    expect(getLinkFaviconUrl(link)).toBe(
      `https://twenty-icons.com/${hostname}`,
    );
  });

  it.each([
    null,
    undefined,
    '',
    '   ',
    '/discussions',
    '/objects/tasks',
    '/objects/example.com',
    '//example.com/path',
    './example.com',
    '../example.com',
    '?redirect=example.com',
    '#example.com',
    'discussions',
    'objects/tasks',
    'https://discussions',
    'http://localhost:3000/tasks',
    'https://',
    'not a domain.com',
  ])('does not request a favicon for %s', (link) => {
    expect(getLinkFaviconUrl(link)).toBeUndefined();
  });
});
