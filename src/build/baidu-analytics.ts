import type { Plugin } from 'vite';

type AnalyticsSite = 'cn' | 'global';

const ANALYTICS_IDS: Record<AnalyticsSite, string> = {
  cn: '8e8cb168aaff7c12e89fea66b7c9d2c2',
  global: 'ab5420622dc38d7e993cb0c840f11d6b',
};

interface BaiduAnalyticsConfig {
  id: string;
  site: AnalyticsSite;
}

type LoadBuildEnv = (
  mode: string,
  root: string,
) => Record<string, string | undefined>;

export function resolveBaiduAnalyticsConfig(
  env: Record<string, string | undefined>,
): BaiduAnalyticsConfig | null {
  if (env.BAIDU_ANALYTICS_ENABLED !== 'true') return null;

  const site = env.VITE_FRONTEND_SITE?.trim().toLowerCase();
  if (site !== 'cn' && site !== 'global') return null;

  return { id: ANALYTICS_IDS[site], site };
}

export function createBaiduAnalyticsScript(id: string): string {
  return `var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?${id}";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`;
}

export function createBaiduAnalyticsPlugin(loadBuildEnv: LoadBuildEnv): Plugin {
  let analyticsConfig: BaiduAnalyticsConfig | null = null;

  return {
    name: 'baidu-analytics',
    apply: 'build',
    configResolved(config) {
      analyticsConfig = resolveBaiduAnalyticsConfig(
        loadBuildEnv(config.mode, config.root),
      );
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        if (!analyticsConfig) return [];

        return [
          {
            tag: 'script',
            attrs: {
              'data-baidu-analytics-site': analyticsConfig.site,
            },
            children: createBaiduAnalyticsScript(analyticsConfig.id),
            injectTo: 'head',
          },
        ];
      },
    },
  };
}
