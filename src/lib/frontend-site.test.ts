import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getFrontendSite,
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
