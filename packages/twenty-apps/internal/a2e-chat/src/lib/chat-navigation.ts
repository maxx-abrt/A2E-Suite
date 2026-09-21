import { type AppPath } from 'twenty-sdk/front-component';

// The dedicated chat page lives at `/discussions` (host:
// createWorkspaceRouteObjects.tsx registers it at AppPath.Discussions, and
// isDiscussionsPath.ts matches it). The published twenty-sdk the app pins
// (2.31.0, latest npm 2.41.0) predates that AppPath member, so the target is
// pinned as a literal — the same reason a2e-drive pins DRIVE_APP_PATH. When the
// SDK ships the member, swap this for `AppPath.Discussions` directly.
export const CHAT_DISCUSSIONS_PATH = '/discussions' as AppPath;
