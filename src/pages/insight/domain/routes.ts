/**
 * Route helper functions for insight module
 */

export function getLabelDetailPath(labelId: string): string {
  // Strip a leading '#' or ':' prefix if present (label ids may come in as
  // `#companies/huawei/ascend` or `:companies/huawei/ascend`).
  let id = labelId;
  if (id.startsWith('#') || id.startsWith(':')) {
    id = id.substring(1);
  }
  // Encode each segment separately so '/' are kept as path separators
  // (e.g. `companies/huawei/ascend` stays as path, not %2F-encoded).
  // Note: the URL deliberately does NOT include a `/labels/` prefix; the
  // dispatcher under `/insight/*` decides whether to render the label,
  // repo or developer page based on the first segment.
  const encoded = id
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `/insight/${encoded}`;
}

export function getRepoDetailPath(platform: string, owner: string, repo: string): string {
  return `/insight/${platform.toLowerCase()}/${owner}/${repo}`;
}

export function getDeveloperDetailPath(platform: string, login: string): string {
  return `/insight/${platform.toLowerCase()}/${login}`;
}

export function withSearchParams(path: string, search: string | URLSearchParams): string {
  const query = (typeof search === 'string' ? search : search.toString()).replace(/^\?/, '');
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

export function getInsightHomePath(search: string | URLSearchParams = ''): string {
  return withSearchParams('/insight/open-leaderboard', search);
}
