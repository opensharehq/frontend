import { Suspense, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth-context';
import { RouteErrorBoundary, useGlobalUnhandledErrorHandler } from '@/components/error-boundary';

// Root layout with AuthProvider
export function RootLayout() {
  // 全局未捕获异常 / 动态 import 失败兜底（toast 引导刷新）
  useGlobalUnhandledErrorHandler();

  return (
    <AuthProvider>
      {/*
        顶层错误边界：兜住非懒加载页面（/、/login）以及 AuthProvider/ProtectedRoute
        等公共节点抛出的渲染期异常，避免整站白屏。
      */}
      <RouteErrorBoundary>
        <Outlet />
      </RouteErrorBoundary>
    </AuthProvider>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

export function LazyElement({ children }: { children: ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}
