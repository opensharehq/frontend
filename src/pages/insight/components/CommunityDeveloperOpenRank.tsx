import { Icon } from '@iconify/react/offline';
import { useEffect, useMemo, useState } from 'react';
import type { Lang, LeaderboardItem, LeaderboardMeta } from '../types/api';
import {
  buildCommunityOpenRankDisplayRows,
  getCommunityOpenRankDataBounds,
  type CommunityOpenRankDetailsFile,
} from '../domain/communityOpenRankDetails';
import { TimeRangePicker } from './TimeRangePicker';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { PaginationControl } from './PaginationControl';
import { DeltaDisplay } from './DeltaDisplay';
import { getDeveloperProfileUrlByPlatform } from '../domain/repoPlatform';
import { RepoPlatformIcon } from './RepoPlatformIcon';

const PAGE_SIZE = 10;

type Props = {
  details: CommunityOpenRankDetailsFile;
  meta: LeaderboardMeta | null;
  timeType: 'month' | 'year';
  sectionTimeValue: string;
  onSectionTimeChange: (v: string) => void;
  onDeveloperClick: (item: LeaderboardItem) => void;
  lang: Lang;
  t: (k: string) => string;
};

export function CommunityDeveloperOpenRank({
  details,
  meta,
  timeType,
  sectionTimeValue,
  onSectionTimeChange,
  onDeveloperClick,
  lang,
  t,
}: Props) {
  const [page, setPage] = useState(1);

  const dataBounds = useMemo(() => getCommunityOpenRankDataBounds(details, timeType), [details, timeType]);

  const rows = useMemo(
    () => buildCommunityOpenRankDisplayRows(details, timeType, sectionTimeValue, meta, dataBounds),
    [details, timeType, sectionTimeValue, meta, dataBounds],
  );

  useEffect(() => {
    if (!dataBounds) return;
    const v = sectionTimeValue;
    if (timeType === 'year') {
      const y = parseInt(v, 10);
      if (Number.isNaN(y) || y < dataBounds.minYear || y > dataBounds.maxYear) {
        const clamped = Math.min(Math.max(Number.isNaN(y) ? dataBounds.maxYear : y, dataBounds.minYear), dataBounds.maxYear);
        onSectionTimeChange(String(clamped));
      }
    } else {
      if (v < dataBounds.minMonth || v > dataBounds.maxMonth) {
        onSectionTimeChange(v < dataBounds.minMonth ? dataBounds.minMonth : dataBounds.maxMonth);
      }
    }
  }, [dataBounds, timeType, sectionTimeValue, onSectionTimeChange]);

  const totalPages = rows.length === 0 ? 0 : Math.ceil(rows.length / PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [details, timeType, sectionTimeValue]);

  useEffect(() => {
    if (totalPages <= 0) return;
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 mb-3">
        <h4 className="text-sm font-mono font-semibold text-card-foreground">{t('insight.detailCommunityDevelopersHeading')}</h4>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
          <div className="min-w-[9rem] w-40 flex-shrink-0 sm:min-w-[9.5rem] sm:w-44">
            <TimeRangePicker
              meta={meta}
              timeType={timeType}
              timeValue={sectionTimeValue}
              lang={lang}
              t={t}
              hideOuterLabel
              dense
              boundsOverride={dataBounds}
              onValueChange={onSectionTimeChange}
              onCommit={() => {}}
            />
          </div>
          {totalPages > 0 ? (
            <div className="w-[8rem] flex-shrink-0 sm:w-36">
              <PaginationControl
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                compact
                dense
                showWhenSinglePage
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm font-mono text-muted-foreground">{t('insight.noData')}</p>
        ) : (
          <div className="min-w-[44rem] divide-y divide-border/60">
            <div
              className="flex items-center gap-2 bg-background px-2 py-2"
              role="row"
            >
              <div
                className="w-[4.25rem] flex-shrink-0 text-center font-mono text-[10px] font-semibold leading-tight text-muted-foreground sm:text-xs"
                role="columnheader"
              >
                {t('insight.detailCommunityColRank')}
              </div>
              <span
                className="flex h-6 w-8 flex-shrink-0 items-center justify-center text-center font-mono text-[10px] font-semibold leading-tight text-muted-foreground sm:text-xs"
                role="columnheader"
              >
                {t('insight.detailCommunityColPlatform')}
              </span>
              <div className="w-7 flex-shrink-0" aria-hidden />
              <div
                className="min-w-0 flex-1 font-mono text-[10px] font-semibold text-muted-foreground sm:text-xs"
                role="columnheader"
              >
                {t('insight.headerName')}
              </div>
              <div
                className="w-24 flex-shrink-0 px-0.5 text-center font-mono text-[10px] font-semibold leading-tight text-muted-foreground sm:w-28 sm:text-xs"
                role="columnheader"
              >
                {t('insight.detailCommunityColUserDashboard')}
              </div>
              <div className="flex-shrink-0 flex items-center justify-end gap-3" role="presentation">
                <div
                  className="w-28 shrink-0 text-right font-mono text-[10px] font-semibold text-muted-foreground sm:text-xs"
                  role="columnheader"
                >
                  {t('insight.headerOpenRank')}
                </div>
                <div
                  className="w-24 shrink-0 text-right font-mono text-[10px] font-semibold text-muted-foreground sm:text-xs"
                  role="columnheader"
                >
                  {t('insight.detailCommunityColChange')}
                </div>
              </div>
            </div>
            {pageRows.map((r) => {
              const profileUrl = getDeveloperProfileUrlByPlatform(r.platform, r.login);
              const nameCls = 'block truncate text-xs font-medium leading-tight text-foreground';
              return (
                <div
                  key={`${r.platform}-${r.id}-${r.login}`}
                  className="flex min-h-0 items-center gap-2 px-2 py-1 transition-colors hover:bg-secondary/70"
                >
                  <div className="flex-shrink-0 flex items-center gap-1 w-[4.25rem]">
                    <span className="w-6 text-center font-mono text-xs font-bold tabular-nums text-muted-foreground">
                      {r.rank}
                    </span>
                    <DeltaDisplay value={r.rankDelta} isInt compact />
                  </div>
                  <span
                    className="flex-shrink-0 flex items-center justify-center w-8 h-6"
                    title={r.platform}
                    aria-label={r.platform}
                  >
                    <RepoPlatformIcon platform={r.platform} size="xs" />
                  </span>
                  <div className="w-7 h-7 flex-shrink-0 relative">
                    <LeaderboardAvatar
                      avatar={r.avatarUrl}
                      displayName={r.login}
                      sizeClass="w-7 h-7"
                      circular
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {profileUrl === '#' ? (
                      <span className={nameCls}>{r.login}</span>
                    ) : (
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${nameCls} hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded`}
                      >
                        {r.login}
                      </a>
                    )}
                  </div>
                  <div className="w-24 sm:w-28 flex-shrink-0 flex justify-center items-center">
                    <button
                      type="button"
                      title={t('insight.detailCommunityColUserDashboard')}
                      aria-label={t('insight.detailCommunityColUserDashboard')}
                      onClick={() =>
                        onDeveloperClick({
                          itemType: 'user',
                          platform: r.platform,
                          id: r.id,
                          login: r.login,
                          name: r.login,
                          avatar: r.avatarUrl,
                        })
                      }
                      className="flex size-10 items-center justify-center rounded-lg border border-border bg-secondary text-primary transition-colors hover:border-primary/50 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-8"
                    >
                      <Icon icon="mdi:view-dashboard-outline" className="text-lg" aria-hidden />
                    </button>
                  </div>
                  <div className="flex-shrink-0 flex items-center justify-end gap-3">
                    <div className="w-28 text-right shrink-0">
                      <span className="font-mono text-sm font-bold leading-none tabular-nums text-foreground">
                        {r.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-24 flex justify-end shrink-0">
                      <DeltaDisplay value={r.openrankDelta} compact />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
