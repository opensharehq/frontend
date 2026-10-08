import { Icon } from '@iconify/react/offline';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Lang, LeaderboardMeta } from '../types/api';
import { normalizeInsightLang } from '../domain/lang';
import { formatTimeDisplay, getTimeBounds, type TimeBounds } from '../domain/timeRange';

/** Month abbreviations for the time-range picker grid */
const MONTH_SHORT_NAMES: Record<Lang, readonly string[]> = {
  zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Number of years displayed per page in the year-grid quick-select view */
const YEAR_PAGE_SIZE = 12;

type Props = {
  meta: LeaderboardMeta | null;
  timeType: 'month' | 'year';
  timeValue: string;
  lang: Lang;
  t: (k: string) => string;
  onValueChange: (v: string) => void;
  onCommit?: () => void;
  /** Hide the calendar icon + "Time selection" label row (e.g. embedded in detail panel header). */
  hideOuterLabel?: boolean;
  /** Smaller control height and text (e.g. contributor list toolbar). */
  dense?: boolean;
  /** When set (e.g. community detail JSON keys), min/max selectable range follows this instead of global meta. */
  boundsOverride?: TimeBounds | null;
  /** Called when the dropdown opens or closes, so parent containers can adjust overflow. */
  onOpenChange?: (open: boolean) => void;
};

export function TimeRangePicker({
  meta,
  timeType,
  timeValue,
  lang,
  t,
  onValueChange,
  onCommit,
  hideOuterLabel = false,
  dense = false,
  boundsOverride = null,
  onOpenChange,
}: Props) {
  const normalizedLang = normalizeInsightLang(lang);
  const [open, setOpen] = useState(false);
  const dropdownId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  const wrapRef = useRef<HTMLDivElement>(null);

  const bounds: TimeBounds = boundsOverride ?? getTimeBounds(meta);

  // Year currently associated with the committed timeValue
  const valueYear = (() => {
    const raw =
      timeType === 'year'
        ? parseInt(timeValue || String(bounds.maxYear), 10)
        : parseInt((timeValue || bounds.maxMonth).split('-')[0], 10);
    return Number.isFinite(raw) ? raw : bounds.maxYear;
  })();

  // displayYear: the year shown inside the dropdown's month/year grids.
  // Internal navigation only updates this state, NOT the committed timeValue,
  // so panel browsing does NOT trigger a leaderboard refresh.
  const [displayYear, setDisplayYear] = useState<number>(valueYear);
  // Whether the dropdown body shows the year-grid quick-select view
  const [yearSelectMode, setYearSelectMode] = useState<boolean>(timeType === 'year');
  // Leftmost year of the current year-grid page (12 years per page)
  const [yearPageStart, setYearPageStart] = useState<number>(
    () => valueYear - (((valueYear % YEAR_PAGE_SIZE) + YEAR_PAGE_SIZE) % YEAR_PAGE_SIZE),
  );

  // Re-sync internal picker state whenever the dropdown opens, so reopening
  // always starts from the currently committed value (not stale browsing state).
  useEffect(() => {
    if (!open) return;
    setDisplayYear(valueYear);
    setYearPageStart(valueYear - (((valueYear % YEAR_PAGE_SIZE) + YEAR_PAGE_SIZE) % YEAR_PAGE_SIZE));
    setYearSelectMode(timeType === 'year');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closeOnOutside = useCallback(
    (e: MouseEvent) => {
      const wrap = wrapRef.current;
      if (wrap && !wrap.contains(e.target as Node)) {
        setOpen(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => document.addEventListener('click', closeOnOutside, true), 0);
    } else {
      document.removeEventListener('click', closeOnOutside, true);
    }
    return () => document.removeEventListener('click', closeOnOutside, true);
  }, [open, closeOnOutside]);

  // Outer arrows next to the display: keep the existing "step + commit" UX.
  const stepTime = (delta: number) => {
    if (timeType === 'year') {
      const y = valueYear;
      if ((delta < 0 && y <= bounds.minYear) || (delta > 0 && y >= bounds.maxYear)) return;
      const ny = Math.max(bounds.minYear, Math.min(bounds.maxYear, y + delta));
      onValueChange(String(ny));
    } else {
      const val = timeValue || bounds.maxMonth;
      if ((delta < 0 && val <= bounds.minMonth) || (delta > 0 && val >= bounds.maxMonth)) return;
      const [y, m] = val.split('-').map(Number);
      const date = new Date(y, m - 1, 1);
      date.setMonth(date.getMonth() + delta);
      let nval = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (nval < bounds.minMonth) nval = bounds.minMonth;
      if (nval > bounds.maxMonth) nval = bounds.maxMonth;
      onValueChange(nval);
    }
    onCommit?.();
  };

  // Inner year arrows in month-grid header: only mutate displayYear, no commit.
  const stepYearInPicker = (delta: number) => {
    const ny = Math.max(bounds.minYear, Math.min(bounds.maxYear, displayYear + delta));
    if (ny === displayYear) return;
    setDisplayYear(ny);
  };

  // Year-grid pagination (one page = 12 years), no commit.
  const stepYearPage = (delta: number) => {
    setYearPageStart((s) => s + delta * YEAR_PAGE_SIZE);
  };

  // Toggle from month-grid into year-grid quick-select, no commit.
  const enterYearSelectMode = () => {
    setYearPageStart(displayYear - (((displayYear % YEAR_PAGE_SIZE) + YEAR_PAGE_SIZE) % YEAR_PAGE_SIZE));
    setYearSelectMode(true);
  };

  // Click a month in the month-grid: this is the commit point for month-type.
  const selectMonth = (month: number) => {
    const m = String(month).padStart(2, '0');
    const val = `${displayYear}-${m}`;
    if (val < bounds.minMonth || val > bounds.maxMonth) return;
    onValueChange(val);
    setOpen(false);
    onCommit?.();
  };

  // Click a year in the year-grid:
  //   - year-type: commit immediately (year is the final value)
  //   - month-type: only update displayYear, return to month-grid (no commit)
  const selectYearInGrid = (year: number) => {
    if (year < bounds.minYear || year > bounds.maxYear) return;
    if (timeType === 'year') {
      onValueChange(String(year));
      setOpen(false);
      onCommit?.();
    } else {
      setDisplayYear(year);
      setYearSelectMode(false);
    }
  };

  const prevDisabled =
    timeType === 'year'
      ? valueYear <= bounds.minYear
      : (timeValue || bounds.maxMonth) <= bounds.minMonth;
  const nextDisabled =
    timeType === 'year'
      ? valueYear >= bounds.maxYear
      : (timeValue || bounds.maxMonth) >= bounds.maxMonth;

  // Inner header arrow disabled state depends on which view is shown
  const prevYearDisabled = displayYear <= bounds.minYear;
  const nextYearDisabled = displayYear >= bounds.maxYear;
  const prevYearPageDisabled = yearPageStart <= bounds.minYear;
  const nextYearPageDisabled = yearPageStart + YEAR_PAGE_SIZE - 1 >= bounds.maxYear;

  const monthNames = MONTH_SHORT_NAMES[normalizedLang] ?? MONTH_SHORT_NAMES.en;
  const currentMonth =
    timeType === 'month' ? parseInt((timeValue || '').split('-')[1] || '0', 10) || 0 : 0;
  // Selected year used for highlighting in the year-grid / month-grid
  const selectedYearForHighlight = timeValue
    ? timeType === 'year'
      ? parseInt(timeValue, 10) || null
      : parseInt(timeValue.split('-')[0], 10) || null
    : null;
  const yearGridYears = Array.from({ length: YEAR_PAGE_SIZE }, (_, i) => yearPageStart + i);

  return (
    <div>
      {!hideOuterLabel ? (
        <label
          className={`mb-2 flex items-center gap-2 font-medium text-muted-foreground ${dense ? 'text-xs' : 'text-sm'}`}
        >
          <Icon icon="mdi:calendar" className={dense ? 'text-sm' : 'text-base'} />
          <span>{t('insight.timeSelection')}</span>
        </label>
      ) : null}
      <div
        ref={wrapRef}
        className="relative"
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !open) return;
          e.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }}
      >
        <div
          className={`flex items-center overflow-hidden border border-border bg-background ${dense ? 'rounded-md' : 'rounded-lg'}`}
        >
          <button
            type="button"
            aria-label={t('insight.timePrev')}
            disabled={prevDisabled}
            onClick={(e) => {
              e.stopPropagation();
              stepTime(-1);
            }}
            className={`time-picker-arrow flex flex-shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${dense ? 'size-10 sm:size-7' : 'h-10 w-9'}`}
          >
            <Icon icon="mdi:chevron-left" className={dense ? 'text-sm' : 'text-lg'} aria-hidden />
          </button>
          <button
            ref={triggerRef}
            type="button"
            aria-label={t('insight.timeSelection')}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={dropdownId}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center text-foreground transition-colors hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${dense ? 'min-h-10 px-2 py-1 text-xs sm:min-h-7' : 'px-3 py-2.5 text-sm'}`}
          >
            <span className="truncate">{formatTimeDisplay(timeValue, timeType, normalizedLang)}</span>
          </button>
          <button
            type="button"
            aria-label={t('insight.timeNext')}
            disabled={nextDisabled}
            onClick={(e) => {
              e.stopPropagation();
              stepTime(1);
            }}
            className={`time-picker-arrow flex flex-shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${dense ? 'size-10 sm:size-7' : 'h-10 w-9'}`}
          >
            <Icon icon="mdi:chevron-right" className={dense ? 'text-sm' : 'text-lg'} aria-hidden />
          </button>
        </div>
        <div
          id={dropdownId}
          className={`time-picker-dropdown ${open ? 'show' : ''}${dense ? ' time-picker-dropdown--dense' : ''}`}
          role="dialog"
          aria-label={t('insight.timeSelection')}
        >
          <div className={`flex items-center justify-between gap-2 ${dense ? 'mb-2' : 'mb-3'}`}>
            <button
              type="button"
              aria-label={t('insight.ariaPickerPreviousYear')}
              disabled={yearSelectMode ? prevYearPageDisabled : prevYearDisabled}
              onClick={(e) => {
                e.stopPropagation();
                if (yearSelectMode) stepYearPage(-1);
                else stepYearInPicker(-1);
              }}
              className={`time-picker-arrow flex cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring ${dense ? 'size-9 sm:size-6' : 'size-8'}`}
            >
              <Icon icon="mdi:chevron-left" className={dense ? 'text-sm' : 'text-lg'} aria-hidden />
            </button>
            {yearSelectMode ? (
              <span
                className={`flex-1 text-center font-medium text-foreground ${dense ? 'text-xs' : 'text-sm'}`}
              >
                {`${yearPageStart} - ${yearPageStart + YEAR_PAGE_SIZE - 1}`}
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  enterYearSelectMode();
                }}
                className={`flex-1 cursor-pointer rounded text-center font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring ${dense ? 'py-1 text-xs' : 'py-1 text-sm'}`}
              >
                {displayYear}
              </button>
            )}
            <button
              type="button"
              aria-label={t('insight.ariaPickerNextYear')}
              disabled={yearSelectMode ? nextYearPageDisabled : nextYearDisabled}
              onClick={(e) => {
                e.stopPropagation();
                if (yearSelectMode) stepYearPage(1);
                else stepYearInPicker(1);
              }}
              className={`time-picker-arrow flex cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring ${dense ? 'size-9 sm:size-6' : 'size-8'}`}
            >
              <Icon icon="mdi:chevron-right" className={dense ? 'text-sm' : 'text-lg'} aria-hidden />
            </button>
          </div>
          {yearSelectMode ? (
            <div className="grid grid-cols-3 gap-1">
              {yearGridYears.map((y) => {
                const inRange = y >= bounds.minYear && y <= bounds.maxYear;
                const isActive =
                  selectedYearForHighlight !== null && y === selectedYearForHighlight;
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={!inRange}
                    aria-pressed={isActive}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectYearInGrid(y);
                    }}
                    className={
                      'time-picker-year-btn cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-ring transition-colors duration-150 ' +
                      (isActive
                        ? 'border border-primary/50 bg-primary/10 text-primary'
                        : 'border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-primary')
                    }
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          ) : (
            timeType === 'month' && (
              <div className="flex flex-wrap gap-1">
                {monthNames.map((nm, i) => {
                  const month = i + 1;
                  const val = `${displayYear}-${String(month).padStart(2, '0')}`;
                  const isInRange = val >= bounds.minMonth && val <= bounds.maxMonth;
                  const isActive =
                    month === currentMonth &&
                    selectedYearForHighlight !== null &&
                    displayYear === selectedYearForHighlight;
                  return (
                    <button
                      key={month}
                      type="button"
                      disabled={!isInRange}
                      aria-pressed={isActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectMonth(month);
                      }}
                      className={
                        'time-picker-month-btn cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-ring transition-colors duration-150 ' +
                        (isActive
                          ? 'border border-primary/50 bg-primary/10 text-primary'
                          : 'border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-primary')
                      }
                    >
                      {nm}
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
