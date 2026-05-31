import { Icon } from '@iconify/react/offline';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { LeaderboardMeta } from '../types/api';
import { filterGroupTypesForUnitDropdown } from '../domain/meta';
import { TimeRangePicker } from './TimeRangePicker';
import { computeInitialTimeValue } from '../domain/timeRange';
import { normalizeInsightLang } from '../domain/lang';

type Props = {
  meta: LeaderboardMeta | null;
  scopeValue: string;
  unitValue: string;
  timeType: 'month' | 'year';
  timeValue: string;
  searchKeyword: string;
  onScopeChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  onTimeTypeChange: (v: 'month' | 'year') => void;
  onTimeValueChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onSearchClear: () => void;
  onTimeCommit: () => void;
  filterCollapsed: boolean;
  onToggleCollapse: () => void;
  paginationSlot: ReactNode;
};

export function FilterPanel({
  meta,
  scopeValue,
  unitValue,
  timeType,
  timeValue,
  searchKeyword,
  onScopeChange,
  onUnitChange,
  onTimeTypeChange,
  onTimeValueChange,
  onSearchChange,
  onSearchClear,
  onTimeCommit,
  filterCollapsed,
  onToggleCollapse,
  paginationSlot,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = normalizeInsightLang(i18n.language);

  const scopes = meta?.scopes ?? [];
  const filteredUnits = meta ? filterGroupTypesForUnitDropdown(meta.groupTypes) : [];

  const scopeLabel = (() => {
    const s = scopes.find((x) => x && (x.name === scopeValue || x.name_zh === scopeValue));
    if (!s) return scopeValue || t('insight.loading');
    return lang === 'zh' ? (s.name_zh ?? s.name ?? '') : (s.name ?? s.name_zh ?? '');
  })();

  const unitLabel = (() => {
    const g = filteredUnits.find((x) => x && (x.name === unitValue || x.name_zh === unitValue));
    if (!g) return unitValue || t('insight.loading');
    return lang === 'zh' ? (g.name_zh ?? g.name ?? '') : (g.name ?? g.name_zh ?? '');
  })();

  return (
    <div
      id="filterPanel"
      className={`insight-filter-panel flex-shrink-0 overflow-visible transition-all duration-150 ${filterCollapsed ? 'is-collapsed' : ''}`}
    >
      <div className="insight-filter-card sticky top-6 rounded-xl border border-border bg-card p-4 shadow-sm max-xl:static">
        <button
          type="button"
          id="filterToggle"
          title={t('insight.filterPanelToggleTitle')}
          aria-expanded={!filterCollapsed}
          aria-controls="filterContent"
          onClick={onToggleCollapse}
          className="insight-filter-toggle mb-4 flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg text-sm font-semibold text-foreground outline-none transition-colors duration-150 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="insight-filter-toggle-label flex min-w-0 items-center gap-2">
            <Icon icon="mdi:filter" className="flex-shrink-0" />
            <span className="min-w-0">
              <span id="filterTitleText" className="block truncate">
                {t('insight.filterConditions')}
              </span>
              <span className="insight-filter-toggle-summary block truncate text-xs font-normal text-muted-foreground">
                {scopeLabel} · {unitLabel}
              </span>
            </span>
          </div>
          <Icon
            id="filterToggleIcon"
            icon={filterCollapsed ? 'mdi:chevron-left' : 'mdi:chevron-right'}
            className="flex-shrink-0 transition-transform duration-150"
          />
        </button>
        <div id="filterContent" className={`space-y-4 ${filterCollapsed ? 'hidden' : ''}`}>
          <div>
            <label id="scopeSelectLabel" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon icon="mdi:earth" />
              <span>{t('insight.leaderboardScope')}</span>
            </label>
            <Select value={scopeValue} onValueChange={(value) => onScopeChange(value)} disabled={!scopes.length}>
              <SelectTrigger id="scopeSelectTrigger" aria-labelledby="scopeSelectLabel scopeSelectTrigger" className="h-10 bg-background">
                <SelectValue placeholder={scopeLabel} />
              </SelectTrigger>
              <SelectContent>
                {scopes.map((s) => {
                  const name = s.name ?? s.name_zh ?? '';
                  if (!name) return null;
                  const display = lang === 'zh' ? (s.name_zh ?? s.name ?? name) : (s.name ?? s.name_zh ?? name);
                  return (
                    <SelectItem
                      key={name}
                      value={name}
                    >
                      {display}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label id="unitSelectLabel" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon icon="mdi:chart-bar" />
              <span>{t('insight.rankingUnit')}</span>
            </label>
            <Select value={unitValue} onValueChange={(value) => onUnitChange(value)} disabled={!filteredUnits.length}>
              <SelectTrigger id="unitSelectTrigger" aria-labelledby="unitSelectLabel unitSelectTrigger" className="h-10 bg-background">
                <SelectValue placeholder={unitLabel} />
              </SelectTrigger>
              <SelectContent>
                {filteredUnits.map((g) => {
                  const name = g.name ?? g.name_zh ?? '';
                  if (!name) return null;
                  const display = lang === 'zh' ? (g.name_zh ?? g.name ?? name) : (g.name ?? g.name_zh ?? name);
                  return (
                    <SelectItem
                      key={name}
                      value={name}
                    >
                      {display}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label id="timeTypeLabel" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon icon="mdi:calendar" />
              <span>{t('insight.timeRangeType')}</span>
            </label>
            <div
              id="timeTypeToggleGroup"
              className="flex rounded-lg border border-border bg-background p-0.5"
              role="group"
              aria-label={t('insight.timeRangeTypeToggle')}
            >
              <button
                type="button"
                id="timeTypeMonth"
                aria-pressed={timeType === 'month'}
                className={`detail-trend-toggle flex-1 rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors ${timeType === 'month' ? 'active' : ''}`}
                onClick={() => {
                  if (timeType === 'month') return;
                  onTimeTypeChange('month');
                  onTimeValueChange(computeInitialTimeValue('month', meta, timeValue));
                  onTimeCommit();
                }}
              >
                {t('insight.byMonth')}
              </button>
              <button
                type="button"
                id="timeTypeYear"
                aria-pressed={timeType === 'year'}
                className={`detail-trend-toggle flex-1 rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors ${timeType === 'year' ? 'active' : ''}`}
                onClick={() => {
                  if (timeType === 'year') return;
                  onTimeTypeChange('year');
                  onTimeValueChange(computeInitialTimeValue('year', meta, timeValue));
                  onTimeCommit();
                }}
              >
                {t('insight.byYear')}
              </button>
            </div>
          </div>
          <div id="timeRangeContainer">
            <TimeRangePicker
              meta={meta}
              timeType={timeType}
              timeValue={timeValue}
              lang={lang}
              t={t}
              onValueChange={onTimeValueChange}
              onCommit={onTimeCommit}
            />
          </div>
          <div>
            <label htmlFor="openLeaderboardSearchInput" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon icon="mdi:magnify" />
              <span>{t('insight.search')}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="openLeaderboardSearchInput"
                placeholder={t('insight.searchPlaceholder')}
                value={searchKeyword}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground outline-none transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                id="searchClearBtn"
                title={t('insight.clearSearch')}
                aria-label={t('insight.clearSearch')}
                onClick={onSearchClear}
                className={`absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${searchKeyword.trim() ? '' : 'hidden'}`}
              >
                <Icon icon="mdi:close" className="text-base" />
              </button>
            </div>
          </div>
          <div id="paginationSection">{paginationSlot}</div>
        </div>
      </div>
    </div>
  );
}
