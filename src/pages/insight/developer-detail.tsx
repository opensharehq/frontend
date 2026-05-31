import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react/offline';
import { fetchUserMeta, fetchUserTrendData } from './api/openDiggerTrend';
import { getDeveloperProfileUrlByPlatform, inferDeveloperAvatarUrl } from './domain/repoPlatform';
import { getInsightHomePath } from './domain/routes';
import { EMPTY_TREND } from './domain/trends';
import { TrendChart } from './components/TrendChart';
import { RepoPlatformIcon } from './components/RepoPlatformIcon';
import { DeltaDisplay } from './components/DeltaDisplay';
import { LeaderboardAvatar } from './components/LeaderboardAvatar';
import { InsightDetailNav } from './components/InsightDetailNav';
import type { RepoTrendMap, TrendSeries, UserOssMeta } from './types/api';

type DeveloperTrendKey = keyof Pick<
  RepoTrendMap,
  'influence' | 'activity' | 'openIssue' | 'issueComment' | 'openPull' | 'reviewComment'
>;

function getLatest(t: TrendSeries | null): number {
  const v = t?.values || [];
  return v.length ? Number(v[v.length - 1]) : 0;
}

function getPrev(t: TrendSeries | null): number {
  const v = t?.values || [];
  return v.length >= 2 ? Number(v[v.length - 2]) : 0;
}

function getDelta(t: TrendSeries | null, latest: number, prev: number): number | null {
  const len = t?.values?.length ?? 0;
  if (len < 2) return null;
  return latest - prev;
}

function pickDeveloperTrend(
  trendData: RepoTrendMap | null,
  key: DeveloperTrendKey,
  dataKey: 'monthly' | 'yearly',
): TrendSeries {
  const series = trendData?.[key]?.[dataKey];
  return series?.values?.length ? series : EMPTY_TREND;
}

function StatCard({
  label,
  value,
  delta,
  icon,
  iconColor,
  isInt,
}: {
  label: string;
  value: number;
  delta: number | null;
  icon: string;
  iconColor: string;
  isInt?: boolean;
}) {
  const displayValue = isInt
    ? String(Math.round(value || 0))
    : value ? value.toFixed(1) : '0';
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Icon icon={icon} className={`size-4 ${iconColor}`} aria-hidden />
        <span className="min-w-0 break-words">{label}</span>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <span className="text-2xl font-bold tabular-nums text-card-foreground">
          {displayValue}
        </span>
        <DeltaDisplay value={delta} compact isInt={isInt} />
      </div>
    </div>
  );
}

