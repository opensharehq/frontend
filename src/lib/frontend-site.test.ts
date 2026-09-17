import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getFrontendSite,
  isCnFrontend,
  socialLoginProvidersForSite,
} from './frontend-site';

describe('frontend site resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('maps the canonical frontend domains independently', () => {
    expect(getFrontendSite('open-share.cn')).toBe('cn');
    expect(getFrontendSite('www.open-share.cn')).toBe('cn');
    expect(getFrontendSite('open-share.com')).toBe('global');
    expect(getFrontendSite('www.open-share.com')).toBe('global');
  });

  it('shows China-only features only on the China frontend', () => {
    expect(isCnFrontend('open-share.cn')).toBe(true);
    expect(isCnFrontend('www.open-share.cn')).toBe(true);
    expect(isCnFrontend('open-share.com')).toBe(false);
    expect(isCnFrontend('www.open-share.com')).toBe(false);
  });

  it('uses the build setting for local development and fails safe otherwise', () => {
    vi.stubEnv('VITE_FRONTEND_SITE', 'cn');
    expect(getFrontendSite('localhost')).toBe('cn');

    vi.stubEnv('VITE_FRONTEND_SITE', 'invalid');
    expect(getFrontendSite('preview.example')).toBe('global');
  });

  it('defaults an unknown hostname to global when the build setting is unset', () => {
    vi.stubEnv('VITE_FRONTEND_SITE', undefined);

    expect(getFrontendSite('localhost')).toBe('global');
  });

  it('enables AtomGit only for the China frontend', () => {
    expect(socialLoginProvidersForSite('cn')).toEqual(['github', 'atomgit']);
    expect(socialLoginProvidersForSite('global')).toEqual(['github']);
  });
});
