// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { LeaderboardMeta } from '../types/api';
import {
  hasCanonicalLeaderboardFilters,
  resolveLeaderboardFilters,
  writeLeaderboardFilters,
} from './leaderboardFilters';
import { getInsightHomePath, withSearchParams } from './routes';

const meta: LeaderboardMeta = {
  updatedAt: '2025-06-15T00:00:00Z',
  scopes: [
    { name: 'China', name_zh: '中国' },
    { name: 'Global', name_zh: '全球' },
  ],
  groupTypes: [
    { name: 'Developer', name_zh: '开发者' },
    { name: 'Project', name_zh: '项目' },
  ],
};

describe('OpenLeaderboard URL filters', () => {
  it('resolves and writes every default filter parameter', () => {
    const filters = resolveLeaderboardFilters(new URLSearchParams(), meta);
    const params = writeLeaderboardFilters(new URLSearchParams(), filters);

    expect(filters).toEqual({
      scope: 'Global',
      unit: 'Project',
      timeType: 'month',
      time: '2025-05',
      search: '',
      page: 1,
    });
    expect(params.toString()).toBe(
      'scope=Global&unit=Project&timeType=month&time=2025-05&search=&page=1',
    );
    expect(hasCanonicalLeaderboardFilters(params, filters)).toBe(true);
  });

  it('restores valid URL values and canonicalizes localized option names', () => {
    const filters = resolveLeaderboardFilters(
      new URLSearchParams(
        'scope=%E4%B8%AD%E5%9B%BD&unit=Developer&timeType=year&time=2022&search=alice&page=3',
      ),
      meta,
    );

    expect(filters).toEqual({
      scope: 'China',
      unit: 'Developer',
      timeType: 'year',
      time: '2022',
      search: 'alice',
      page: 3,
    });
  });

  it('falls back from invalid values and preserves unrelated parameters', () => {
    const original = new URLSearchParams(
      'scope=Unknown&unit=Country&timeType=week&time=2025-00&search=&page=0&source=shared',
    );
    const filters = resolveLeaderboardFilters(original, meta);
    const params = writeLeaderboardFilters(original, filters);

    expect(filters).toEqual({
      scope: 'Global',
      unit: 'Project',
      timeType: 'month',
      time: '2025-05',
      search: '',
      page: 1,
    });
    expect(params.get('source')).toBe('shared');
    expect(hasCanonicalLeaderboardFilters(original, filters)).toBe(false);
    expect(hasCanonicalLeaderboardFilters(params, filters)).toBe(true);
  });

  it('keeps the filter query while navigating to and from detail pages', () => {
    const filters = resolveLeaderboardFilters(new URLSearchParams(), meta);
    const query = writeLeaderboardFilters(new URLSearchParams(), filters);

    expect(withSearchParams('/insight/github/openai/codex', query)).toBe(
      '/insight/github/openai/codex?scope=Global&unit=Project&timeType=month&time=2025-05&search=&page=1',
    );
    expect(getInsightHomePath(query)).toBe(
      '/insight/open-leaderboard?scope=Global&unit=Project&timeType=month&time=2025-05&search=&page=1',
    );
  });
});
