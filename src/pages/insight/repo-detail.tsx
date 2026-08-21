import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchItemMeta, fetchRepoTrendData } from './api/openDiggerTrend';
import { fetchRepoCommunityOpenRankDetails } from './api/communityOpenRankDetails';
import { getLabelDetailPath, getDeveloperDetailPath } from './domain/routes';
import { getRepoUrlByPlatform, normalizeRepoPlatform } from './domain/repoPlatform';
import { normalizeInsightLang } from './domain/lang';
import { CommunityDeveloperOpenRank } from './components/CommunityDeveloperOpenRank';
import { RepoPlatformIcon } from './components/RepoPlatformIcon';
import { LeaderboardAvatar } from './components/LeaderboardAvatar';
import { InsightDetailNav } from './components/InsightDetailNav';
import {
  InsightDetailHero,
  InsightDetailMetricCard,
  InsightMetricDelta,
} from './components/InsightDetailVisuals';
import { InsightDetailContribution } from './components/InsightDetailContribution';
import { InsightDetailTrendPanel } from './components/InsightDetailTrendPanel';
import { inferredDeveloperAvatarUrl } from './domain/communityOpenRankDetails';
import { EMPTY_TREND, pickTrendMode } from './domain/trends';
import { computeInitialTimeValue } from './domain/timeRange';
import type { ContributionRow, RepoTrendMap, MetaLabelEntry, TrendSeries } from './types/api';
import type { CommunityOpenRankDetailsFile } from './domain/communityOpenRankDetails';

function getLatest(t: TrendSeries): number {
  const v = t.values;
  return v.length ? Number(v[v.length - 1]) : 0;
}

function getPrev(t: TrendSeries): number {
  const v = t.values;
  return v.length >= 2 ? Number(v[v.length - 2]) : 0;
}

function getChangePct(latest: number, prev: number): string {
  if (!prev || prev === 0) return latest > 0 ? '+100' : '0';
  const pct = ((latest - prev) / prev) * 100;
  return (pct > 0 ? '+' : '') + pct.toFixed(1);
}

function getStatDelta(latest: number, prev: number): number | null {
  if (prev === 0 && latest === 0) return null;
  return latest - prev;
}

