import type { LeaderboardMeta, MetaGroupType, MetaScope } from '../types/api';
import { defaultScopeValue, defaultUnitValue, filterGroupTypesForUnitDropdown } from './meta';
import { computeInitialTimeValue } from './timeRange';

export const LEADERBOARD_FILTER_PARAM_KEYS = {
  scope: 'scope',
  unit: 'unit',
  timeType: 'timeType',
  time: 'time',
  search: 'search',
  page: 'page',
} as const;

export type LeaderboardTimeType = 'month' | 'year';

export type LeaderboardFilters = {
  scope: string;
  unit: string;
  timeType: LeaderboardTimeType;
  time: string;
  search: string;
  page: number;
};

function canonicalOptionValue<T extends MetaScope | MetaGroupType>(
  options: T[],
  requested: string | null,
  fallback: string,
): string {
  const match = requested
    ? options.find((option) => option && (option.name === requested || option.name_zh === requested))
    : null;
  return match?.name ?? match?.name_zh ?? fallback;
}

function resolveTimeValue(
  rawValue: string | null,
  timeType: LeaderboardTimeType,
  meta: LeaderboardMeta,
): string {
  const isValidShape = timeType === 'year'
    ? /^\d{4}$/.test(rawValue ?? '')
    : /^\d{4}-(0[1-9]|1[0-2])$/.test(rawValue ?? '');
  return computeInitialTimeValue(timeType, meta, isValidShape ? rawValue! : '');
}

export function resolveLeaderboardFilters(
  params: URLSearchParams,
  meta: LeaderboardMeta,
): LeaderboardFilters {
  const units = filterGroupTypesForUnitDropdown(meta.groupTypes);
  const defaultScope = defaultScopeValue(meta.scopes, null);
  const defaultUnit = defaultUnitValue(units, null);
  const timeType: LeaderboardTimeType = params.get(LEADERBOARD_FILTER_PARAM_KEYS.timeType) === 'year'
    ? 'year'
    : 'month';
  const rawPage = params.get(LEADERBOARD_FILTER_PARAM_KEYS.page) ?? '';
  const parsedPage = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;

  return {
    scope: canonicalOptionValue(
      meta.scopes,
      params.get(LEADERBOARD_FILTER_PARAM_KEYS.scope),
      defaultScope,
    ),
    unit: canonicalOptionValue(
      units,
      params.get(LEADERBOARD_FILTER_PARAM_KEYS.unit),
      defaultUnit,
    ),
    timeType,
    time: resolveTimeValue(params.get(LEADERBOARD_FILTER_PARAM_KEYS.time), timeType, meta),
    search: params.get(LEADERBOARD_FILTER_PARAM_KEYS.search) ?? '',
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
  };
}

export function writeLeaderboardFilters(
  params: URLSearchParams,
  filters: LeaderboardFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set(LEADERBOARD_FILTER_PARAM_KEYS.scope, filters.scope);
  next.set(LEADERBOARD_FILTER_PARAM_KEYS.unit, filters.unit);
  next.set(LEADERBOARD_FILTER_PARAM_KEYS.timeType, filters.timeType);
  next.set(LEADERBOARD_FILTER_PARAM_KEYS.time, filters.time);
  next.set(LEADERBOARD_FILTER_PARAM_KEYS.search, filters.search);
  next.set(LEADERBOARD_FILTER_PARAM_KEYS.page, String(filters.page));
  return next;
}

export function hasCanonicalLeaderboardFilters(
  params: URLSearchParams,
  filters: LeaderboardFilters,
): boolean {
  const expected = writeLeaderboardFilters(new URLSearchParams(), filters);
  return Object.values(LEADERBOARD_FILTER_PARAM_KEYS).every(
    (key) => params.getAll(key).length === 1 && params.get(key) === expected.get(key),
  );
}