export default function DeveloperDetailPage() {
  const { platform = 'github', login = '' } = useParams<{ platform: string; login: string }>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ossMeta, setOssMeta] = useState<UserOssMeta | null>(null);
  const [trendData, setTrendData] = useState<RepoTrendMap | null>(null);
  const [trendMode, setTrendMode] = useState<'month' | 'year'>('month');

  useEffect(() => {
    if (!login) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([fetchUserMeta(platform, login), fetchUserTrendData(platform, login)])
      .then(([meta, trends]) => {
        if (cancelled) return;
        if (!meta) {
          setError(true);
        } else {
          setOssMeta(meta);
          setTrendData(trends);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [platform, login]);

  const dataKey = trendMode === 'year' ? 'yearly' : 'monthly';
  const trendSeries = useMemo(
    () => ({
      influence: pickDeveloperTrend(trendData, 'influence', dataKey),
      activity: pickDeveloperTrend(trendData, 'activity', dataKey),
      openIssue: pickDeveloperTrend(trendData, 'openIssue', dataKey),
      issueComment: pickDeveloperTrend(trendData, 'issueComment', dataKey),
      openPull: pickDeveloperTrend(trendData, 'openPull', dataKey),
      reviewComment: pickDeveloperTrend(trendData, 'reviewComment', dataKey),
    }),
    [trendData, dataKey],
  );

  const timeKey = trendSeries.influence.months?.length
    ? trendSeries.influence.months[trendSeries.influence.months.length - 1]
    : '';

  const statItems = useMemo(
    () => [
      {
        key: 'influence',
        icon: 'mdi:lightning-bolt',
        iconColor: 'text-chart-3',
        label: t('insight.detailStatOpenRankInfluence'),
        trend: trendSeries.influence,
      },
      {
        key: 'activity',
        icon: 'mdi:chart-line',
        iconColor: 'text-chart-2',
        label: t('insight.detailStatActivity'),
        trend: trendSeries.activity,
      },
      {
        key: 'openIssue',
        icon: 'mdi:clipboard-alert-outline',
        iconColor: 'text-chart-4',
        label: t('insight.detailStatOpenIssue'),
        trend: trendSeries.openIssue,
        isInt: true,
      },
      {
        key: 'issueComment',
        icon: 'mdi:comment-outline',
        iconColor: 'text-chart-1',
        label: t('insight.detailStatIssueComment'),
        trend: trendSeries.issueComment,
        isInt: true,
      },
      {
        key: 'openPull',
        icon: 'mdi:source-pull',
        iconColor: 'text-primary',
        label: t('insight.detailStatOpenPull'),
        trend: trendSeries.openPull,
        isInt: true,
      },
      {
        key: 'reviewComment',
        icon: 'mdi:comment-check-outline',
        iconColor: 'text-destructive',
        label: t('insight.detailStatReviewComment'),
        trend: trendSeries.reviewComment,
        isInt: true,
      },
    ].map((item) => {
      const latest = getLatest(item.trend);
      const prev = getPrev(item.trend);
      return {
        ...item,
        latest,
        delta: getDelta(item.trend, latest, prev),
      };
    }),
    [t, trendSeries],
  );

  const trendCharts = useMemo(
    () => [
      {
        key: 'influence',
        label: t('insight.detailChartInfluenceTrend'),
        trend: trendSeries.influence,
      },
      {
        key: 'activity',
        label: t('insight.detailChartActivityTrend'),
        trend: trendSeries.activity,
      },
      {
        key: 'openIssue',
        label: t('insight.detailStatOpenIssue'),
        trend: trendSeries.openIssue,
      },
      {
        key: 'issueComment',
        label: t('insight.detailStatIssueComment'),
        trend: trendSeries.issueComment,
      },
      {
        key: 'openPull',
        label: t('insight.detailStatOpenPull'),
        trend: trendSeries.openPull,
      },
      {
        key: 'reviewComment',
        label: t('insight.detailStatReviewComment'),
        trend: trendSeries.reviewComment,
      },
    ],
    [t, trendSeries],
  );

  const profileUrl = getDeveloperProfileUrlByPlatform(platform, login);
  const avatarUrl = inferDeveloperAvatarUrl(platform, login, ossMeta?.id);

  const profileLocation = ossMeta?.info?.location?.trim() ?? '';
  const profileCompany = ossMeta?.info?.company?.trim() ?? '';
  const profileBio = ossMeta?.info?.bio?.trim() ?? '';
  const displayName = ossMeta?.info?.name?.trim() || login;

  if (loading) {
    return (
      <div className="insight-detail-layout">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
          <Icon icon="mdi:loading" className="text-4xl animate-spin" aria-hidden />
          <p>{t('insight.loadingUser')}</p>
        </div>
      </div>
    );
  }

  if (error || !ossMeta) {
    return (
      <div className="insight-detail-layout">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
          <Icon icon="mdi:database-off-outline" className="text-4xl" aria-hidden />
          <p className="text-center px-4">{t('insight.detailUserDataMissing')}</p>
          <Link to={getInsightHomePath()} className="mt-2 text-sm text-primary hover:underline">
            {t('insight.developerDetailBackToInsight')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="insight-detail-layout space-y-6">
      <InsightDetailNav
        homeLabel={t('insight.developerDetailBreadcrumbHome')}
        sectionLabel={t('insight.detailSectionDeveloper')}
        currentLabel={`@${login}`}
        backLabel={t('insight.developerDetailBackToInsight')}
      />

      {/* Developer info card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div className="size-20 flex-shrink-0 sm:size-32">
            <LeaderboardAvatar
              avatar={avatarUrl}
              displayName={displayName}
              sizeClass="size-20 sm:size-32"
              circular
              bordered={false}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="min-w-0 break-words text-xl font-bold text-balance text-card-foreground">{displayName}</h1>
              <span className="max-w-full break-all text-sm text-muted-foreground">@{login}</span>
            </div>

            {(profileLocation || profileCompany || profileBio) && (
              <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                {profileLocation && (
                  <span className="flex min-w-0 items-center gap-1">
                    <Icon icon="mdi:map-marker" className="size-4 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 break-words">{profileLocation}</span>
                  </span>
                )}
                {profileCompany && (
                  <span className="flex min-w-0 items-center gap-1">
                    <Icon icon="mdi:domain" className="size-4 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 break-words">{profileCompany}</span>
                  </span>
                )}
                {profileBio && (
                  <span className="flex min-w-0 items-center gap-1">
                    <Icon icon="mdi:card-text-outline" className="size-4 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 break-words">{profileBio}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* External link button */}
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            <RepoPlatformIcon platform={platform} size="sm" />
            <span>{t('insight.detailDeveloperProfile')}</span>
            <Icon icon="mdi:open-in-new" className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {t('insight.detailBasicStatsHeading')}
          {timeKey && <span className="ml-2 font-normal text-muted-foreground">({timeKey})</span>}
        </h2>
        <div
          className="flex rounded-lg border border-border bg-muted p-0.5"
          role="group"
          aria-label={t('insight.detailTrendModeAria')}
        >
          <button
            type="button"
            aria-pressed={trendMode === 'month'}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              trendMode === 'month'
                ? 'bg-secondary text-secondary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTrendMode('month')}
          >
            {t('insight.detailTrendModeMonth')}
          </button>
          <button
            type="button"
            aria-pressed={trendMode === 'year'}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              trendMode === 'year'
                ? 'bg-secondary text-secondary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTrendMode('year')}
          >
            {t('insight.detailTrendModeYear')}
          </button>
        </div>
      </div>

      {/* Primary stats - OpenRank + Activity */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {statItems.slice(0, 2).map((item) => (
          <StatCard
            key={item.key}
            icon={item.icon}
            iconColor={item.iconColor}
            label={item.label}
            value={item.latest}
            delta={item.delta}
          />
        ))}
      </div>

      {/* Detail stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.slice(2).map((item) => (
          <StatCard
            key={item.key}
            icon={item.icon}
            iconColor={item.iconColor}
            label={item.label}
            value={item.latest}
            delta={item.delta}
            isInt={item.isInt}
          />
        ))}
      </div>

      {/* Trend charts */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">
          {t('insight.detailHistoricalTrendHeading')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trendCharts.map((item) => (
            <TrendChart
              key={item.key}
              values={item.trend.values}
              label={item.label}
              monthLabels={item.trend.months}
              noDataText={t('insight.noData')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