export default function RepoDetailPage() {
  const { platform, owner, repo } = useParams<{ platform: string; owner: string; repo: string }>();
  const repoName = `${owner}/${repo}`;
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = normalizeInsightLang(i18n.language);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<RepoTrendMap | null>(null);
  const [metaLabels, setMetaLabels] = useState<MetaLabelEntry[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [trendMode, setTrendMode] = useState<'month' | 'year'>('month');
  const [sectionTimeValue, setSectionTimeValue] = useState('');
  const [description, setDescription] = useState('');
  const [communityOpenRankDetails, setCommunityOpenRankDetails] = useState<CommunityOpenRankDetailsFile | null>(null);

  const normalizedPlatform = normalizeRepoPlatform(platform || 'github');

  useEffect(() => {
    if (!platform || !owner || !repo) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const item = { name: repoName, platform: normalizedPlatform, itemType: 'repo' };
        const [itemMeta, repoTrend, communityDetails] = await Promise.all([
          fetchItemMeta('repo', item),
          fetchRepoTrendData(normalizedPlatform, repoName),
          fetchRepoCommunityOpenRankDetails(normalizedPlatform, repoName),
        ]);
        if (cancelled) return;
        setTrendData(repoTrend);
        setMetaLabels(itemMeta.labels);
        setContributions(itemMeta.contributions || []);
        setDescription(itemMeta.description || itemMeta.descriptionZh || '');
        setCommunityOpenRankDetails(communityDetails);
      } catch {
        if (!cancelled) setError(t('insight.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [platform, owner, repo, normalizedPlatform, repoName, t]);

  const influenceTrend = trendData ? pickTrendMode(trendData.influence, trendMode) : EMPTY_TREND;
  const activityTrend = trendData ? pickTrendMode(trendData.activity, trendMode) : EMPTY_TREND;
  const participantsTrend = trendData ? pickTrendMode(trendData.participants, trendMode) : EMPTY_TREND;
  const issuePrTrend = trendData ? pickTrendMode(trendData.issuePr, trendMode) : EMPTY_TREND;

  const infLatest = getLatest(influenceTrend);
  const infPrev = getPrev(influenceTrend);
  const actLatest = getLatest(activityTrend);
  const actPrev = getPrev(activityTrend);
  const devLatest = getLatest(participantsTrend);
  const devPrev = getPrev(participantsTrend);

  const timeKey = influenceTrend.months.length
    ? influenceTrend.months[influenceTrend.months.length - 1]
    : '';

  const showCommunityRank = Boolean(communityOpenRankDetails);

  const handleTrendModeChange = (mode: 'month' | 'year') => {
    if (sectionTimeValue) {
      setSectionTimeValue(computeInitialTimeValue(mode, null, sectionTimeValue));
    }
    setTrendMode(mode);
  };
  const detailNav = (
    <InsightDetailNav
      homeLabel={t('insight.detailBreadcrumbHome')}
      sectionLabel={t('insight.detailSectionRepoSingular')}
      currentLabel={repoName}
      backLabel={t('insight.detailBackToInsight')}
    />
  );

  if (loading) {
    return (
      <div className="insight-detail-page insight-detail-layout space-y-6">
        {detailNav}
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-muted-foreground">{t('insight.loadingRepository')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insight-detail-page insight-detail-layout space-y-6">
        {detailNav}
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="insight-detail-page insight-detail-layout space-y-6">
      {detailNav}

      <InsightDetailHero
        tone="repo"
        eyebrow={t('insight.detailDataProfile')}
        kindLabel={t('insight.detailSectionRepoSingular')}
        title={repoName}
        avatar={(
          <LeaderboardAvatar
            avatar={inferredDeveloperAvatarUrl(normalizedPlatform, owner || '')}
            displayName={owner || repoName}
            sizeClass="size-full"
            bordered={false}
          />
        )}
        badges={(
          <>
            <span className="insight-detail-hero__badge">{t('insight.detailSectionRepoSingular')}</span>
            {metaLabels.map((label, idx) => {
              const text = lang === 'zh' ? (label.name_zh || label.name || '') : (label.name || label.name_zh || '');
              if (!text) return null;
              return label.id ? (
                <button
                  key={idx}
                  type="button"
                  className="insight-detail-hero__badge"
                  onClick={() => navigate(getLabelDetailPath(label.id!))}
                >
                  {text}
                </button>
              ) : (
                <span key={idx} className="insight-detail-hero__badge">{text}</span>
              );
            })}
          </>
        )}
        description={description}
        snapshotLabel={t('insight.detailLatestSnapshot')}
        snapshotValue={timeKey || '—'}
        action={(
          <a
            href={getRepoUrlByPlatform(normalizedPlatform, repoName)}
            target="_blank"
            rel="noopener noreferrer"
            className="insight-detail-hero__action inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RepoPlatformIcon platform={normalizedPlatform} size="sm" />
            <span>{t('insight.repoVisitExternal')}</span>
          </a>
        )}
      />

      {/* Stats Cards */}
      <div className="insight-detail-metrics">
        <InsightDetailMetricCard
          icon="openrank"
          tone="amber"
          label={`${t('insight.detailStatOpenRankInfluence')}${timeKey ? ` · ${timeKey}` : ''}`}
          value={infLatest.toLocaleString()}
          change={<InsightMetricDelta pct={getChangePct(infLatest, infPrev)} delta={getStatDelta(infLatest, infPrev)} />}
        />
        <InsightDetailMetricCard
          icon="activity"
          tone="lime"
          label={`${t('insight.detailStatActivity')}${timeKey ? ` · ${timeKey}` : ''}`}
          value={actLatest.toLocaleString()}
          change={<InsightMetricDelta pct={getChangePct(actLatest, actPrev)} delta={getStatDelta(actLatest, actPrev)} />}
        />
        <InsightDetailMetricCard
          icon="developers"
          tone="cyan"
          label={`${t('insight.detailStatDeveloperCount')}${timeKey ? ` · ${timeKey}` : ''}`}
          value={devLatest.toLocaleString()}
          change={<InsightMetricDelta pct={getChangePct(devLatest, devPrev)} delta={getStatDelta(devLatest, devPrev)} />}
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
            values: participantsTrend.values,
            label: t('insight.detailChartParticipantsTrend'),
            monthLabels: participantsTrend.months,
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
