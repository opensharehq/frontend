import { describe, expect, it } from 'vitest';
import {
  createBaiduAnalyticsPlugin,
  createBaiduAnalyticsScript,
  resolveBaiduAnalyticsConfig,
} from './baidu-analytics';

const CN_ID = '8e8cb168aaff7c12e89fea66b7c9d2c2';
const GLOBAL_ID = 'ab5420622dc38d7e993cb0c840f11d6b';

describe('Baidu Analytics build injection', () => {
  it('selects the tracking ID for the requested frontend', () => {
    expect(resolveBaiduAnalyticsConfig({
      BAIDU_ANALYTICS_ENABLED: 'true',
      VITE_FRONTEND_SITE: 'cn',
    })).toEqual({
      id: CN_ID,
      site: 'cn',
    });
    expect(resolveBaiduAnalyticsConfig({
      BAIDU_ANALYTICS_ENABLED: 'true',
      VITE_FRONTEND_SITE: 'global',
    })).toEqual({
      id: GLOBAL_ID,
      site: 'global',
    });
  });

  it('stays disabled without the release flag and an explicit supported site', () => {
    expect(resolveBaiduAnalyticsConfig({})).toBeNull();
    expect(resolveBaiduAnalyticsConfig({ VITE_FRONTEND_SITE: 'cn' })).toBeNull();
    expect(
      resolveBaiduAnalyticsConfig({
        BAIDU_ANALYTICS_ENABLED: 'true',
        VITE_FRONTEND_SITE: 'preview',
      }),
    ).toBeNull();
  });

  it('creates the official asynchronous loader with only the selected ID', () => {
    const script = createBaiduAnalyticsScript(CN_ID);

    expect(script).toContain(`https://hm.baidu.com/hm.js?${CN_ID}`);
    expect(script).toContain('s.parentNode.insertBefore(hm, s);');
    expect(script).not.toContain(GLOBAL_ID);
    expect(createBaiduAnalyticsPlugin(() => ({}))).toMatchObject({
      name: 'baidu-analytics',
      apply: 'build',
    });
  });
});
