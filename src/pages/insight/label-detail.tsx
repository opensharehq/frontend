import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchItemMeta, fetchLabelTrendData } from './api/openDiggerTrend';
import { fetchCommunityOpenRankDetails } from './api/communityOpenRankDetails';
import { getLabelDetailPath, getDeveloperDetailPath } from './domain/routes';
import { CommunityDeveloperOpenRank } from './components/CommunityDeveloperOpenRank';
import { LeaderboardAvatar } from './components/LeaderboardAvatar';
import { RepoPlatformIcon } from './components/RepoPlatformIcon';
import { InsightDetailNav } from './components/InsightDetailNav';
import {
  InsightDetailHero,
  InsightDetailMetricCard,
  InsightMetricDelta,
} from './components/InsightDetailVisuals';
import { InsightDetailContribution } from './components/InsightDetailContribution';
import { InsightDetailTrendPanel } from './components/InsightDetailTrendPanel';
import { enrichLabelItemWithMeta, getLabelDetailDescriptionFromMeta } from './domain/detailHelpers';
import { normalizeInsightLang } from './domain/lang';
import { isClickableDetailMetaLabelType, isDivisionZeroTypeName, LABEL_TYPE_MAP } from './domain/labelTypes';
import { divisionLabelFlagAvatarUrl } from './domain/geography';
import { getRepoUrlByPlatform } from './domain/repoPlatform';
import { EMPTY_TREND } from './domain/trends';
import { computeInitialTimeValue } from './domain/timeRange';
import type { ContributionRow, LeaderboardItem, MetaLabelEntry, RepoTrendMap } from './types/api';
import type { CommunityOpenRankDetailsFile } from './domain/communityOpenRankDetails';

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
      <div className="insight-detail-page insight-detail-layout space-y-6">
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
      <div className="insight-detail-page insight-detail-layout space-y-6">
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
    <div className="insight-detail-page insight-detail-layout space-y-6">
      <InsightDetailNav
        homeLabel={t('insight.detailBreadcrumbHome')}
        sectionLabel={breadcrumbSectionLabel}
        currentLabel={displayName || fallbackCurrentLabel}
        backLabel={t('insight.detailBackToInsight')}
      />

      <InsightDetailHero
        tone="label"
        eyebrow={t('insight.detailDataProfile')}
        kindLabel={breadcrumbSectionLabel}
        title={displayName}
        avatar={(
          <LeaderboardAvatar avatar={headerAvatar} displayName={displayName} sizeClass="size-full" bordered={false} />
        )}
        badges={(
          <>
            {labelTypeDesc ? <span className="insight-detail-hero__badge">{labelTypeDesc}</span> : null}
            {metaLabels.map((l, idx) => {
              const text = lang === 'zh' ? (l.name_zh || l.name || '') : (l.name || l.name_zh || '');
              if (!text) return null;
              const metaType = l.type || null;
              const clickable = Boolean(l.id && metaType && isClickableDetailMetaLabelType(metaType));
              return clickable ? (
                <button
                  key={idx}
                  type="button"
                  className="insight-detail-hero__badge"
                  title={t('insight.detailMetaLabelViewDetails')}
                  onClick={() => navigate(getLabelDetailPath(l.id || ''))}
                >
                  {text}
                </button>
              ) : (
                <span key={idx} className="insight-detail-hero__badge">{text}</span>
              );
            })}
          </>
        )}
        description={desc}
        extra={repos.length > 0 ? (
          <>
            <span className="insight-detail-hero__extra-label">{t('insight.detailSectionRepoList')}</span>
            <div className="flex flex-wrap gap-1.5">
              {repos.map((r, idx) => {
                const row = r as Record<string, unknown>;
                const name = String(row.name || '');
                return (
                  <a
                    key={idx}
                    href={getRepoHref(row)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="insight-detail-hero__badge gap-1.5"
                  >
                    <RepoPlatformIcon platform={row.platform || row.Platform || 'github'} size="xs" />
                    <span className="max-w-[11rem] truncate">{name}</span>
                  </a>
                );
              })}
            </div>
          </>
        ) : null}
        snapshotLabel={t('insight.detailLatestSnapshot')}
        snapshotValue={timeKey || '—'}
        action={(
          <button
            type="button"
            onClick={handleAllocatePoints}
            className="insight-detail-hero__action inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5,16L3,5L8.5,11L12,4L15.5,11L21,5L19,16H5M19,19A1,1 0 0,1 18,20H6A1,1 0 0,1 5,19V18H19V19Z" />
            </svg>
            <span>{t('insight.detailLabelAllocate')}</span>
          </button>
        )}
      />

      {/* Stats Cards */}
      <div className="insight-detail-metrics">
        <InsightDetailMetricCard
          icon="openrank"
          tone="amber"
          label={`${t('insight.detailStatOpenRankInfluence')}${timeKey ? ` · ${timeKey}` : ''}`}
          value={infLatest.toLocaleString()}
          change={<InsightMetricDelta pct={infPct} delta={getStatDelta(influenceTrend, infLatest, infPrev)} />}
        />
        <InsightDetailMetricCard
          icon="activity"
          tone="lime"
          label={`${t('insight.detailStatActivity')}${timeKey ? ` · ${timeKey}` : ''}`}
          value={actLatest.toLocaleString()}
          change={<InsightMetricDelta pct={actPct} delta={getStatDelta(activityTrend, actLatest, actPrev)} />}
        />
        <InsightDetailMetricCard
          icon="developers"
          tone="cyan"
          label={`${t('insight.detailStatDeveloperCount')}${timeKey ? ` · ${timeKey}` : ''}`}
          value={devLatest.toLocaleString()}
          change={<InsightMetricDelta pct={devPct} delta={getStatDelta(devCountTrend, devLatest, devPrev)} />}
        />
      </div>

      <InsightDetailTrendPanel
        mode={trendMode}
        onModeChange={handleTrendModeChange}
        t={t}
        items={[
          {
            key: 'influence',
            values: influenceTrend.values,
            label: t('insight.detailChartInfluenceTrend'),
            monthLabels: influenceTrend.months,
            tone: 'violet',
          },
          {
            key: 'activity',
            values: activityTrend.values,
            label: t('insight.detailChartActivityTrend'),
            monthLabels: activityTrend.months,
            tone: 'lime',
          },
          {
            key: 'developers',
            values: devCountTrend.values,
            label: t('insight.detailChartParticipantsTrend'),
            monthLabels: devCountTrend.months,
            tone: 'cyan',
          },
          {
            key: 'issue-pr',
            values: issuePrTrend.values,
            label: t('insight.detailChartIssuePrTrend'),
            monthLabels: issuePrTrend.months,
            tone: 'amber',
          },
        ]}
      />

      {/* Contribution Map */}
      <InsightDetailContribution contributions={contributions} lang={lang} t={t} />

      {/* Community Developer OpenRank */}
      {showCommunityRank && communityOpenRankDetails && (
        <div className="insight-detail-panel">
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
            detailHeader={{
              eyebrow: t('insight.detailCommunityEyebrow'),
              title: t('insight.detailCommunityDevelopersHeading'),
              description: t('insight.detailCommunitySummary'),
            }}
          />
        </div>
      )}
    </div>
  );
}
