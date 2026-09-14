import { lazy, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { AuthLayout } from '@/layouts/auth-layout';
import { AppLayout } from '@/layouts/app-layout';
import { RootLayout, LazyElement } from '@/app/router-elements';

// Landing page
import App from '@/app/App';

// 登录页是认证入口，几乎所有未登录用户都会经过；同步加载避免 Suspense fallback
// 在 AuthLayout 卡片内渲染高度为 min-h-dvh 的 PageLoader，从而撑出过高的占位框。
import LoginPage from '@/pages/login';

// Public pages
const SocialCallbackPage = lazy(() => import('@/pages/social-callback'));
const PublicProfilePage = lazy(() => import('@/pages/public-profile'));

// Authenticated pages
const ProfilePage = lazy(() => import('@/pages/profile'));
const ProfileEditPage = lazy(() => import('@/pages/profile-edit'));
const PointsPage = lazy(() => import('@/pages/points'));
const TransactionsPage = lazy(() => import('@/pages/transactions'));
const ShopPage = lazy(() => import('@/pages/shop'));
const ShopItemPage = lazy(() => import('@/pages/shop-item'));
const RedemptionsPage = lazy(() => import('@/pages/redemptions'));
const MessagesPage = lazy(() => import('@/pages/messages'));
const OrganizationsPage = lazy(() => import('@/pages/organizations'));
const OrganizationCreatePage = lazy(() => import('@/pages/organization-create'));
const OrganizationDetailPage = lazy(() => import('@/pages/organization-detail'));
const OrganizationMembersPage = lazy(() => import('@/pages/organization-members'));
const OrganizationSettingsPage = lazy(() => import('@/pages/organization-settings'));
const OrganizationTransactionsPage = lazy(() => import('@/pages/organization-transactions'));
const SettingsGeneralPage = lazy(() => import('@/pages/settings-general'));
const AccountMergePage = lazy(() => import('@/pages/account-merge'));
const PointAllocationPage = lazy(() => import('@/pages/point-allocation'));
const TalentReachPage = lazy(() => import('@/pages/talent-reach'));
const TalentReachComposePage = lazy(() => import('../pages/talent-reach-compose'));
const TalentReachSendPage = lazy(() => import('../pages/talent-reach-send'));
const TalentReachDetailPage = lazy(() => import('../pages/talent-reach-detail'));
const InsightPage = lazy(() => import('../pages/insight/index'));
const InsightDispatcher = lazy(() => import('../pages/insight/insight-dispatcher'));
const OverviewPage = lazy(() => import('../pages/insight/open-world'));

function lazyElement(element: ReactNode) {
  return <LazyElement>{element}</LazyElement>;
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Landing page
      { path: '/', element: <App /> },

      // Public profile
      { path: '/u/:username', element: lazyElement(<PublicProfilePage />) },

      // Social login callback
      { path: '/social-callback', element: lazyElement(<SocialCallbackPage />) },

      // Auth pages (with AuthLayout)
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
        ],
      },

      // Semi-public pages (with AppLayout but without auth required)
      {
        element: <AppLayout publicMode />,
        children: [
          { path: '/insight', element: <Navigate to="/insight/open-world" replace /> },
          { path: '/insight/open-world', element: lazyElement(<OverviewPage />) },
        ],
      },

      // Protected pages (with AppLayout)
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '/profile', element: lazyElement(<ProfilePage />) },
          { path: '/profile/edit', element: lazyElement(<ProfileEditPage />) },
          { path: '/points', element: lazyElement(<PointsPage />) },
          { path: '/points/transactions', element: lazyElement(<TransactionsPage />) },
          { path: '/points/withdrawals', element: <Navigate to="/points" replace /> },
          { path: '/points/allocate', element: lazyElement(<PointAllocationPage />) },
          { path: '/shop', element: lazyElement(<ShopPage />) },
          { path: '/shop/:id', element: lazyElement(<ShopItemPage />) },
          { path: '/redemptions', element: lazyElement(<RedemptionsPage />) },
          { path: '/messages', element: lazyElement(<MessagesPage />) },
          { path: '/talent-reach', element: lazyElement(<TalentReachPage />) },
          { path: '/talent-reach/compose', element: lazyElement(<TalentReachComposePage />) },
          { path: '/talent-reach/send/:draftId', element: lazyElement(<TalentReachSendPage />) },
          { path: '/talent-reach/history/:id', element: lazyElement(<TalentReachDetailPage />) },
          { path: '/organizations', element: lazyElement(<OrganizationsPage />) },
          { path: '/organizations/create', element: lazyElement(<OrganizationCreatePage />) },
          { path: '/organizations/:slug', element: lazyElement(<OrganizationDetailPage />) },
          { path: '/organizations/:slug/members', element: lazyElement(<OrganizationMembersPage />) },
          { path: '/organizations/:slug/settings', element: lazyElement(<OrganizationSettingsPage />) },
          { path: '/organizations/:slug/transactions', element: lazyElement(<OrganizationTransactionsPage />) },
          { path: '/insight/open-leaderboard', element: lazyElement(<InsightPage />) },
          { path: '/insight/*', element: lazyElement(<InsightDispatcher />) },
          { path: '/settings/general', element: lazyElement(<SettingsGeneralPage />) },
          { path: '/settings/addresses', element: <Navigate to="/settings/general" replace /> },
          { path: '/settings/withdrawal-accounts', element: <Navigate to="/settings/general" replace /> },
          { path: '/settings/merge', element: lazyElement(<AccountMergePage />) },
        ],
      },
    ],
  },
]);
