import { Icon } from '@iconify/react/offline';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LeaderboardItem, LeaderboardMeta, MetaGroupType } from '../types/api';
import { getItemTypeFromUnit, ITEMS_PER_PAGE, joinZhLeaderboardScopeUnit, leaderboardItemKey } from '../domain/leaderboard';
import { formatUpdateTime } from '../domain/format';
import { formatTimeDisplay } from '../domain/timeRange';
import { leaderboardAvatarForItem } from '../domain/geography';
import { normalizeInsightLang } from '../domain/lang';
import { getDeveloperDetailPath, getLabelDetailPath, getRepoDetailPath } from '../domain/routes';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { DeltaDisplay } from './DeltaDisplay';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';

type HeaderProps = {
  meta: LeaderboardMeta | null;
  scopeName: string;
  unitName: string;
};

export function LeaderboardHeader({ meta, scopeName, unitName }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const lang = normalizeInsightLang(i18n.language);

  const currentScope = meta?.scopes?.find((s) => s.name === scopeName);
  const currentGroupType = meta?.groupTypes?.find((g) => g.name === unitName);

  const title =
    lang === 'zh'
      ? (currentScope?.name_zh || currentScope?.name || scopeName)
      : (currentScope?.name || scopeName);
  const unitDisplay =
    lang === 'zh'
      ? (currentGroupType?.name_zh || currentGroupType?.name || unitName)
      : (currentGroupType?.name || unitName);

  const leaderboardTitle =
    lang === 'zh'
      ? t('insight.leaderboardTitleTemplate').replace('{{scopeUnit}}', joinZhLeaderboardScopeUnit(title, unitDisplay))
      : t('insight.leaderboardTitleTemplate').replace('{{scope}}', title).replace('{{unit}}', unitDisplay);

  return (
    <div id="leaderboardTitle" className="px-6 pb-3 pt-5">
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="flex items-center justify-center gap-2 text-balance text-lg font-semibold text-foreground sm:text-xl">
          <span className="truncate">{leaderboardTitle}</span>
        </h2>
      </div>
    </div>
  );
}

