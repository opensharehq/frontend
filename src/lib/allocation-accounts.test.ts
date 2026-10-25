import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getAllocationAccountLogin, useAllocationAccountSearch } from './allocation-accounts';

describe('allocation account search', () => {
  const accounts = [
    { platform: 'Gitee', gitee_login: 'Alice.Gitee', actor_login: 'old-name' },
    { actor_login: 'Bob-Developer' },
    { github_login: 'LegacyAlice' },
    {},
  ];

  it('matches displayed platform and legacy names using case-insensitive substrings', () => {
    const { result, rerender } = renderHook(({ query }) => useAllocationAccountSearch(accounts, query), {
      initialProps: { query: ' ALIce ' },
    });
    expect(result.current).toEqual([accounts[0], accounts[2]]);
    rerender({ query: 'old-name' });
    expect(result.current).toEqual([]);
    rerender({ query: 'DEVEL' });
    expect(result.current).toEqual([accounts[1]]);
    rerender({ query: '  ' });
    expect(result.current).toBe(accounts);
    expect(getAllocationAccountLogin({})).toBe('');
  });
});
