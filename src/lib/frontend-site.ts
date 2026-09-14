export type FrontendSite = 'cn' | 'global';

const SITE_HOSTS: Record<string, FrontendSite> = {
  'open-share.cn': 'cn',
  'www.open-share.cn': 'cn',
  'open-share.com': 'global',
  'www.open-share.com': 'global',
};

function configuredSite(): FrontendSite | null {
  const configuredValue = import.meta.env.VITE_FRONTEND_SITE;
  if (typeof configuredValue !== 'string') return null;

  const value = configuredValue.trim().toLowerCase();
  return value === 'cn' || value === 'global' ? value : null;
}

/** Resolve the active frontend from its hostname, with an explicit dev/build override. */
export function getFrontendSite(hostname = window.location.hostname): FrontendSite {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/\.$/, '');
  return SITE_HOSTS[normalizedHostname] ?? configuredSite() ?? 'global';
}

export function isCnFrontend(hostname?: string): boolean {
  return getFrontendSite(hostname) === 'cn';
}

export function socialLoginProvidersForSite(
  site: FrontendSite,
): readonly ('github' | 'atomgit')[] {
  return site === 'cn' ? ['github', 'atomgit'] : ['github'];
}