type Props = {
  meta: LeaderboardMeta | null;
  data: LeaderboardItem[];
  currentPageData: LeaderboardItem[];
  totalItems: number;
  rankByKey: Map<string, number>;
  unitName: string;
  scopeName: string;
  scopeLabel?: string;
  unitLabel?: string;
  timeType: 'month' | 'year';
  timeValue: string;
  updateTimeLabel?: string;
  searchKeyword: string;
  currentPage: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClearSearch?: () => void;
};

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2 px-6 pt-2" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex min-h-11 items-center gap-3 rounded-lg bg-background/70 px-3 py-2">
          <Skeleton className="h-5 w-24 flex-shrink-0" />
          <Skeleton className="size-9 flex-shrink-0 rounded" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <Skeleton className="h-8 w-24 flex-shrink-0" />
          <Skeleton className="h-8 w-32 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export const LeaderboardSection = forwardRef<HTMLDivElement, Props>(function LeaderboardSection(
  {
    meta,
    data,
    currentPageData,
    totalItems,
    rankByKey,
    unitName,
    scopeName,
    scopeLabel,
    unitLabel,
    timeType,
    timeValue,
    updateTimeLabel,
    searchKeyword,
    currentPage,
    loading = false,
    error = null,
    onRetry,
    onClearSearch,
  }: Props,
  ref,
) {
  const { t, i18n } = useTranslation();
  const lang = normalizeInsightLang(i18n.language);

  const currentGroupType = meta?.groupTypes?.find((g) => g.name === unitName);
  const currentScope = meta?.scopes?.find((s) => s.name === scopeName || s.name_zh === scopeName);
  const groupType = meta?.groupTypes?.find((g) => g.name === unitName || g.name_zh === unitName);
  const resolvedScopeLabel =
    scopeLabel ||
    (lang === 'zh'
      ? (currentScope?.name_zh || currentScope?.name || scopeName)
      : (currentScope?.name || currentScope?.name_zh || scopeName));
  const resolvedUnitLabel =
    unitLabel ||
    (lang === 'zh'
      ? (groupType?.name_zh || groupType?.name || unitName)
      : (groupType?.name || groupType?.name_zh || unitName));

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const hasSearch = searchKeyword.trim().length > 0;
  const timeLabel = formatTimeDisplay(timeValue, timeType, lang);
  const dataUpdateLabel = updateTimeLabel || formatUpdateTime(meta?.updatedAt, lang);

  return (
    <div id="leaderboardContent" className="min-w-0 flex-1">
      <div id="leaderboardTable" className="rounded-xl border border-border bg-card pb-6 shadow-sm">
        <LeaderboardHeader meta={meta} scopeName={scopeName} unitName={unitName} />
        <div className="mx-6 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t('insight.querySummary')}</span>
          <span>{resolvedScopeLabel}</span>
          <span aria-hidden>·</span>
          <span>{resolvedUnitLabel}</span>
          <span aria-hidden>·</span>
          <span>{timeLabel}</span>
          <span aria-hidden>·</span>
          <span>{t('insight.resultCount').replace('{{count}}', String(totalItems))}</span>
          {hasSearch ? (
            <>
              <span aria-hidden>·</span>
              <span>{t('insight.searchTerm').replace('{{keyword}}', searchKeyword.trim())}</span>
            </>
          ) : null}
          {dataUpdateLabel ? (
            <>
              <span aria-hidden>·</span>
              <span>{dataUpdateLabel}</span>
            </>
          ) : null}
        </div>
        <div className="leaderboard-scroll">
          <div className="leaderboard-table-min">
            <div
              className="mx-6 flex items-center gap-3 border-b border-border px-3 pb-2"
            >
              <div className="flex w-24 flex-shrink-0 items-center gap-2">
                <div className="w-12 flex-shrink-0 text-center">
                  <span className="font-mono text-xs font-semibold leading-tight text-muted-foreground">{t('insight.headerRank')}</span>
                </div>
                <div className="w-12 flex-shrink-0" />
              </div>
              <div className="size-9 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs font-semibold leading-tight text-muted-foreground">{t('insight.headerName')}</span>
              </div>
              <div className="w-32 flex-shrink-0 text-right">
                <span className="font-mono text-xs font-semibold leading-tight text-muted-foreground">{t('insight.headerOpenRank')}</span>
              </div>
              <div className="w-48 flex-shrink-0 text-right">
                <span className="whitespace-nowrap font-mono text-xs font-semibold leading-tight text-muted-foreground">
                  {t('insight.headerCommunityParticipants')}
                </span>
              </div>
            </div>
            <div id="leaderboardDataRows" ref={ref} className="space-y-1.5 px-6 pt-2">
              {loading ? (
                <LeaderboardSkeleton />
              ) : error ? (
                <div className="mx-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-8 text-center text-sm text-foreground">
                  <p className="font-medium text-destructive">{t('insight.leaderboardLoadFailed')}</p>
                  <p className="mt-1 text-muted-foreground">{error}</p>
                  {onRetry ? (
                    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                      <Icon icon="mdi:reload" aria-hidden />
                      {t('common.retry')}
                    </Button>
                  ) : null}
                </div>
              ) : !data || data.length === 0 || currentPageData.length === 0 ? (
                <div className="mx-3 rounded-lg border border-border bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{t('insight.emptyTitle')}</p>
                  <p className="mt-1">{hasSearch ? t('insight.emptySearchHint') : t('insight.emptyFilterHint')}</p>
                  {hasSearch && onClearSearch ? (
                    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onClearSearch}>
                      {t('insight.clearSearch')}
                    </Button>
                  ) : null}
                </div>
          ) : (
            currentPageData.map((item, index) => {
              const rank = rankByKey.get(leaderboardItemKey(item)) ?? startIndex + index + 1;
              const medalClass =
                rank === 1 ? 'text-chart-4' : rank === 2 ? 'text-muted-foreground' : rank === 3 ? 'text-chart-3' : 'text-muted-foreground';
              const medalIcon =
                rank === 1
                  ? 'mdi:trophy'
                  : rank === 2
                    ? 'mdi:trophy-outline'
                    : rank === 3
                      ? 'mdi:medal'
                      : `mdi:numeric-${rank}-circle`;

              const displayName =
                lang === 'zh' ? (item.name_zh || item.name || '') : (item.name || '');
              const displayDesc =
                lang === 'zh'
                  ? (item.description_zh || item.description || '')
                  : (item.description || item.description_zh || '');
              const score = item.openrank || 0;
              const openrankDelta =
                item.openrankDelta !== undefined && item.openrankDelta !== null ? item.openrankDelta : 0;
              const participants = item.participants || 0;
              const participantsDelta =
                item.participantsDelta !== undefined && item.participantsDelta !== null
                  ? item.participantsDelta
                  : 0;
              const rankDelta = item.rankDelta !== undefined && item.rankDelta !== null ? item.rankDelta : 0;

              const avatar = leaderboardAvatarForItem(item, unitName, currentGroupType as MetaGroupType);
              const detailPath = getLeaderboardDetailPath(item, unitName);

              return (
                <Link
                  key={`${item.id ?? item.name}-${startIndex + index}`}
                  to={detailPath}
                  className="leaderboard-row flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-background/70 px-3 py-2 outline-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-border hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex w-24 flex-shrink-0 items-center gap-2">
                    <div className={`font-mono text-base font-semibold ${medalClass} w-12 flex-shrink-0 text-center`}>
                      {rank < 4 ? (
                        <Icon icon={medalIcon} className="text-xl" aria-hidden />
                      ) : (
                        <span>{rank}</span>
                      )}
                    </div>
                    <div className="flex w-12 flex-shrink-0 items-center justify-start">
                      <DeltaDisplay value={rankDelta} isInt />
                    </div>
                  </div>
                  <div className="relative size-9 flex-shrink-0">
                    <LeaderboardAvatar avatar={avatar} displayName={displayName} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 truncate text-sm font-semibold text-foreground">{displayName}</div>
                    {displayDesc ? (
                      <div className="truncate text-xs text-muted-foreground">{displayDesc}</div>
                    ) : null}
                  </div>
                  <div className="w-32 flex-shrink-0 text-right">
                    <div className="font-mono text-base font-semibold text-foreground tabular-nums">{score.toFixed(1)}</div>
                    <div className="mt-0.5 flex items-center justify-end">
                      <DeltaDisplay value={openrankDelta} />
                    </div>
                  </div>
                  <div className="w-48 flex-shrink-0 text-right">
                    <div className="font-mono text-base font-semibold text-foreground tabular-nums">{Math.round(participants)}</div>
                    <div className="mt-0.5 flex items-center justify-end">
                      <DeltaDisplay value={participantsDelta} isInt />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function getLeaderboardDetailPath(item: LeaderboardItem, unitName: string): string {
  const itemType = getItemTypeFromUnit(unitName);
  const rawId = item.id || '';
  const isLabelId = rawId.startsWith(':') || rawId.startsWith('#');
  if (itemType === 'label' || isLabelId) {
    return getLabelDetailPath(rawId);
  }
  if (itemType === 'repo') {
    const fullName = item.name && item.name.includes('/') ? item.name : rawId;
    const [owner, repo] = fullName.split('/');
    if (!owner || !repo) {
      return getLabelDetailPath(rawId || item.name || '');
    }
    return getRepoDetailPath(item.platform || 'github', owner, repo);
  }
  return getDeveloperDetailPath(item.platform || 'github', item.login || item.name || rawId);
}
