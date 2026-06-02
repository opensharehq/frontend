import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchItemMeta, fetchLabelTrendData } from './api/openDiggerTrend';
import { fetchCommunityOpenRankDetails } from './api/communityOpenRankDetails';
import { getLabelDetailPath, getDeveloperDetailPath } from './domain/routes';
import { TrendChart } from './components/TrendChart';
import { CommunityDeveloperOpenRank } from './components/CommunityDeveloperOpenRank';
import { LeaderboardAvatar } from './components/LeaderboardAvatar';
import { RepoPlatformIcon } from './components/RepoPlatformIcon';
import { InsightDetailNav } from './components/InsightDetailNav';
import { enrichLabelItemWithMeta, getLabelDetailDescriptionFromMeta } from './domain/detailHelpers';
import { preprocessContributions } from './domain/geography';
import { normalizeInsightLang } from './domain/lang';
import { isClickableDetailMetaLabelType, isDivisionZeroTypeName, LABEL_TYPE_MAP } from './domain/labelTypes';
import { divisionLabelFlagAvatarUrl } from './domain/geography';
import { getRepoUrlByPlatform } from './domain/repoPlatform';
import { EMPTY_TREND } from './domain/trends';
import { computeInitialTimeValue } from './domain/timeRange';
import type {
  ContributionRow,
  LeaderboardItem,
  MetaLabelEntry,
  RepoTrendMap,
} from './types/api';
import type { CommunityOpenRankDetailsFile } from './domain/communityOpenRankDetails';

const ContributionMap = lazy(() =>
  import('./components/ContributionMap').then((module) => ({ default: module.ContributionMap })),
);

function getChangePct(latest: number, prev: number): string {
  if (!prev || prev === 0) return latest > 0 ? '100' : '0';
  return (((latest - prev) / prev) * 100).toFixed(1);
}

function getLatest(t: { values?: number[] } | null): number {
  const v = t?.values || [];
  return v.length ? Number(v[v.length - 1]) : 0;
}

function getPrev(t: { values?: number[] } | null): number {
  const v = t?.values || [];
  return v.length >= 2 ? Number(v[v.length - 2]) : 0;
}

function getStatDelta(t: { values?: number[] } | null, latest: number, prev: number): number | null {
  const len = t?.values?.length ?? 0;
  if (len < 2) return null;
  return latest - prev;
}

const statDeltaFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

