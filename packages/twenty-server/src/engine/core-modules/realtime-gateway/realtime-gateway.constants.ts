// ws upgrade path; apiProxyPrefixes.ts must include 'realtime' so the vite
// dev server proxies it — a name collision with AppPath is impossible there.
export const REALTIME_WS_PATH = '/realtime';

export const REALTIME_REDIS_CHANNEL_PREFIX = 'a2e:rt:';

// Session tokens are `us_...` per isUserSessionToken; sec-only tokens prefix
// `su_` (see user-session constants). Client re-sends the raw token on
// subscribe so auth survives cross-origin WS handshakes that strip cookies.
export const REALTIME_CLIENT_TOKEN_COOKIE_HINT = 'realtime-auth-pending';

export const REALTIME_MAX_SUBSCRIPTIONS_PER_SOCKET = 100;

export const REALTIME_HEARTBEAT_INTERVAL_MS = 15_000;

// Presence records outlive two missed heartbeats and disappear automatically
// after abrupt disconnects. Typing state intentionally expires much sooner.
export const PRESENCE_CONNECTION_TTL_SECONDS = 45;

export const PRESENCE_TYPING_TTL_SECONDS = 5;

export const PRESENCE_KEY_PREFIX = 'presence';

export const REALTIME_RECONNECT_RESUME_WINDOW_MS = 30_000;

export const REALTIME_ENVELOPE_TYPES = ['event', 'ack', 'error'] as const;
