import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react/offline';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/app/components/ui/tooltip';
import { fetchUserMeta } from './api/openDiggerTrend';
import { fetchTalentBaseline, fetchUserTalent } from './api/talentProfile';
import {
  getDeveloperProfileUrlByPlatform,
  getRepoPlatformDisplayName,
  inferDeveloperAvatarUrl,
} from './domain/repoPlatform';
import { getInsightHomePath } from './domain/routes';
import { normalizeInsightLang } from './domain/lang';
import type { TimeBounds } from './domain/timeRange';
import { RepoPlatformIcon } from './components/RepoPlatformIcon';
import { LeaderboardAvatar } from './components/LeaderboardAvatar';
import { InsightDetailNav } from './components/InsightDetailNav';
import {
  InsightDetailHero,
  InsightDetailMetricCard,
  InsightDetailSectionHeader,
  type InsightDetailIcon,
  type InsightMetricTone,
} from './components/InsightDetailVisuals';
import { TalentRadarChart } from './components/TalentRadarChart';
import { TalentPrTypePie } from './components/TalentPrTypePie';
import { TalentTopRepos } from './components/TalentTopRepos';
import { TalentTechAreas } from './components/TalentTechAreas';
import { TimeRangePicker } from './components/TimeRangePicker';
import type { UserOssMeta } from './types/api';
import type { TalentBaseline, TalentData, TalentYearData } from './types/talent';

/**
 * Year-over-year delta badge: shows direction (up/down), absolute diff and
 * percent change vs previous year. When previous year is missing (treated as 0),
 * the percent slot renders "—" because it is mathematically undefined.
 */
