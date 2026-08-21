import type { ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  ClipboardList,
  Code2,
  GitMerge,
  GitPullRequest,
  MapPin,
  MessageSquare,
  Radar,
  Search,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

const DETAIL_ICONS = {
  activity: Activity,
  code: Code2,
  developers: Users,
  issuesOpen: Bell,
  issuesParticipated: ClipboardList,
  map: MapPin,
  openrank: Zap,
  prsMerged: GitMerge,
  prsOpen: GitPullRequest,
  ranking: Trophy,
  reviews: MessageSquare,
  talent: Search,
  timeline: BarChart3,
};

export type InsightDetailTone = 'label' | 'repo' | 'developer';
export type InsightMetricTone = 'lime' | 'cyan' | 'amber' | 'blue' | 'violet' | 'rose';
export type InsightDetailIcon = keyof typeof DETAIL_ICONS;

type InsightDetailHeroProps = {
  tone: InsightDetailTone;
  eyebrow: string;
  kindLabel: string;
  title: ReactNode;
  titleMeta?: ReactNode;
  avatar: ReactNode;
  badges?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  extra?: ReactNode;
  action?: ReactNode;
  snapshotLabel?: string;
  snapshotValue?: string;
};

export function InsightDetailHero({
  tone,
  eyebrow,
  kindLabel,
  title,
  titleMeta,
  avatar,
  badges,
  description,
  meta,
  extra,
  action,
  snapshotLabel,
  snapshotValue,
}: InsightDetailHeroProps) {
  return (
    <section className="insight-detail-hero" data-tone={tone}>
      <div className="insight-detail-hero__scanline" aria-hidden />
      <div className="insight-detail-hero__content">
        <div className="insight-detail-hero__avatar">{avatar}</div>

        <div className="insight-detail-hero__identity">
          <div className="insight-detail-hero__eyebrow">
            <Radar className="size-4" aria-hidden />
            <span>{eyebrow}</span>
            <span className="insight-detail-hero__eyebrow-divider" aria-hidden />
            <span>{kindLabel}</span>
          </div>
          <div className="insight-detail-hero__title-row">
            <h1 className="insight-detail-hero__title">{title}</h1>
            {titleMeta}
            {badges}
          </div>
          {description ? <div className="insight-detail-hero__description">{description}</div> : null}
          {meta ? <div className="insight-detail-hero__meta">{meta}</div> : null}
          {extra ? <div className="insight-detail-hero__extra">{extra}</div> : null}
        </div>

        {(snapshotValue || action) && (
          <div className="insight-detail-hero__aside">
            {snapshotValue ? (
              <div className="insight-detail-hero__snapshot">
                <span className="insight-detail-hero__snapshot-label">
                  <span className="insight-detail-hero__status" aria-hidden />
                  {snapshotLabel}
                </span>
                <strong>{snapshotValue}</strong>
              </div>
            ) : null}
            {action}
          </div>
        )}
      </div>
    </section>
  );
}

type InsightDetailMetricCardProps = {
  icon: InsightDetailIcon;
  label: ReactNode;
  value: ReactNode;
  change?: ReactNode;
  tone?: InsightMetricTone;
  compact?: boolean;
  badge?: ReactNode;
  className?: string;
};

export function InsightDetailMetricCard({
  icon,
  label,
  value,
  change,
  tone = 'lime',
  compact = false,
  badge,
  className = '',
}: InsightDetailMetricCardProps) {
  const MetricIcon = DETAIL_ICONS[icon];
  return (
    <div
      className={`insight-detail-metric ${compact ? 'is-compact' : ''} ${className}`.trim()}
      data-tone={tone}
    >
      <div className="insight-detail-metric__topline" aria-hidden />
      <div className="insight-detail-metric__header">
        <span className="insight-detail-metric__icon">
          <MetricIcon className="size-4" aria-hidden />
        </span>
        <span className="insight-detail-metric__label">{label}</span>
        {badge ? <span className="insight-detail-metric__badge">{badge}</span> : null}
      </div>
      <div className="insight-detail-metric__body">
        <span className="insight-detail-metric__value">{value}</span>
        {change ? <span className="insight-detail-metric__change">{change}</span> : null}
      </div>
    </div>
  );
}

export function InsightMetricDelta({
  pct,
  delta,
}: {
  pct: string;
  delta: number | null;
}) {
  const numericPct = Number.parseFloat(pct);
  const up = Number.isNaN(numericPct) || numericPct >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`insight-detail-metric__delta ${up ? 'is-up' : 'is-down'}`}>
      <TrendIcon className="size-4" aria-hidden />
      <span className="flex flex-col items-end font-mono leading-tight tabular-nums">
        {delta != null ? <span>{Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span> : null}
        <span>{Math.abs(numericPct || 0)}%</span>
      </span>
    </span>
  );
}

type InsightDetailSectionHeaderProps = {
  icon: InsightDetailIcon;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  controls?: ReactNode;
};

export function InsightDetailSectionHeader({
  icon,
  eyebrow,
  title,
  description,
  controls,
}: InsightDetailSectionHeaderProps) {
  const SectionIcon = DETAIL_ICONS[icon];
  return (
    <div className="insight-detail-section-header">
      <div className="insight-detail-section-header__heading">
        <span className="insight-detail-section-header__icon">
          <SectionIcon className="size-5" aria-hidden />
        </span>
        <span>
          {eyebrow ? <span className="insight-detail-section-header__eyebrow">{eyebrow}</span> : null}
          <span className="insight-detail-section-header__title">{title}</span>
          {description ? <span className="insight-detail-section-header__description">{description}</span> : null}
        </span>
      </div>
      {controls ? <div className="insight-detail-section-header__controls">{controls}</div> : null}
    </div>
  );
}
