import axios from 'axios';
import { buildLoginPath, currentRedirectTarget } from '@/lib/redirect';

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：附加 Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 时自动刷新（登录/注册/刷新等认证端点除外，避免掩盖凭证错误）
const AUTH_ENDPOINTS_SKIP_REFRESH = ['/auth/refresh', '/auth/social/exchange'];
let refreshPromise: Promise<TokenPair> | null = null;

function refreshTokens(): Promise<TokenPair> {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return Promise.reject(new Error('No refresh token'));

    refreshPromise = axios
      .post<TokenPair>(`${api.defaults.baseURL}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      .then(({ data }) => {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl: string = originalRequest?.url || '';
    const isAuthEndpoint = AUTH_ENDPOINTS_SKIP_REFRESH.some((path) => requestUrl.includes(path));
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const data = await refreshTokens();
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // 携带当前路径作为 redirect，登录后回到原页面
        const target = currentRedirectTarget(window.location);
        window.location.href = buildLoginPath(target);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// 统一错误类型
export interface ApiError {
  code: string;
  message: string;
  detail?: Record<string, Array<{ message: string; code: string }>>;
}

export function getApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiError;
  }
  return { code: 'unknown', message: 'An unexpected error occurred' };
}