function YearDelta({
  current,
  previous,
  isInt,
}: {
  current: number;
  previous: number;
  isInt?: boolean;
}) {
  const diff = current - previous;
  const absDiff = Math.abs(diff);
  const displayDiff = isInt
    ? Math.round(absDiff).toLocaleString()
    : absDiff.toFixed(2);
  const hasPrev = previous !== 0;
  const percentText = hasPrev
    ? `${diff >= 0 ? '+' : '-'}${Math.abs((diff / Math.abs(previous)) * 100).toFixed(1)}%`
    : '—';

  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Icon icon="mdi:minus" className="size-3.5" aria-hidden />
        <span className="tabular-nums">0</span>
        <span className="tabular-nums">({hasPrev ? '0.0%' : '—'})</span>
      </span>
    );
  }

  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${up ? 'text-primary' : 'text-destructive'}`}
    >
      <Icon icon={up ? 'mdi:arrow-up' : 'mdi:arrow-down'} className="size-3.5" aria-hidden />
      <span className="tabular-nums">{displayDiff}</span>
      <span className="tabular-nums">({percentText})</span>
    </span>
  );
}

/** Ordered tier labels from top to bottom, aligned with the 6 threshold values. */
const TIER_LABELS = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D'] as const;
type TierLabel = (typeof TIER_LABELS)[number];

/**
 * Resolve the OpenRank tier thresholds for a specific year. When the requested
 * year falls before the earliest covered year, the earliest year's thresholds
 * are used; when it falls after the latest, the latest year's thresholds are
 * used. Returns undefined when no valid thresholds exist.
 */
function resolveOpenrankTiersForYear(
  tiersMap: Record<string, number[]> | undefined,
  year: string,
): number[] | undefined {
  if (!tiersMap) return undefined;
  const availableYears = Object.keys(tiersMap)
    .map((y) => parseInt(y, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!availableYears.length) return undefined;
  const minYear = availableYears[0];
  const maxYear = availableYears[availableYears.length - 1];
  const yearNum = parseInt(year, 10);
  let pick: number;
  if (!Number.isFinite(yearNum)) pick = maxYear;
  else if (yearNum < minYear) pick = minYear;
  else if (yearNum > maxYear) pick = maxYear;
  else pick = yearNum;
  const tiers = tiersMap[String(pick)];
  return Array.isArray(tiers) && tiers.length > 0 ? tiers : undefined;
}

/**
 * Compute the OpenRank tier for `value` given descending thresholds `tiers`.
 * value > tiers[i] yields TIER_LABELS[i]; if value falls below every threshold
 * it lands on the last tier (D). Returns null when tiers is missing/invalid.
 */
function computeOpenrankTier(value: number, tiers: number[] | undefined): TierLabel | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  for (let i = 0; i < tiers.length && i < TIER_LABELS.length - 1; i += 1) {
    if (value > tiers[i]) return TIER_LABELS[i];
  }
  return TIER_LABELS[TIER_LABELS.length - 1];
}

/**
 * Tier color palette:
 * - SSS/SS/S: lustrous gold gradient
 * - A: purple/violet gradient
 * - B: blue/cyan gradient
 * - C/D: neutral foreground
 */
function TierBadge({ tier }: { tier: TierLabel }) {
  const goldCls =
    'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(250,204,21,0.45)]';
  const purpleCls =
    'bg-gradient-to-r from-purple-400 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(168,85,247,0.45)]';
  const blueCls =
    'bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(59,130,246,0.45)]';
  const normalCls = 'text-card-foreground/80';
  let colorCls: string;
  if (tier === 'SSS' || tier === 'SS' || tier === 'S') colorCls = goldCls;
  else if (tier === 'A') colorCls = purpleCls;
  else if (tier === 'B') colorCls = blueCls;
  else colorCls = normalCls;
  return (
    <span
      className={`inline-block text-4xl font-black leading-none tracking-wider ${colorCls}`}
      aria-label={`OpenRank tier ${tier}`}
    >
      {tier}
    </span>
  );
}

export default function DeveloperDetailPage() {
  const { platform = 'github', login = '' } = useParams<{ platform: string; login: string }>();
  const { t, i18n } = useTranslation();
  const lang = normalizeInsightLang(i18n.language);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ossMeta, setOssMeta] = useState<UserOssMeta | null>(null);
  const [talentData, setTalentData] = useState<TalentData | null>(null);
  const [talentBaseline, setTalentBaseline] = useState<TalentBaseline | null>(null);
  const [talentYear, setTalentYear] = useState<string>('');

  useEffect(() => {
    if (!login) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      fetchUserMeta(platform, login),
      fetchTalentBaseline(),
      fetchUserTalent(platform, login),
    ])
      .then(([meta, baseline, talent]) => {
        if (cancelled) return;
        if (!meta) {
          setError(true);
        } else {
          setOssMeta(meta);
          setTalentBaseline(baseline);
          setTalentData(talent);
          if (talent) {
            const years = Object.keys(talent).sort();
            setTalentYear(years[years.length - 1] || '');
          }
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

  // Bounds for the talent-profile year picker, derived from available data years.
  const talentYearBounds = useMemo<TimeBounds | null>(() => {
    if (!talentData) return null;
    const years = Object.keys(talentData)
      .map((y) => parseInt(y, 10))
      .filter((n) => Number.isFinite(n));
    if (!years.length) return null;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return {
      minYear: min,
      maxYear: max,
      minMonth: `${min}-01`,
      maxMonth: `${max}-12`,
    };
  }, [talentData]);
  const latestTalentYear = talentYearBounds ? String(talentYearBounds.maxYear) : '';

  const profileUrl = getDeveloperProfileUrlByPlatform(platform, login);
  const avatarUrl = inferDeveloperAvatarUrl(platform, login, ossMeta?.id);

  const profileLocation = ossMeta?.info?.location?.trim() ?? '';
  const profileCompany = ossMeta?.info?.company?.trim() ?? '';
  const profileBio = ossMeta?.info?.bio?.trim() ?? '';
  const displayName = ossMeta?.info?.name?.trim() || login;

  if (loading) {
    return (
      <div className="insight-detail-page insight-detail-layout">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
          <Icon icon="mdi:loading" className="text-4xl animate-spin" aria-hidden />
          <p>{t('insight.loadingUser')}</p>
        </div>
      </div>
    );
  }

  if (error || !ossMeta) {
    return (
      <div className="insight-detail-page insight-detail-layout">
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
    <div className="insight-detail-page insight-detail-layout space-y-6">
      <InsightDetailNav
        homeLabel={t('insight.developerDetailBreadcrumbHome')}
        sectionLabel={t('insight.detailSectionDeveloper')}
        currentLabel={`@${login}`}
        backLabel={t('insight.developerDetailBackToInsight')}
      />

      <InsightDetailHero
        tone="developer"
        eyebrow={t('insight.detailDataProfile')}
        kindLabel={t('insight.detailSectionDeveloper')}
        title={displayName}
        titleMeta={<span className="insight-detail-hero__title-meta">@{login}</span>}
        avatar={(
          <LeaderboardAvatar
            avatar={avatarUrl}
            displayName={displayName}
            sizeClass="size-full"
            circular
            bordered={false}
          />
        )}
        badges={(
          <span className="insight-detail-hero__badge gap-1.5">
            <RepoPlatformIcon platform={platform} size="xs" />
            {getRepoPlatformDisplayName(platform)}
          </span>
        )}
        description={profileBio}
        meta={(profileLocation || profileCompany) ? (
          <>
            {profileLocation ? (
              <span className="insight-detail-hero__meta-item">
                <Icon icon="mdi:map-marker-outline" className="size-4" aria-hidden />
                <span className="break-words">{profileLocation}</span>
              </span>
            ) : null}
            {profileCompany ? (
              <span className="insight-detail-hero__meta-item">
                <Icon icon="mdi:domain" className="size-4" aria-hidden />
                <span className="break-words">{profileCompany}</span>
              </span>
            ) : null}
          </>
        ) : null}
        snapshotLabel={t('insight.detailLatestSnapshot')}
        snapshotValue={latestTalentYear || '—'}
        action={(
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="insight-detail-hero__action inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RepoPlatformIcon platform={platform} size="sm" />
            <span>{t('insight.detailDeveloperProfile')}</span>
            <Icon icon="mdi:open-in-new" className="size-3.5" aria-hidden />
          </a>
        )}
      />

      {/* Talent Profile Section */}
      {talentData && talentBaseline && talentYear && talentData[talentYear] && (
        <div className="space-y-6">
          {/* Section header with year selector (matches leaderboard time picker) */}
          <InsightDetailSectionHeader
            icon="talent"
            eyebrow={t('insight.detailTalentEyebrow')}
            title={t('insight.talentProfileHeading')}
            description={t('insight.detailTalentSummary')}
            controls={talentYearBounds ? (
              <div className="min-w-[9rem] w-40 flex-shrink-0 sm:min-w-[9.5rem] sm:w-44">
                <TimeRangePicker
                  meta={null}
                  timeType="year"
                  timeValue={talentYear}
                  lang={lang}
                  t={t}
                  hideOuterLabel
                  dense
                  boundsOverride={talentYearBounds}
                  onValueChange={(v) => {
                    if (talentData[v]) setTalentYear(v);
                  }}
                  onCommit={() => {}}
                />
              </div>
            ) : null}
          />

          {/* OpenRank contribution highlight + activity stats */}
          {(() => {
            const currentYearData = talentData[talentYear];
            const prevKey = String(parseInt(talentYear, 10) - 1);
            const prevYearData: Partial<TalentYearData> = talentData[prevKey] ?? {};
            const statItems: {
              label: string;
              current: number;
              previous: number;
              icon: InsightDetailIcon;
              tone: InsightMetricTone;
            }[] = [
              {
                label: t('insight.talentOpenIssues'),
                current: currentYearData.openIssues,
                previous: prevYearData.openIssues ?? 0,
                icon: 'issuesOpen',
                tone: 'violet',
              },
              {
                label: t('insight.talentParticipantIssues'),
                current: currentYearData.participantIssues,
                previous: prevYearData.participantIssues ?? 0,
                icon: 'issuesParticipated',
                tone: 'blue',
              },
              {
                label: t('insight.talentOpenPrs'),
                current: currentYearData.openPrs,
                previous: prevYearData.openPrs ?? 0,
                icon: 'prsOpen',
                tone: 'lime',
              },
              {
                label: t('insight.talentMergedPrs'),
                current: currentYearData.mergedPrs,
                previous: prevYearData.mergedPrs ?? 0,
                icon: 'prsMerged',
                tone: 'cyan',
              },
              {
                label: t('insight.talentPrReviews'),
                current: currentYearData.prReviews,
                previous: prevYearData.prReviews ?? 0,
                icon: 'reviews',
                tone: 'amber',
              },
              {
                label: t('insight.talentCodeChanges'),
                current: currentYearData.codeChanges,
                previous: prevYearData.codeChanges ?? 0,
                icon: 'code',
                tone: 'rose',
              },
            ];
            return (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="insight-detail-feature-card flex flex-col justify-center p-6">
                  {(() => {
                    const tier = computeOpenrankTier(
                      currentYearData.totalOpenrankContributions,
                      resolveOpenrankTiersForYear(talentBaseline.openrankTiers, talentYear),
                    );
                    return tier ? (
                      <div className="mb-2">
                        <TierBadge tier={tier} />
                      </div>
                    ) : null;
                  })()}
                  <span className="text-sm text-muted-foreground">{t('insight.talentOpenrankContribution')}</span>
                  <span className="mt-1 text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                    {currentYearData.totalOpenrankContributions.toFixed(2)}
                  </span>
                  <div className="mt-2">
                    <YearDelta
                      current={currentYearData.totalOpenrankContributions}
                      previous={prevYearData.totalOpenrankContributions ?? 0}
                    />
                  </div>
                </div>
                <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {statItems.map((item) => (
                    <InsightDetailMetricCard
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      value={item.current.toLocaleString()}
                      change={<YearDelta current={item.current} previous={item.previous} isInt />}
                      tone={item.tone}
                      compact
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Radar chart + PR type pie */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="insight-detail-surface p-6">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">{t('insight.talentRadarTitle')}</h3>
              <TalentRadarChart yearData={talentData[talentYear]} baseline={talentBaseline} />
            </div>
            <div className="insight-detail-surface p-6">
              <h3 className="mb-4 flex items-center justify-between text-sm font-semibold text-card-foreground">
                {t('insight.talentPrTypeTitle')}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t('insight.talentPrTypeTooltip')}
                      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <HelpCircle className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-wrap">
                    {t('insight.talentPrTypeTooltip')}
                  </TooltipContent>
                </Tooltip>
              </h3>
              <TalentPrTypePie prTypes={talentData[talentYear].prTypes} />
            </div>
          </div>

          {/* Top repos */}
          {talentData[talentYear].openRankContributionTop10.length > 0 && (
            <div className="insight-detail-surface p-6">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">{t('insight.talentTopReposTitle')}</h3>
              <TalentTopRepos repos={talentData[talentYear].openRankContributionTop10} />
            </div>
          )}

          {/* Tech areas */}
          {talentData[talentYear].openRankContributionByTechArea.length > 0 && (
            <div className="insight-detail-surface p-6">
              <h3 className="mb-4 text-sm font-semibold text-card-foreground">{t('insight.talentTechAreaTitle')}</h3>
              <TalentTechAreas areas={talentData[talentYear].openRankContributionByTechArea} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
