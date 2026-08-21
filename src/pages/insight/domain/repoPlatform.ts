import { OPEN_DIGGER_PLATFORM_LOGO_BASE } from '../api/constants';

export function normalizeRepoPlatform(platform: unknown): string {
  if (platform == null || String(platform).trim() === '') return 'github';
  const raw = String(platform).trim();
  const lower = raw.toLowerCase().replace(/\/$/, '');
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const u = new URL(lower);
      const h = u.hostname.replace(/^www\./, '');
      if (h === 'gitlab.com' || h.endsWith('.gitlab.com')) return 'gitlab';
      if (h === 'atomgit.com' || h.endsWith('.atomgit.com')) return 'atomgit';
      if (h === 'gitee.com') return 'gitee';
      if (h === 'github.com') return 'github';
    } catch {
      /* ignore */
    }
  }
  const slug = lower.replace(/\.com\/?$/, '').replace(/[^a-z0-9]+/g, '');
  if (slug === 'gitlab') return 'gitlab';
  if (slug === 'atomgit') return 'atomgit';
  if (slug === 'gitee') return 'gitee';
  if (slug === 'github') return 'github';
  if (lower.includes('gitlab')) return 'gitlab';
  if (lower.includes('atomgit')) return 'atomgit';
  if (lower.includes('gitee')) return 'gitee';
  const head = lower.replace(/\.com$/, '').split('/')[0];
  return head || 'github';
}

const REPO_PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  github: 'GitHub',
  gitee: 'Gitee',
  atomgit: 'AtomGit',
  gitlab: 'GitLab',
};

/** Platform name formatted for display while keeping normalized slugs for data and routing. */
export function getRepoPlatformDisplayName(platform: unknown): string {
  const normalized = normalizeRepoPlatform(platform);
  return REPO_PLATFORM_DISPLAY_NAMES[normalized]
    ?? normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getRepoUrlByPlatform(platform: unknown, name: string): string {
  if (!name) return '#';
  const p = normalizeRepoPlatform(platform);
  if (p === 'gitlab') return `https://gitlab.com/${name}`;
  if (p === 'atomgit') return `https://atomgit.com/${name}`;
  if (p === 'gitee') return `https://gitee.com/${name}`;
  return `https://github.com/${name}`;
}

/** User profile URL (login may be `user` or `user/...`; path uses first segment). */
export function getDeveloperProfileUrlByPlatform(platform: unknown, login: string): string {
  const handle = (login || '').split('/')[0]?.trim() || '';
  if (!handle) return '#';
  const p = normalizeRepoPlatform(platform);
  if (p === 'gitlab') return `https://gitlab.com/${handle}`;
  if (p === 'atomgit') return `https://atomgit.com/${handle}`;
  if (p === 'gitee') return `https://gitee.com/${handle}`;
  return `https://github.com/${handle}`;
}

/**
 * 根据平台与登录名推断开发者头像 URL。
 * 各平台规则：
 *   - github:  https://github.com/{login}.png
 *   - gitee:   https://gitee.com/{login}.png
 *   - atomgit: https://atomgit.com/{login}.png
 *   - gitlab:  https://gitlab.com/uploads/-/system/user/avatar/{numericUserId}/avatar.png
 *              (gitlab 必须提供数字 id，否则返回空字符串)
 * 与贡献者排行榜（CommunityDeveloperOpenRank）使用一致的构造逻辑。
 */
export function inferDeveloperAvatarUrl(
  platform: unknown,
  login: string,
  numericUserId?: string | null,
): string {
  const handle = (login || '').split('/')[0]?.trim() || '';
  if (!handle) return '';
  const p = normalizeRepoPlatform(platform);
  if (p === 'github') return `https://github.com/${handle}.png`;
  if (p === 'gitee') return `https://gitee.com/${handle}.png`;
  if (p === 'atomgit') return `https://atomgit.com/${handle}.png`;
  if (p === 'gitlab') {
    const id = String(numericUserId ?? '').trim();
    if (!id) return '';
    return `https://gitlab.com/uploads/-/system/user/avatar/${id}/avatar.png`;
  }
  return '';
}

export function inferLabelAvatarUrl(labelIdFull: string | null | undefined): string {
  if (!labelIdFull || typeof labelIdFull !== 'string') return '';
  // Strip a leading '#' or ':' prefix if present (label ids may come in as
  // `#companies/huawei/ascend` or `:companies/huawei/ascend`).
  const path = labelIdFull.startsWith(':') || labelIdFull.startsWith('#')
    ? labelIdFull.slice(1)
    : labelIdFull;
  if (!path) return '';
  return `${OPEN_DIGGER_PLATFORM_LOGO_BASE}${path}.png`;
}