function getLabelBreadcrumbSection(labelId: string, labelType: string | null | undefined, t: (key: string) => string) {
  const normalizedType = labelType || '';
  const namespace = labelId.split('/')[0]?.toLowerCase() || '';
  if (normalizedType === 'Project' || namespace === 'projects') return t('insight.detailSectionProject');
  if (normalizedType === 'Foundation' || namespace === 'foundations') return t('insight.detailSectionFoundation');
  if (
    ['Company', 'University-0', 'Institution-0', 'Agency-0'].includes(normalizedType) ||
    ['companies', 'universities', 'institutions', 'agencies'].includes(namespace)
  ) {
    return t('insight.detailSectionEntity');
  }
  if (normalizedType === 'repo' || namespace === 'repos') return t('insight.detailSectionRepoSingular');
  return t('insight.leaderboard');
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  pct,
  delta,
  subtitle,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  value: number;
  pct: string;
  delta: number | null;
  subtitle: string;
}) {
  const up = parseFloat(pct) >= 0;
  return (
    <div className="rounded-xl border border-border bg-card px-5 pt-5 pb-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex size-9 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <svg className={`size-5 ${iconColor}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              {icon === 'lightning-bolt' && <path d="M11 15H6l7-14v8h5l-7 14v-8z" />}
              {icon === 'chart-line' && <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />}
              {icon === 'account-group' && <path d="M12 5.5A3.5 3.5 0 0 1 15.5 9a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8.5 9 3.5 3.5 0 0 1 12 5.5M5 8c.56 0 1.08.15 1.53.42-.15 1.43.27 2.85 1.13 3.96C7.16 13.34 6.16 14 5 14a3 3 0 0 1-3-3 3 3 0 0 1 3-3m14 0a3 3 0 0 1 3 3 3 3 0 0 1-3 3c-1.16 0-2.16-.66-2.66-1.62a5.54 5.54 0 0 0 1.13-3.96c.45-.27.97-.42 1.53-.42M5.5 18.25c0-2.07 2.91-3.75 6.5-3.75s6.5 1.68 6.5 3.75V20h-13v-1.75M0 20v-1.5c0-1.39 1.89-2.56 4.45-2.9-.59.68-.95 1.62-.95 2.65V20H0m24 0h-3.5v-1.75c0-1.03-.36-1.97-.95-2.65 2.56.34 4.45 1.51 4.45 2.9V20z" />}
            </svg>
          </div>
          <div className="text-3xl font-bold tabular-nums text-card-foreground">{value.toLocaleString()}</div>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-medium ${up ? 'text-primary' : 'text-destructive'}`}>
          <svg className="size-4 flex-shrink-0 self-center" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            {up ? <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" /> : <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z" />}
          </svg>
          <div className="flex flex-col items-end leading-tight font-mono tabular-nums">
            {delta != null ? <span>{statDeltaFormatter.format(Math.abs(delta))}</span> : null}
            <span>{Math.abs(parseFloat(pct))}%</span>
          </div>
        </div>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
    </div>
  );
}

export default function LabelDetailPage() {
  // Route is defined as `/insight/labels/*` (splat route), so the matched
  // path lives in params['*'] rather than params.labelId. labelId may contain
  // '/' (e.g. `companies/huawei/ascend`).
  const params = useParams();
  const rawLabelId = params['*'] || '';
  // When fetching data from oss.open-digger.cn the bucket is NOT organized
  // under a `labels/` prefix, so strip it if present and only keep the path
  // after `labels/` (e.g. `labels/companies/huawei/ascend` -> `companies/huawei/ascend`).
  const labelId = rawLabelId.replace(/^labels\//, '');
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = normalizeInsightLang(i18n.language);

  const fullLabelId = '#' + (labelId || '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<'month' | 'year'>('month');
  const [sectionTimeValue, setSectionTimeValue] = useState('');

  const [item, setItem] = useState<LeaderboardItem | null>(null);
  const [trendData, setTrendData] = useState<RepoTrendMap | null>(null);
  const [metaLabels, setMetaLabels] = useState<MetaLabelEntry[]>([]);
  const [metaRepos, setMetaRepos] = useState<Array<Record<string, unknown>>>([]);
  const [metaLabelType, setMetaLabelType] = useState<string | null>(null);
  const [metaDesc, setMetaDesc] = useState<string | null>(null);
  const [metaDescZh, setMetaDescZh] = useState<string | null>(null);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [communityOpenRankDetails, setCommunityOpenRankDetails] = useState<CommunityOpenRankDetailsFile | null>(null);
  const breadcrumbSectionLabel = getLabelBreadcrumbSection(labelId, metaLabelType, t);
  const fallbackCurrentLabel = labelId || t('insight.leaderboard');

  useEffect(() => {
    if (!labelId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const rawItem: LeaderboardItem = {
      id: fullLabelId,
      itemType: 'label',
    };

    void (async () => {
      try {
        const slicedId = labelId;
        const [itemMeta, labelTrendData, communityDetails] = await Promise.all([
          fetchItemMeta('label', rawItem),
          fetchLabelTrendData(slicedId)
            .then((m) => m ?? {})
            .catch((): RepoTrendMap => ({})),
          fetchCommunityOpenRankDetails(slicedId),
        ]);
        if (cancelled) return;

        const enrichedItem = enrichLabelItemWithMeta(rawItem, itemMeta);
        setItem(enrichedItem);
        setTrendData(labelTrendData);
        setMetaLabels(itemMeta.labels);
        setMetaRepos(itemMeta.repos);
        setMetaLabelType(itemMeta.labelType);
        setMetaDesc(itemMeta.description);
        setMetaDescZh(itemMeta.descriptionZh);
        setContributions(itemMeta.contributions || []);
        setCommunityOpenRankDetails(communityDetails);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(t('insight.error'));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [labelId, fullLabelId, t]);

  const handleTrendModeChange = (mode: 'month' | 'year') => {
    if (sectionTimeValue) {
      setSectionTimeValue(computeInitialTimeValue(mode, null, sectionTimeValue));
    }
    setTrendMode(mode);
  };

  if (loading) {
    return (
      <div className="insight-detail-layout space-y-6">
        <InsightDetailNav
          homeLabel={t('insight.detailBreadcrumbHome')}
          sectionLabel={breadcrumbSectionLabel}
          currentLabel={fallbackCurrentLabel}
          backLabel={t('insight.detailBackToInsight')}
        />
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
          <svg className="size-10 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="font-mono text-sm">{t('insight.loadingLabel')}</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="insight-detail-layout space-y-6">
        <InsightDetailNav
          homeLabel={t('insight.detailBreadcrumbHome')}
          sectionLabel={breadcrumbSectionLabel}
          currentLabel={fallbackCurrentLabel}
          backLabel={t('insight.detailBackToInsight')}
        />
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
          <p className="font-mono">{error || t('insight.noData')}</p>
        </div>
      </div>
    );
  }

  const displayName = lang === 'zh' ? (item.name_zh || item.name || '') : (item.name || '');
  const desc = getLabelDetailDescriptionFromMeta(lang === 'zh', metaDesc, metaDescZh, item);

  // Label type badge
  const resolvedLabelType = item.label_type || metaLabelType;
  const metaLabelTypeMapKey = resolvedLabelType && isDivisionZeroTypeName(resolvedLabelType) ? 'Division-0' : resolvedLabelType;
  const labelTypeDesc =
    metaLabelTypeMapKey && LABEL_TYPE_MAP[metaLabelTypeMapKey]
      ? lang === 'zh'
        ? LABEL_TYPE_MAP[metaLabelTypeMapKey].zh
        : LABEL_TYPE_MAP[metaLabelTypeMapKey].en
      : resolvedLabelType || '';

  // Avatar
  const isDivisionLabel = isDivisionZeroTypeName(resolvedLabelType);
  const headerAvatar =
    (isDivisionLabel ? divisionLabelFlagAvatarUrl(item) : '') || item.avatar || item.logo || '';

  // Trend data
  const dataKey = trendMode === 'year' ? 'yearly' : 'monthly';
  const td = trendData;
  const getTrend = (key: keyof NonNullable<RepoTrendMap>) =>
    td && td[key] && td[key]![dataKey]?.values?.length ? td[key]![dataKey] : null;
  const useReal = td && (getTrend('influence') || getTrend('activity'));
  const influenceTrend = useReal && getTrend('influence') ? getTrend('influence')! : EMPTY_TREND;
  const activityTrend = useReal && getTrend('activity') ? getTrend('activity')! : EMPTY_TREND;
  const devCountTrend = useReal && getTrend('participants') ? getTrend('participants')! : EMPTY_TREND;
  const issuePrTrend = useReal && getTrend('issuePr') ? getTrend('issuePr')! : EMPTY_TREND;

  const infLatest = getLatest(influenceTrend);
  const infPrev = getPrev(influenceTrend);
  const actLatest = getLatest(activityTrend);
  const actPrev = getPrev(activityTrend);
  const devLatest = getLatest(devCountTrend);
  const devPrev = getPrev(devCountTrend);
  const infPct = getChangePct(infLatest, infPrev);
  const actPct = getChangePct(actLatest, actPrev);
  const devPct = getChangePct(devLatest, devPrev);
  const timeKey =
    (influenceTrend?.months?.length ? influenceTrend.months[influenceTrend.months.length - 1] : '') || '';

  // Related repos
  const repos = metaRepos.length
    ? metaRepos.map((r) =>
        typeof r === 'object' ? { ...r, name: (r.name as string) || r } : { name: r, url: '#', platform: null },
      )
    : [];

  const getRepoHref = (r: Record<string, unknown>) => {
    const p = r.platform || r.Platform;
    return p ? getRepoUrlByPlatform(p, String(r.name || '')) : String(r.url || '#');
  };

  // Contribution map
  const contributionDetailRows = preprocessContributions(contributions);
  const showContributionMap = contributionDetailRows.length > 0;
  const showCommunityRank = Boolean(communityOpenRankDetails);

  // Build navigation params for the "Allocate Points" entry; carry the tag's
  // identity so the allocation page can preload it into step 2.
  const handleAllocatePoints = () => {
    // Backend tag operations match against `opensource.labels.id` whose
    // canonical form is prefixed with ':' (e.g. ':companies/huawei/ascend').
    // The page's `labelId` has the ':' / '#' / 'labels/' prefixes stripped
    // for routing, so re-prepend ':' when carrying the id to the allocation
    // page; otherwise downstream queries will return no matches.
    const canonicalTagId = labelId.startsWith(':') ? labelId : ':' + labelId;
    const params = new URLSearchParams();
    params.set('tag_id', canonicalTagId);
    params.set('tag_name', displayName);
    if (resolvedLabelType) params.set('tag_type', resolvedLabelType);
    if (typeof item.openrank === 'number') {
      params.set('tag_openrank', String(item.openrank));
    }
    navigate(`/points/allocate?${params.toString()}`);
  };

  return (
    <div className="insight-detail-layout space-y-6">
      <InsightDetailNav
        homeLabel={t('insight.detailBreadcrumbHome')}
        sectionLabel={breadcrumbSectionLabel}
        currentLabel={displayName || fallbackCurrentLabel}
        backLabel={t('insight.detailBackToInsight')}
      />

      {/* Label Info Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-32 h-32 relative">
            <LeaderboardAvatar avatar={headerAvatar} displayName={displayName} sizeClass="w-32 h-32" bordered={false} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h1 className="text-xl font-mono font-bold text-balance text-card-foreground">{displayName}</h1>
              {labelTypeDesc ? (
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono leading-tight bg-primary/10 text-primary border border-primary/30">
                  {labelTypeDesc}
                </span>
              ) : null}
              {metaLabels.map((l, idx) => {
                const text = lang === 'zh' ? (l.name_zh || l.name || '') : (l.name || l.name_zh || '');
                if (!text) return null;
                const metaType = l.type || null;
                const clickable = Boolean(l.id && metaType && isClickableDetailMetaLabelType(metaType));
                if (clickable) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="inline-block cursor-pointer rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] leading-tight text-secondary-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      title={t('insight.detailMetaLabelViewDetails')}
                      onClick={() => navigate(getLabelDetailPath(l.id || ''))}
                    >
                      {text}
                    </button>
                  );
                }
                return (
                  <span
                    key={idx}
                    className="inline-block rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] leading-tight text-muted-foreground"
                  >
                    {text}
                  </span>
                );
              })}
            </div>
            {desc ? <p className="mt-1 text-sm text-pretty text-muted-foreground">{desc}</p> : null}
            {repos.length > 0 && (
              <div className="mt-4">
                <h2 className="mb-2 text-sm font-mono font-semibold text-card-foreground">
                  {t('insight.detailSectionRepoList')}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {repos.map((r, idx) => {
                    const row = r as Record<string, unknown>;
                    const name = String(row.name || '');
                    const href = getRepoHref(row);
                    return (
                      <a
                        key={idx}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-border bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <RepoPlatformIcon platform={row.platform || row.Platform || 'github'} size="xs" />
                        <span className="truncate max-w-[10rem]">{name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* Allocate Points entry, mirrors the position of the
              external-link button in repo/developer detail pages. */}
          <button
            type="button"
            onClick={handleAllocatePoints}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5,16L3,5L8.5,11L12,4L15.5,11L21,5L19,16H5M19,19A1,1 0 0,1 18,20H6A1,1 0 0,1 5,19V18H19V19Z" />
            </svg>
            <span>{t('insight.detailLabelAllocate')}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon="lightning-bolt"
          iconBg="bg-chart-3/15"
          iconColor="text-chart-3"
          value={infLatest}
          pct={infPct}
          delta={getStatDelta(influenceTrend, infLatest, infPrev)}
          subtitle={`${t('insight.detailStatOpenRankInfluence')}${timeKey ? ` (${timeKey})` : ''}`}
        />
        <StatCard
          icon="chart-line"
          iconBg="bg-chart-1/15"
          iconColor="text-chart-1"
          value={actLatest}
          pct={actPct}
          delta={getStatDelta(activityTrend, actLatest, actPrev)}
          subtitle={`${t('insight.detailStatActivity')}${timeKey ? ` (${timeKey})` : ''}`}
        />
        <StatCard
          icon="account-group"
          iconBg="bg-chart-2/15"
          iconColor="text-chart-2"
          value={devLatest}
          pct={devPct}
          delta={getStatDelta(devCountTrend, devLatest, devPrev)}
          subtitle={`${t('insight.detailStatDeveloperCount')}${timeKey ? ` (${timeKey})` : ''}`}
        />
      </div>

      {/* Trend Mode Toggle + Charts */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <h2 className="text-sm font-mono font-semibold text-card-foreground">
            {t('insight.detailHistoricalTrendHeading')}
          </h2>
          <div
            className="flex rounded-lg border border-border bg-muted p-0.5"
            role="group"
            aria-label={t('insight.detailTrendModeAria')}
          >
            <button
              type="button"
              aria-pressed={trendMode === 'month'}
              className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${trendMode === 'month' ? 'border border-border bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => handleTrendModeChange('month')}
            >
              {t('insight.detailTrendModeMonth')}
            </button>
            <button
              type="button"
              aria-pressed={trendMode === 'year'}
              className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${trendMode === 'year' ? 'border border-border bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => handleTrendModeChange('year')}
            >
              {t('insight.detailTrendModeYear')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-background p-4">
            <TrendChart
              values={influenceTrend.values}
              label={t('insight.detailChartInfluenceTrend')}
              monthLabels={influenceTrend.months}
              noDataText={t('insight.noData')}
            />
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <TrendChart
              values={activityTrend.values}
              label={t('insight.detailChartActivityTrend')}
              monthLabels={activityTrend.months}
              noDataText={t('insight.noData')}
            />
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <TrendChart
              values={devCountTrend.values}
              label={t('insight.detailChartParticipantsTrend')}
              monthLabels={devCountTrend.months}
              noDataText={t('insight.noData')}
            />
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <TrendChart
              values={issuePrTrend.values}
              label={t('insight.detailChartIssuePrTrend')}
              monthLabels={issuePrTrend.months}
              noDataText={t('insight.noData')}
            />
          </div>
        </div>
      </div>

      {/* Contribution Map */}
      {showContributionMap && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 text-sm font-mono font-semibold text-card-foreground">
            {t('insight.detailContributionMapHeading')}
          </h2>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
            <div className="max-h-80 overflow-auto rounded-lg border border-border bg-background p-4">
                <ContributionTable contributions={contributions} lang={lang} t={t} />
            </div>
            <Suspense fallback={<ContributionMapFallback />}>
              <ContributionMap contributions={contributions} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Community Developer OpenRank */}
      {showCommunityRank && communityOpenRankDetails && (
        <div className="rounded-xl border border-border bg-card p-6">
          <CommunityDeveloperOpenRank
            details={communityOpenRankDetails}
            meta={null}
            timeType={trendMode}
            sectionTimeValue={sectionTimeValue || timeKey}
            onSectionTimeChange={setSectionTimeValue}
            onDeveloperClick={(devItem) => {
              const platform = devItem.platform || 'github';
              const login = (devItem.login ?? devItem.name ?? '').split('/')[0]?.trim() || '';
              if (login) {
                navigate(getDeveloperDetailPath(platform, login));
              }
            }}
            lang={lang}
            t={(k: string) => t(k)}
          />
        </div>
      )}
    </div>
  );
}

function ContributionMapFallback() {
  return (
    <div
      className="rounded-lg border border-border bg-background p-4"
      style={{ height: 320 }}
      aria-hidden="true"
    />
  );
}

function ContributionTable({
  contributions,
  lang,
  t,
}: {
  contributions: ContributionRow[];
  lang: 'zh' | 'en';
  t: (k: string) => string;
}) {
  const processed = preprocessContributions(contributions);
  const rowsSorted = processed.slice().sort((a, b) => b.openrank - a.openrank);
  if (rowsSorted.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{t('insight.noData')}</p>;
  }
  const colName = t('insight.contributionTableCountry');
  const colDevelopers = t('insight.mapTooltipDevelopers');
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          <th className="text-left py-2 pr-3 font-mono">#</th>
          <th className="text-left py-2 pr-3 font-mono">{colName}</th>
          <th className="text-right py-2 pr-3 font-mono">{colDevelopers}</th>
          <th className="text-right py-2 font-mono">{t('insight.headerOpenRank')}</th>
        </tr>
      </thead>
      <tbody>
        {rowsSorted.map((c, i) => {
          const countryDisplay = lang === 'zh' ? c.displayNameZh : c.displayNameEn;
          const flagHtml = c.countryCode ? (
            <img
              src={`https://flagcdn.com/24x18/${c.countryCode.toLowerCase()}.png`}
              alt=""
              className="inline-block align-middle mr-2"
              style={{ width: 24, height: 18 }}
            />
          ) : null;
          return (
            <tr key={i} className="border-b border-border/60">
              <td className="py-2 pr-3 font-mono text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-3 text-foreground">
                {flagHtml}
                {countryDisplay}
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">{(c.developers ?? 0).toLocaleString()}</td>
              <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">{c.openrank.toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
