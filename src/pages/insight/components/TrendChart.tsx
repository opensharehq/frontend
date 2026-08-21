import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { buildSmoothPath, getYAxisTicks } from '../domain/chartSvg';

export type TrendChartTone = 'violet' | 'lime' | 'cyan' | 'amber';

type Props = {
  values: number[];
  label: string;
  monthLabels: string[];
  noDataText: string;
  tone?: TrendChartTone;
};

function formatTrendValue(value: number): string {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return formatTrendValue(value);
}

export function TrendChart({ values, label, monthLabels, noDataText, tone = 'lime' }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const hintId = useId();
  const gradientId = `detail-trend-${useId().replace(/:/g, '')}`;
  const { t } = useTranslation();

  let labels: string[];
  if (monthLabels && monthLabels.length > 0) {
    if (monthLabels.length >= values.length) {
      labels = monthLabels.slice(0, values.length);
    } else {
      const last = monthLabels[monthLabels.length - 1] || '';
      labels = [...monthLabels, ...Array(values.length - monthLabels.length).fill(last)];
    }
  } else {
    labels = values.length ? values.map(() => '') : [];
  }

  const n = values.length;
  if (n === 0) {
    return (
      <div className="detail-trend-chart" data-tone={tone}>
        <div className="detail-trend-chart__header">
          <span className="detail-trend-chart__label">{label}</span>
        </div>
        <div className="detail-trend-chart__empty">{noDataText}</div>
      </div>
    );
  }

  const max = Math.max(...values, 1);
  const yTicks = getYAxisTicks(max);
  const displayMax = yTicks[yTicks.length - 1];
  const padX = 1.5;
  const padY = 5;
  const plotWidth = 100 - padX * 2;
  const plotHeight = 100 - padY * 2;
  const points = values.map((value, index) => {
    const x = n === 1 ? 50 : padX + (index / (n - 1)) * plotWidth;
    const y = padY + plotHeight - (Number(value) / displayMax) * plotHeight;
    return [x, y] as [number, number];
  });
  const linePath = buildSmoothPath(points as number[][]);
  const areaPath = `${linePath} L${padX + plotWidth},${padY + plotHeight} L${padX},${padY + plotHeight} Z`;
  const latestIndex = n - 1;
  const latestValue = Number(values[latestIndex] ?? 0);
  const previousValue = n >= 2 ? Number(values[latestIndex - 1] ?? 0) : 0;
  const latestDelta = latestValue - previousValue;
  const latestDeltaPct = previousValue === 0 ? null : (latestDelta / Math.abs(previousValue)) * 100;
  const isLatestUp = latestDelta >= 0;
  const DeltaIcon = isLatestUp ? TrendingUp : TrendingDown;
  const peakIndex = values.reduce((best, value, index) => value > values[best] ? index : best, 0);
  const shownIndex = activeIndex ?? latestIndex;
  const shownLabel = labels[shownIndex] || '';
  const shownValue = Number(values[shownIndex] ?? 0);
  const shownPoint = points[shownIndex];
  const summary = `${label}: ${shownLabel} ${shownValue}`;

  const updateIndexFromClientX = (clientX: number, width: number, left: number) => {
    const x = (clientX - left) / width;
    const nextIndex = Math.min(n - 1, Math.max(0, Math.round(x * (n - 1))));
    setActiveIndex(nextIndex);
    return nextIndex;
  };

  return (
    <div className="detail-trend-chart" data-tone={tone}>
      <div className="detail-trend-chart__header">
        <div className="min-w-0">
          <span className="detail-trend-chart__label">{label}</span>
          <div className="detail-trend-chart__latest-row">
            <strong>{formatTrendValue(latestValue)}</strong>
            {n >= 2 ? (
              <span className={`detail-trend-chart__delta ${isLatestUp ? 'is-up' : 'is-down'}`}>
                <DeltaIcon className="size-3.5" aria-hidden />
                <span>{latestDelta >= 0 ? '+' : '-'}{formatTrendValue(Math.abs(latestDelta))}</span>
                {latestDeltaPct != null ? <span>({Math.abs(latestDeltaPct).toFixed(1)}%)</span> : null}
              </span>
            ) : null}
          </div>
        </div>
        <div className="detail-trend-chart__peak">
          <span>
            {t('insight.detailTrendPeak')}
            {labels[peakIndex] ? ` · ${labels[peakIndex]}` : ''}
          </span>
          <strong>{formatTrendValue(Number(values[peakIndex] ?? 0))}</strong>
        </div>
      </div>

      <div className="detail-trend-chart__plot-shell">
        <div className="detail-trend-chart__y-axis" aria-hidden>
          {yTicks.slice().reverse().map((tick) => <span key={tick}>{formatAxisValue(tick)}</span>)}
        </div>
        <div
          className={`detail-trend-chart__plot trend-chart-wrap ${isPinned ? 'is-pinned' : ''}`}
          tabIndex={0}
          role="img"
          aria-label={summary}
          aria-describedby={hintId}
          onFocus={() => setActiveIndex((index) => index ?? latestIndex)}
          onBlur={() => {
            setActiveIndex(null);
            setIsPinned(false);
          }}
          onPointerMove={(event) => {
            if (isPinned) return;
            const rect = event.currentTarget.getBoundingClientRect();
            updateIndexFromClientX(event.clientX, rect.width, rect.left);
          }}
          onPointerLeave={() => {
            if (!isPinned) setActiveIndex(null);
          }}
          onClick={(event) => {
            if (isPinned) {
              setIsPinned(false);
              setActiveIndex(null);
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            updateIndexFromClientX(event.clientX, rect.width, rect.left);
            setIsPinned(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setActiveIndex(null);
              setIsPinned(false);
              return;
            }
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const delta = event.key === 'ArrowRight' ? 1 : -1;
            setActiveIndex((index) => Math.min(n - 1, Math.max(0, (index ?? latestIndex) + delta)));
          }}
        >
          <svg className="detail-trend-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--trend-accent)" stopOpacity="0.34" />
                <stop offset="72%" stopColor="var(--trend-accent)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="var(--trend-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((percent) => (
              <line
                key={percent}
                x1="0"
                x2="100"
                y1={percent}
                y2={percent}
                className="detail-trend-chart__gridline"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path d={linePath} className="detail-trend-chart__line-glow" fill="none" vectorEffect="non-scaling-stroke" />
            <path d={linePath} className="detail-trend-chart__line" fill="none" vectorEffect="non-scaling-stroke" />
          </svg>

          <span
            className="detail-trend-chart__latest-dot"
            style={{ left: `${points[latestIndex][0]}%`, top: `${points[latestIndex][1]}%` }}
            aria-hidden
          />

          {activeIndex !== null ? (
            <>
              <span className="detail-trend-chart__guide" style={{ left: `${shownPoint[0]}%` }} aria-hidden />
              <span
                className="detail-trend-chart__active-dot"
                style={{ left: `${shownPoint[0]}%`, top: `${shownPoint[1]}%` }}
                aria-hidden
              />
              <div
                className="trend-chart-tooltip visible"
                role="tooltip"
                style={{
                  left: `clamp(3.5rem, ${shownPoint[0]}%, calc(100% - 3.5rem))`,
                  top: `${Math.max(28, shownPoint[1])}%`,
                }}
              >
                <span>{shownLabel}</span>
                <strong>{formatTrendValue(shownValue)}</strong>
              </div>
            </>
          ) : null}

          <div className="detail-trend-chart__x-axis" aria-hidden>
            <span>{labels[0] || ''}</span>
            <span>{labels[labels.length - 1] || ''}</span>
          </div>
          <span id={hintId} className="sr-only">{t('insight.detailTrendInteractionHint')}</span>
        </div>
      </div>
    </div>
  );
}
