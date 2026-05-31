import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './icons/registerMdiOffline';
import { fetchLeaderboardData, fetchLeaderboardMeta } from './api/openLeaderboard';
import { buildDataUrl, getFilteredLeaderboardData, ITEMS_PER_PAGE, leaderboardItemKey } from './domain/leaderboard';
import { computeInitialTimeValue } from './domain/timeRange';
import { defaultScopeValue, defaultUnitValue, filterGroupTypesForUnitDropdown } from './domain/meta';
import { formatUpdateTime } from './domain/format';
import { normalizeInsightLang } from './domain/lang';
import type { LeaderboardItem, LeaderboardMeta } from './types/api';
import { FilterPanel } from './components/FilterPanel';
import { SiteSearchBox } from '@/app/components/site-search-box';
import { LeaderboardSection } from './components/LeaderboardSection';
import { PaginationControl } from './components/PaginationControl';

export default function InsightPage() {
  const { t, i18n } = useTranslation();
  const lang = normalizeInsightLang(i18n.language);

  const [meta, setMeta] = useState<LeaderboardMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);
  const [scopeValue, setScopeValue] = useState('');
  const [unitValue, setUnitValue] = useState('');
  const [timeType, setTimeType] = useState<'month' | 'year'>('month');
  const [timeValue, setTimeValue] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const leaderboardRowsRef = useRef<HTMLDivElement>(null);

  // Fetch meta on mount
  useEffect(() => {
    let cancelled = false;
    void fetchLeaderboardMeta()
      .then((m) => {
        if (cancelled) return;
        setMeta(m);
        const filteredUnits = filterGroupTypesForUnitDropdown(m.groupTypes);
        setScopeValue(defaultScopeValue(m.scopes, null));
        setUnitValue(defaultUnitValue(filteredUnits, null));
        setTimeValue(computeInitialTimeValue('month', m, ''));
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

  // Fetch leaderboard data when filters change
  useEffect(() => {
    if (!filtersReady || !scopeValue || !unitValue || !timeValue) return;
    const url = buildDataUrl({ scopeName: scopeValue, groupTypeName: unitValue, timeType, timeValue });
    if (!url) return;
    let cancelled = false;
    setBoardLoading(true);
    setBoardError(null);
    void fetchLeaderboardData(url)
      .then((data) => {
        if (cancelled) return;
        setLeaderboardData(data);
        setCurrentPage(1);
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
  }, [filtersReady, scopeValue, unitValue, timeType, timeValue, reloadKey]);

  const filteredLeaderboardData = useMemo(
    () => getFilteredLeaderboardData(leaderboardData, searchKeyword),
    [leaderboardData, searchKeyword],
  );
  const filteredCount = filteredLeaderboardData.length;
  const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE);
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
      setCurrentPage(p);
      requestAnimationFrame(scrollToLeaderboardRows);
    },
    [totalPages, scrollToLeaderboardRows],
  );

  const commitFilterChange = useCallback(() => {
    setSearchKeyword('');
    setCurrentPage(1);
  }, []);

  const retryInsightData = useCallback(() => {
    setMetaError(null);
    setBoardError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const updateTimeLabel = formatUpdateTime(meta?.updatedAt, lang);

  return (
    <div className="insight-layout-v1">
      <div className="insight-v1-header">
        {filtersReady && meta && !metaError ? (
          <SiteSearchBox variant="insight" />
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
              setSearchKeyword('');
              setCurrentPage(1);
            }}
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
              setScopeValue(v);
              commitFilterChange();
            }}
            onUnitChange={(v) => {
              setUnitValue(v);
              commitFilterChange();
            }}
            onTimeTypeChange={setTimeType}
            onTimeValueChange={setTimeValue}
            onSearchChange={(v) => {
              setSearchKeyword(v);
              setCurrentPage(1);
            }}
            onSearchClear={() => {
              setSearchKeyword('');
              setCurrentPage(1);
            }}
            onTimeCommit={commitFilterChange}
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
