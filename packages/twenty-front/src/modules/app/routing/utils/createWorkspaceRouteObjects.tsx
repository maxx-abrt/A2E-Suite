import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { AppPath, SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { LazyRoute } from '@/app/components/LazyRoute';
import { lazyWithPreload } from '~/utils/lazyWithPreload';
import { BUREAU_PAGE_PATH } from '@/bureau/constants/BureauPagePath';
import {
  createSettingsRouteObjects,
  SettingsRouteOutlet,
} from '@/app/components/SettingsRoutes';
import { type WorkspaceRouteObject } from '@/app/routing/types/WorkspaceRouteObject';
import { RecordIndexSkeletonLoader } from '@/object-record/record-index/components/RecordIndexSkeletonLoader';

const WorkflowCoreIndexPage = lazyWithPreload(() =>
  import('~/pages/object-core/WorkflowCoreIndexPage').then((module) => ({
    default: module.WorkflowCoreIndexPage,
  })),
);

const RecordIndexPage = lazyWithPreload(() =>
  import('~/pages/object-record/RecordIndexPage').then((module) => ({
    default: module.RecordIndexPage,
  })),
);

const RecordShowPage = lazyWithPreload(() =>
  import('~/pages/object-record/RecordShowPage').then((module) => ({
    default: module.RecordShowPage,
  })),
);

const StandalonePageLayoutPage = lazyWithPreload(() =>
  import('~/pages/page-layout/StandalonePageLayoutPage').then((module) => ({
    default: module.StandalonePageLayoutPage,
  })),
);

const AiChatPage = lazyWithPreload(() =>
  import('~/pages/ai-chat/AiChatPage').then((module) => ({
    default: module.AiChatPage,
  })),
);

const ChatPage = lazyWithPreload(() =>
  import('~/pages/chat/ChatPage').then((module) => ({
    default: module.ChatPage,
  })),
);

const InboxPage = lazyWithPreload(() =>
  import('~/pages/inbox/InboxPage').then((module) => ({
    default: module.InboxPage,
  })),
);

const BureauPage = lazyWithPreload(() =>
  import('~/pages/bureau/BureauPage').then((module) => ({
    default: module.BureauPage,
  })),
);

const DrivePage = lazyWithPreload(() =>
  import('~/pages/drive/DrivePage').then((module) => ({
    default: module.DrivePage,
  })),
);

const CalendarPage = lazyWithPreload(() =>
  import('~/pages/calendar/CalendarPage').then((module) => ({
    default: module.CalendarPage,
  })),
);

const MobileHomePage = lazyWithPreload(() =>
  import('~/pages/mobile-home/MobileHomePage').then((module) => ({
    default: module.MobileHomePage,
  })),
);

const NotFound = lazy(() =>
  import('~/pages/not-found/NotFound').then((module) => ({
    default: module.NotFound,
  })),
);

type CreateWorkspaceRouteObjectsArgs = {
  isAdminPageEnabled?: boolean;
  isWorkflowCoreIndexPageEnabled?: boolean;
};

const MAIN_AND_SIDE_PANEL = ['main', 'side-panel'] as const;
const SETTINGS_ROOT_PATH = AppPath.SettingsCatchAll.replace('/*', '');

export const createWorkspaceRouteObjects = ({
  isAdminPageEnabled,
  isWorkflowCoreIndexPageEnabled,
}: CreateWorkspaceRouteObjectsArgs): WorkspaceRouteObject[] => {
  const settingsRouteObjects = createSettingsRouteObjects({
    isAdminPageEnabled,
  });

  return [
    ...(isWorkflowCoreIndexPageEnabled
      ? [
          {
            path: AppPath.WorkflowCoreIndexPage,
            preloadComponent: WorkflowCoreIndexPage.preload,
            element: (
              <LazyRoute>
                <WorkflowCoreIndexPage />
              </LazyRoute>
            ),
            handle: {
              workspaceSurfaces: MAIN_AND_SIDE_PANEL,
              isLocationExpandableFromSidePanel: true,
            },
          } satisfies WorkspaceRouteObject,
        ]
      : []),
    {
      path: AppPath.Index,
      element: <RecordIndexSkeletonLoader />,
    },
    {
      path: AppPath.RecordIndexPage,
      preloadComponent: RecordIndexPage.preload,
      element: (
        <LazyRoute fallback={<RecordIndexSkeletonLoader />}>
          <RecordIndexPage />
        </LazyRoute>
      ),
      handle: {
        workspaceSurfaces: MAIN_AND_SIDE_PANEL,
        isLocationExpandableFromSidePanel: true,
      },
    },
    {
      path: AppPath.RecordShowPage,
      preloadComponent: RecordShowPage.preload,
      element: (
        <LazyRoute>
          <RecordShowPage />
        </LazyRoute>
      ),
      handle: { workspaceSurfaces: MAIN_AND_SIDE_PANEL },
    },
    {
      path: AppPath.PageLayoutPage,
      preloadComponent: StandalonePageLayoutPage.preload,
      element: (
        <LazyRoute>
          <StandalonePageLayoutPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.AiChat,
      preloadComponent: AiChatPage.preload,
      element: (
        <LazyRoute>
          <AiChatPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.Discussions,
      preloadComponent: ChatPage.preload,
      element: (
        <LazyRoute>
          <ChatPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.Inbox,
      preloadComponent: InboxPage.preload,
      element: (
        <LazyRoute>
          <InboxPage />
        </LazyRoute>
      ),
    },
    {
      path: BUREAU_PAGE_PATH,
      preloadComponent: BureauPage.preload,
      element: (
        <LazyRoute>
          <BureauPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.Bureau,
      preloadComponent: BureauPage.preload,
      element: (
        <LazyRoute>
          <BureauPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.Drive,
      preloadComponent: DrivePage.preload,
      element: (
        <LazyRoute>
          <DrivePage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.Calendar,
      preloadComponent: CalendarPage.preload,
      element: (
        <LazyRoute>
          <CalendarPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.Home,
      preloadComponent: MobileHomePage.preload,
      element: (
        <LazyRoute>
          <MobileHomePage />
        </LazyRoute>
      ),
    },
    {
      path: SETTINGS_ROOT_PATH,
      element: <SettingsRouteOutlet />,
      children: settingsRouteObjects,
    },
    {
      path: AppPath.Dpa,
      element: <Navigate to={getSettingsPath(SettingsPath.LegalDpa)} replace />,
    },
    {
      path: AppPath.NotFoundWildcard,
      element: (
        <LazyRoute>
          <NotFound />
        </LazyRoute>
      ),
    },
  ];
};
