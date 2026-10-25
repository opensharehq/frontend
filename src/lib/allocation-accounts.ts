import { useMemo } from 'react';
import { normalizeRepoPlatform } from '@/pages/insight/domain/repoPlatform';

interface AllocationAccount {
  platform?: string;
  actor_login?: string;
  github_login?: string;
}

/** Use the same account name for display and search, including legacy snapshots. */
export function getAllocationAccountLogin(account: AllocationAccount): string {
  if (account.platform) {
    const platform = normalizeRepoPlatform(account.platform);
    const login = (account as Record<string, unknown>)[`${platform}_login`];
    if (typeof login === 'string' && login) return login;
  }
  return account.actor_login || account.github_login || '';
}

export function useAllocationAccountSearch<T extends AllocationAccount>(items: T[], query: string): T[] {
  // Normalize once per dataset rather than once per keystroke for large lists.
  const logins = useMemo(() => items.map((item) => getAllocationAccountLogin(item).toLowerCase()), [items]);
  const normalizedQuery = query.trim().toLowerCase();
  return useMemo(
    () => normalizedQuery ? items.filter((_, index) => logins[index].includes(normalizedQuery)) : items,
    [items, logins, normalizedQuery],
  );
}
