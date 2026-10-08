import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import './icons/registerMdiOffline';
import { fetchLeaderboardData, fetchLeaderboardMeta } from './api/openLeaderboard';
import { buildDataUrl, getFilteredLeaderboardData, ITEMS_PER_PAGE, leaderboardItemKey } from './domain/leaderboard';
import { formatUpdateTime } from './domain/format';
import { normalizeInsightLang } from './domain/lang';
import {
  hasCanonicalLeaderboardFilters,
  resolveLeaderboardFilters,
  type LeaderboardFilters,
  writeLeaderboardFilters,
} from './domain/leaderboardFilters';
import type { LeaderboardItem, LeaderboardMeta } from './types/api';
import { FilterPanel } from './components/FilterPanel';
import { SiteSearchBox } from '@/app/components/site-search-box';
import { LeaderboardSection } from './components/LeaderboardSection';
import { PaginationControl } from './components/PaginationControl';

export default function InsightPage() {
  const { t, i18n } = useTranslation();
  const lang = normalizeInsightLang(i18n.language);
  const [searchParams, setSearchParams] = useSearchParams();

  const [meta, setMeta] = useState<LeaderboardMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [loadedBoardKey, setLoadedBoardKey] = useState<string | null>(null);
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const leaderboardRowsRef = useRef<HTMLDivElement>(null);

  const filters = useMemo<LeaderboardFilters>(() => {
    if (meta) return resolveLeaderboardFilters(searchParams, meta);
    return {
      scope: '',
      unit: '',
      timeType: 'month',
      time: '',
      search: searchParams.get('search') ?? '',
      page: 1,
    };
  }, [meta, searchParams]);
  const {
    scope: scopeValue,
    unit: unitValue,
    timeType,
    time: timeValue,
    search: searchKeyword,
    page: currentPage,
  } = filters;

  const updateFilters = useCallback((
    patch: Partial<LeaderboardFilters>,
    options?: { replace?: boolean },
  ) => {
    const nextFilters = { ...filters, ...patch };
    setSearchParams(writeLeaderboardFilters(searchParams, nextFilters), options);
  }, [filters, searchParams, setSearchParams]);

  // Fetch meta on mount
  useEffect(() => {
    let cancelled = false;
    void fetchLeaderboardMeta()
      .then((m) => {
        if (cancelled) return;
        setMeta(m);
        setFiltersReady(true);
        setMetaError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setMetaError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Keep every filter control represented in the URL, including defaults.
  // Invalid or localized option values are replaced with their canonical form.
  useEffect(() => {
    if (!filtersReady || !meta || hasCanonicalLeaderboardFilters(searchParams, filters)) return;
    setSearchParams(writeLeaderboardFilters(searchParams, filters), { replace: true });
  }, [filters, filtersReady, meta, searchParams, setSearchParams]);

  const boardKey = `${scopeValue}\u0000${unitValue}\u0000${timeType}\u0000${timeValue}\u0000${reloadKey}`;

  // Fetch leaderboard data when filters change
  useEffect(() => {
    if (!filtersReady || !scopeValue || !unitValue || !timeValue) return;
    const url = buildDataUrl({ scopeName: scopeValue, groupTypeName: unitValue, timeType, timeValue });
    if (!url) return;
    let cancelled = false;
    setBoardLoading(true);
    setBoardError(null);
    setLoadedBoardKey(null);
    void fetchLeaderboardData(url)
      .then((data) => {
        if (cancelled) return;
        setLeaderboardData(data);
        setLoadedBoardKey(boardKey);
        setBoardLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setBoardError(e.message);
        setBoardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boardKey, filtersReady, scopeValue, unitValue, timeType, timeValue]);

  const filteredLeaderboardData = useMemo(
    () => getFilteredLeaderboardData(leaderboardData, searchKeyword),
    [leaderboardData, searchKeyword],
  );
  const filteredCount = filteredLeaderboardData.length;
  const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE);

  useEffect(() => {
    if (loadedBoardKey !== boardKey || boardLoading || boardError) return;
    const lastPage = Math.max(totalPages, 1);
    if (currentPage <= lastPage) return;
    updateFilters({ page: lastPage }, { replace: true });
  }, [boardError, boardKey, boardLoading, currentPage, loadedBoardKey, totalPages, updateFilters]);

  const currentPageData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeaderboardData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredLeaderboardData]);
  const leaderboardRankByKey = useMemo(() => {
    const rankMap = new Map<string, number>();
    leaderboardData.forEach((item, index) => {
      const key = leaderboardItemKey(item);
      if (key && !rankMap.has(key)) {
        rankMap.set(key, index + 1);
      }
    });
    return rankMap;
  }, [leaderboardData]);

  const scrollToLeaderboardRows = useCallback(() => {
    const el = leaderboardRowsRef.current;
    if (!el) return;
    const headerHeight = 80;
    const dataTop = el.getBoundingClientRect().top + window.scrollY - headerHeight;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: dataTop, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, []);

  const handlePageChange = useCallback(
    (p: number) => {
      if (p < 1 || p > totalPages) return;
      updateFilters({ page: p });
      requestAnimationFrame(scrollToLeaderboardRows);
    },
    [totalPages, scrollToLeaderboardRows, updateFilters],
  );

  const commitFilterChange = useCallback((patch: Partial<LeaderboardFilters>) => {
    updateFilters({ ...patch, search: '', page: 1 });
  }, [updateFilters]);

  const retryInsightData = useCallback(() => {
    setMetaError(null);
    setBoardError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const updateTimeLabel = formatUpdateTime(meta?.updatedAt, lang);
  const detailSearch = writeLeaderboardFilters(searchParams, filters).toString();

  return (
    <div className="insight-layout-v1">
      <div className="insight-v1-header">
        {filtersReady && meta && !metaError ? (
          <SiteSearchBox variant="insight" navigationSearch={detailSearch} />
        ) : null}
      </div>
      <div className={`insight-merged insight-merged-console ${filterCollapsed ? 'insight-merged-console--filters-collapsed' : ''}`}>
        <section className="insight-console-board" aria-label={t('nav.insight')}>
          <LeaderboardSection
            ref={leaderboardRowsRef}
            meta={meta}
            data={leaderboardData}
            currentPageData={currentPageData}
            totalItems={filteredCount}
            rankByKey={leaderboardRankByKey}
            unitName={unitValue}
            scopeName={scopeValue}
            timeType={timeType}
            timeValue={timeValue}
            updateTimeLabel={updateTimeLabel}
            searchKeyword={searchKeyword}
            currentPage={currentPage}
            loading={!metaError && !boardError && (!filtersReady || boardLoading)}
            error={metaError || boardError}
            onRetry={retryInsightData}
            onClearSearch={() => {
              updateFilters({ search: '', page: 1 });
            }}
            detailSearch={detailSearch}
          />
        </section>
        <aside className="insight-console-panel" aria-label={t('insight.filterConditions')}>
          <FilterPanel
            meta={meta}
            scopeValue={scopeValue}
            unitValue={unitValue}
            timeType={timeType}
            timeValue={timeValue}
            searchKeyword={searchKeyword}
            onScopeChange={(v) => {
              commitFilterChange({ scope: v });
            }}
            onUnitChange={(v) => {
              commitFilterChange({ unit: v });
            }}
            onTimeChange={(nextTimeType, nextTimeValue) => {
              commitFilterChange({ timeType: nextTimeType, time: nextTimeValue });
            }}
            onSearchChange={(v) => {
              updateFilters({ search: v, page: 1 }, { replace: true });
            }}
            onSearchClear={() => {
              updateFilters({ search: '', page: 1 });
            }}
            filterCollapsed={filterCollapsed}
            onToggleCollapse={() => setFilterCollapsed((c) => !c)}
            paginationSlot={
              <PaginationControl
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            }
          />
        </aside>
      </div>
    </div>
  );
}
