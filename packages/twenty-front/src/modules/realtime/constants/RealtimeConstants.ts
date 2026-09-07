import { ApiPath } from 'twenty-shared/types';

import { REACT_APP_SERVER_BASE_URL } from '~/config';

// Envelope + topic grammar mirrored from the server realtime-gateway module;
// validated client-side too so a rogue server response can't poison hooks.
export const getRealtimeWsUrl = (): string =>
  process.env.__REALTIME_TEST_WS_URL ??
  `${REACT_APP_SERVER_BASE_URL.replace(/^http/, 'ws')}/${ApiPath.Realtime}`;

export const REALTIME_MAX_RECONNECT_ATTEMPTS = 10;

export const REALTIME_BASE_RECONNECT_DELAY_MS = 500;

export const REALTIME_MAX_RECONNECT_DELAY_MS = 30_000;

export const REALTIME_MAX_TOPIC_SUBSCRIPTIONS = 100;

export const REALTIME_RESUME_WINDOW_MS = 30_000;
