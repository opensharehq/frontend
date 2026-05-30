import { lazy } from 'react';
import { useParams, useRoutes } from 'react-router-dom';

import './icons/registerMdiOffline';

const LabelDetailPage = lazy(() => import('./label-detail'));
const RepoDetailPage = lazy(() => import('./repo-detail'));
const DeveloperDetailPage = lazy(() => import('./developer-detail'));

// Known repo/developer platform identifiers. The first path segment after
// `/insight/` decides whether the URL points at a repo, a developer or an
// OpenDigger label. Labels live under non-platform namespaces such as
// `companies`, `divisions`, `regions`, `activities`, `foundations`, etc.
const PLATFORM_NAMES = new Set(['github', 'gitee', 'gitlab', 'atomgit', 'gitcode']);

/**
 * Dispatcher for `/insight/*` URLs.
 *
 * - `/insight/{platform}/{owner}/{repo}` → RepoDetailPage
 * - `/insight/{platform}/{login}`        → DeveloperDetailPage
 * - `/insight/{anything-else...}`        → LabelDetailPage
 *
 * This keeps the URL flat (no `/labels/` segment) while still avoiding
 * conflicts with the platform-prefixed repo/developer routes.
 */
export default function InsightDispatcher() {
  const params = useParams();
  const splat = params['*'] || '';
  const firstSeg = (splat.split('/')[0] || '').toLowerCase();
  const isPlatform = PLATFORM_NAMES.has(firstSeg);

  // useRoutes must be invoked unconditionally so hook order stays stable.
  // Routes here are relative to the parent `/insight/*` path.
  const platformRoutes = useRoutes([
    { path: ':platform/:owner/:repo', element: <RepoDetailPage /> },
    { path: ':platform/:login', element: <DeveloperDetailPage /> },
  ]);

  if (isPlatform && platformRoutes) {
    return platformRoutes;
  }
  return <LabelDetailPage />;
}
