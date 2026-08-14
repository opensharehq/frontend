import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSocialApiBaseUrl } from './social-api';

describe('social API base URL', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the normal API host for GitHub', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api/v1');
    vi.stubEnv('VITE_ATOMGIT_API_BASE_URL', 'http://127.0.0.1:8000/api/v1');

    expect(getSocialApiBaseUrl('github')).toBe('http://localhost:8000/api/v1');
  });

  it('allows AtomGit to use its IP-based host', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api/v1');
    vi.stubEnv('VITE_ATOMGIT_API_BASE_URL', 'http://127.0.0.1:8000/api/v1');

    expect(getSocialApiBaseUrl('atomgit')).toBe('http://127.0.0.1:8000/api/v1');
  });
});
