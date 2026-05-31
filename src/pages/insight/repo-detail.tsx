import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchItemMeta, fetchRepoTrendData } from './api/openDiggerTrend';
import { getLabelDetailPath } from './domain/routes';
import { getRepoUrlByPlatform, normalizeRepoPlatform } from './domain/repoPlatform';
import { normalizeInsightLang } from './domain/lang';
import { TrendChart } from './components/TrendChart';
import { RepoPlatformIcon } from './components/RepoPlatformIcon';
import { LeaderboardAvatar } from './components/LeaderboardAvatar';
import { InsightDetailNav } from './components/InsightDetailNav';
import { inferredDeveloperAvatarUrl } from './domain/communityOpenRankDetails';
import { EMPTY_TREND, pickTrendMode } from './domain/trends';
import { preprocessContributions } from './domain/geography';
import type { RepoTrendMap, MetaLabelEntry, ContributionRow, TrendSeries } from './types/api';

const ContributionMap = lazy(() =>
  import('./components/ContributionMap').then((module) => ({ default: module.ContributionMap })),
);

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
  const [description, setDescription] = useState('');

  const normalizedPlatform = normalizeRepoPlatform(platform || 'github');

  useEffect(() => {
    if (!platform || !owner || !repo) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const item = { name: repoName, platform: normalizedPlatform, itemType: 'repo' };
        const [itemMeta, repoTrend] = await Promise.all([
          fetchItemMeta('repo', item),
          fetchRepoTrendData(normalizedPlatform, repoName),
        ]);
        if (cancelled) return;
        setTrendData(repoTrend);
        setMetaLabels(itemMeta.labels);
        setContributions(itemMeta.contributions || []);
        setDescription(itemMeta.description || itemMeta.descriptionZh || '');
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
  const issuePrLatest = getLatest(issuePrTrend);
  const issuePrPrev = getPrev(issuePrTrend);

  const timeKey = influenceTrend.months.length
    ? influenceTrend.months[influenceTrend.months.length - 1]
    : '';

  const contributionRows = preprocessContributions(contributions);
  const showContributionMap = contributionRows.length > 0;
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
      <div className="insight-detail-layout space-y-6">
        {detailNav}
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-muted-foreground">{t('insight.loadingRepository')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insight-detail-layout space-y-6">
        {detailNav}
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="insight-detail-layout space-y-6">
      {detailNav}

      {/* Repo Info Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div className="relative size-20 flex-shrink-0 sm:size-32">
            <LeaderboardAvatar
              avatar={inferredDeveloperAvatarUrl(normalizedPlatform, owner || '')}
              displayName={owner || repoName}
              sizeClass="size-20 sm:size-32"
              bordered={false}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h1 className="text-xl font-semibold text-balance break-all text-foreground">{repoName}</h1>
              <span className="inline-block rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {t('insight.detailSectionRepoSingular')}
              </span>
              {metaLabels.map((label, idx) => {
                const text = lang === 'zh' ? (label.name_zh || label.name || '') : (label.name || label.name_zh || '');
                if (!text) return null;
                const hasLink = Boolean(label.id);
                if (hasLink) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="inline-block cursor-pointer rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] leading-tight text-secondary-foreground transition-colors hover:border-primary/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => navigate(getLabelDetailPath(label.id!))}
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
            {description && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <a
            href={getRepoUrlByPlatform(normalizedPlatform, repoName)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            <RepoPlatformIcon platform={normalizedPlatform} size="sm" />
            <span>{t('insight.repoVisitExternal')}</span>
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('insight.detailStatOpenRankInfluence')}
          value={infLatest}
          pct={getChangePct(infLatest, infPrev)}
          delta={getStatDelta(infLatest, infPrev)}
          timeKey={timeKey}
        />
        <StatCard
          label={t('insight.detailStatActivity')}
          value={actLatest}
          pct={getChangePct(actLatest, actPrev)}
          delta={getStatDelta(actLatest, actPrev)}
          timeKey={timeKey}
        />
        <StatCard
          label={t('insight.detailStatDeveloperCount')}
          value={devLatest}
          pct={getChangePct(devLatest, devPrev)}
          delta={getStatDelta(devLatest, devPrev)}
          timeKey={timeKey}
        />
        <StatCard
          label={t('insight.detailChartIssuePrTrend')}
          value={issuePrLatest}
          pct={getChangePct(issuePrLatest, issuePrPrev)}
          delta={getStatDelta(issuePrLatest, issuePrPrev)}
          timeKey={timeKey}
        />
      </div>

      {/* Trend Charts */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {t('insight.detailHistoricalTrendHeading')}
          </h2>
          <div className="flex rounded-lg border border-border bg-background p-0.5" role="group" aria-label={t('insight.detailTrendModeAria')}>
            <button
              type="button"
              aria-pressed={trendMode === 'month'}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${trendMode === 'month' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTrendMode('month')}
            >
              {t('insight.detailTrendModeMonth')}
            </button>
            <button
              type="button"
              aria-pressed={trendMode === 'year'}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${trendMode === 'year' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTrendMode('year')}
            >
              {t('insight.detailTrendModeYear')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              values={participantsTrend.values}
              label={t('insight.detailChartParticipantsTrend')}
              monthLabels={participantsTrend.months}
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
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">
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
  const rows = preprocessContributions(contributions).slice().sort((a, b) => b.openrank - a.openrank);
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{t('insight.noData')}</p>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          <th className="py-2 pr-3 text-left font-mono">#</th>
          <th className="py-2 pr-3 text-left font-mono">{t('insight.contributionTableCountry')}</th>
          <th className="py-2 pr-3 text-right font-mono">{t('insight.mapTooltipDevelopers')}</th>
          <th className="py-2 text-right font-mono">{t('insight.headerOpenRank')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.mapName}-${index}`} className="border-b border-border/60">
            <td className="py-2 pr-3 font-mono text-muted-foreground">{index + 1}</td>
            <td className="py-2 pr-3 text-foreground">
              {row.countryCode ? (
                <img
                  src={`https://flagcdn.com/24x18/${row.countryCode.toLowerCase()}.png`}
                  alt=""
                  className="mr-2 inline-block align-middle"
                  style={{ width: 24, height: 18 }}
                />
              ) : null}
              {lang === 'zh' ? row.displayNameZh : row.displayNameEn}
            </td>
            <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">
              {(row.developers ?? 0).toLocaleString()}
            </td>
            <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">
              {row.openrank.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* --- Internal StatCard Component --- */
function StatCard({
  label,
  value,
  pct,
  delta,
  timeKey,
}: {
  label: string;
  value: number;
  pct: string;
  delta: number | null;
  timeKey: string;
}) {
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold text-foreground tabular-nums">
        {value ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '0'}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {delta !== null && (
          <span className={`text-xs font-medium ${isPositive ? 'text-primary' : isNegative ? 'text-destructive' : 'text-muted-foreground'}`}>
            {isPositive ? '↑' : isNegative ? '↓' : ''} {pct}%
          </span>
        )}
        {timeKey && <span className="text-xs text-muted-foreground">{timeKey}</span>}
      </div>
    </div>
  );
}
