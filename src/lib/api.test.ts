import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';

function response(config: AxiosRequestConfig, data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  } as AxiosResponse;
}

describe('API token refresh', () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    localStorage.setItem('access_token', 'expired-access');
    localStorage.setItem('refresh_token', 'current-refresh');
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shares one refresh request across simultaneous 401 responses', async () => {
    const refresh = vi.spyOn(axios, 'post').mockImplementation(async () => {
      await Promise.resolve();
      return response({}, {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      });
    });

    api.defaults.adapter = async (config) => {
      if (config.headers.get('Authorization') === 'Bearer expired-access') {
        return Promise.reject({
          config,
          response: { status: 401 },
        });
      }
      return response(config, { ok: true });
    };

    const [first, second] = await Promise.all([
      api.get('/first'),
      api.get('/second'),
    ]);

    expect(first.data).toEqual({ ok: true });
    expect(second.data).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('access_token')).toBe('new-access');
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
  });
});
