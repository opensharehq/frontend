import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BarChart3, RefreshCw, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';

/**
 * 判断错误是否来自动态 import / chunk 加载失败。
 * 这类错误通常出现在弱网或部署后旧 hash chunk 已被清理的场景。
 */
export function isChunkLoadError(error?: Error | null): boolean {
  if (!error) return false;
  const text = `${error.name ?? ''} ${error.message ?? ''}`;
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
    text,
  );
}

// --------------- ErrorBoundary (Class Component) ---------------

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (params: { error: Error; reset: () => void }) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  /** 当 resetKey 变化（如路由切换）时自动清除错误状态。 */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info);
    }
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.reset();
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}

// --------------- PageErrorFallback (友好兜底 UI) ---------------

interface PageErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function PageErrorFallback({ error, reset }: PageErrorFallbackProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isChunk = isChunkLoadError(error);

  const handleRetry = () => {
    if (isChunk) {
      // chunk 加载失败时直接整页刷新，确保拉到最新静态资源
      window.location.reload();
      return;
    }
    reset();
  };

  const handleBackToInsight = () => {
    reset();
    navigate('/insight');
  };

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          {isChunk ? (
            <WifiOff className="size-7" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-7" aria-hidden="true" />
          )}
        </div>
        <h1 className="mt-6 text-xl font-semibold text-foreground">
          {t(isChunk ? 'errorBoundary.chunkTitle' : 'errorBoundary.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(isChunk ? 'errorBoundary.chunkDescription' : 'errorBoundary.description')}
        </p>
        {import.meta.env.DEV && error?.message && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          <Button onClick={handleRetry}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t(isChunk ? 'errorBoundary.reload' : 'common.retry')}
          </Button>
          <Button variant="outline" onClick={handleBackToInsight}>
            <BarChart3 className="size-4" aria-hidden="true" />
            {t('errorBoundary.backToInsight')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --------------- RouteErrorBoundary (路由级封装) ---------------

/**
 * 路由级错误边界：包裹页面元素；路由切换时自动重置，避免错误粘连到下一页。
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundary
      resetKey={location.pathname}
      fallback={({ error, reset }) => <PageErrorFallback error={error} reset={reset} />}
    >
      {children}
    </ErrorBoundary>
  );
}

// --------------- 全局未捕获异常兜底 Hook ---------------

/**
 * 全局未捕获异常 / Promise 拒绝兜底。
 * - chunk / 动态 import 失败：toast 提示并提供刷新操作。
 * - 其他异常仅在开发环境打印，避免打扰用户。
 */
export function useGlobalUnhandledErrorHandler() {
  const { t } = useTranslation();

  useEffect(() => {
    let chunkToastShown = false;

    const notifyChunkFailure = () => {
      if (chunkToastShown) return;
      chunkToastShown = true;
      toast.error(t('errorBoundary.chunkToastTitle'), {
        description: t('errorBoundary.chunkToastDescription'),
        action: {
          label: t('errorBoundary.reload'),
          onClick: () => window.location.reload(),
        },
        duration: 10000,
        onDismiss: () => { chunkToastShown = false; },
        onAutoClose: () => { chunkToastShown = false; },
      });
    };

    const handleError = (event: ErrorEvent) => {
      const err = event.error instanceof Error ? event.error : null;
      if (isChunkLoadError(err)) {
        notifyChunkFailure();
      } else if (import.meta.env.DEV) {
        console.warn('[GlobalError]', event.error ?? event.message);
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const err = reason instanceof Error ? reason : new Error(String(reason));
      if (isChunkLoadError(err)) {
        notifyChunkFailure();
      } else if (import.meta.env.DEV) {
        console.warn('[UnhandledRejection]', reason);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [t]);
}
