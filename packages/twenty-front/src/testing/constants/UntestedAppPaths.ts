import { AppPath } from 'twenty-shared/types';

export const UNTESTED_APP_PATHS = [
  AppPath.Settings,
  AppPath.Developers,
  // Public, unauthenticated redirect route handled in useCreateWorkspaceAppRouter
  // — not part of the onboarding/auth page-change navigation matrix.
  AppPath.Dpa,
  // Native app home pages with no onboarding/auth special-case in
  // usePageChangeEffectNavigateLocation, so they have no rows in that matrix.
  AppPath.Bureau,
  AppPath.Calendar,
  AppPath.Discussions,
  AppPath.Drive,
  AppPath.Inbox,
];
