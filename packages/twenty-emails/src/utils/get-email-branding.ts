export const getEmailBranding = (publicUrl?: string) => {
  if (!publicUrl) return {};
  try {
    const { origin, protocol } = new URL(publicUrl);
    if (protocol !== 'https:' && protocol !== 'http:') return {};
    return {
      homeUrl: origin,
      logoUrl: new URL('/branding/suite.png', origin).href,
    };
  } catch {
    return {};
  }
};
