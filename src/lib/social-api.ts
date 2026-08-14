const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export function getSocialApiBaseUrl(provider: string): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
  if (provider !== 'atomgit') return apiBaseUrl;

  return import.meta.env.VITE_ATOMGIT_API_BASE_URL || apiBaseUrl;
}
