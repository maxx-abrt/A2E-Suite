import { isNonEmptyString } from '@sniptt/guards';

import { REACT_APP_SERVER_BASE_URL } from '~/config';

const AUTH_COOKIE_NAME = 'twenty-session';
const AUTH_COOKIE_SECURE_NAME = '__Host-twenty-session';

// The ws upgrade does not send credentials cross-origin; the token travels
// in the subscribe message instead. Reading the cookie client-side works
// only for the insecure name (the __Host- one is httpOnly), hence the
// server also honors the cookie on same-origin upgrades.
export const getRealtimeAuthTokenFromCookie = (): string | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  for (const cookiePart of document.cookie.split(';')) {
    const separatorIndex = cookiePart.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = cookiePart.slice(0, separatorIndex).trim();
    const value = cookiePart.slice(separatorIndex + 1).trim();

    if (cookieName === AUTH_COOKIE_NAME && isNonEmptyString(value)) {
      return value;
    }

    if (cookieName === AUTH_COOKIE_SECURE_NAME) {
      // httpOnly: unreadable here; the server cookie path covers it.
      return undefined;
    }
  }

  return undefined;
};

export const isRealtimeSameOrigin = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const serverUrl = REACT_APP_SERVER_BASE_URL;

  try {
    return new URL(serverUrl).origin === window.location.origin;
  } catch {
    return false;
  }
};
