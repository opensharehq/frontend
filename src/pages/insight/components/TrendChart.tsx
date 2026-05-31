import { useId, useState } from 'react';
import { buildSmoothPath, getYAxisTicks } from '../domain/chartSvg';

type Props = {
  values: number[];
  label: string;
  monthLabels: string[];
  noDataText: string;
};

export function TrendChart({ values, label, monthLabels, noDataText }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hintId = useId();

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
  const max = Math.max(...values, 1);
  const yTicks = getYAxisTicks(max);
  const displayMax = yTicks[yTicks.length - 1];
  const n = values.length;
  if (n === 0) {
    return (
      <div className="mb-4">
        <div className="mb-2 text-sm font-mono text-muted-foreground">{label}</div>
        <div className="flex h-20 items-center gap-2 text-sm text-muted-foreground">{noDataText}</div>
      </div>
    );
  }
  const pad = 2;
  const w = 100 - pad * 2;
  const h = 100 - pad * 2;
  const points = values.map((v, i) => {
    const x = n === 1 ? 50 : pad + (i / (n - 1)) * w;
    const y = pad + h - (Number(v) / displayMax) * h;
    return [x, y] as [number, number];
  });
  const linePath = buildSmoothPath(points as number[][]);
  const areaPath = linePath + ' L' + (pad + w) + ',' + (pad + h) + ' L' + pad + ',' + (pad + h) + ' Z';
  const latestIndex = n - 1;
  const shownIndex = activeIndex ?? latestIndex;
  const shownLabel = labels[shownIndex] || '';
  const shownValue = Number(values[shownIndex] ?? 0);
  const tooltipLeft = n === 1 ? 50 : shownIndex / (n - 1) * 100;
  const tooltipTop = Math.max(8, points[shownIndex][1] - 10);
  const summary = `${label}: ${shownLabel} ${shownValue}`;
  const handleIndexFromClientX = (clientX: number, width: number, left: number) => {
    const x = (clientX - left) / width;
    setActiveIndex(Math.min(n - 1, Math.max(0, Math.round(x * (n - 1)))));
  };

  return (
    <div className="mb-4">
      <div className="mb-2 text-sm font-mono text-muted-foreground">{label}</div>
      <div className="flex gap-2">
        <div className="flex h-20 flex-shrink-0 flex-col justify-between py-0.5 font-mono text-xs text-muted-foreground">
          {yTicks
            .slice()
            .reverse()
            .map((tk) => (
              <span key={tk}>{tk}</span>
            ))}
        </div>
        <div
          className="flex-1 min-w-0 h-20 flex flex-col trend-chart-wrap rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ minHeight: '5rem' }}
          tabIndex={0}
          role="img"
          aria-label={summary}
          aria-describedby={hintId}
          onFocus={() => setActiveIndex((index) => index ?? latestIndex)}
          onBlur={() => setActiveIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleIndexFromClientX(e.clientX, rect.width, rect.left);
          }}
          onMouseLeave={() => setActiveIndex(null)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const delta = e.key === 'ArrowRight' ? 1 : -1;
            setActiveIndex((index) => Math.min(n - 1, Math.max(0, (index ?? latestIndex) + delta)));
          }}
        >
          <svg className="w-full flex-1 min-h-0" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d={areaPath} fill="var(--insight-accent-light)" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {activeIndex !== null ? (
            <div
              className="trend-chart-tooltip visible"
              role="tooltip"
              style={{
                left: `clamp(0.25rem, ${tooltipLeft}%, calc(100% - 0.25rem))`,
                top: `${tooltipTop}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {shownLabel}: {shownValue}
            </div>
          ) : null}
          <div className="mt-1 flex flex-shrink-0 justify-between text-xs text-muted-foreground">
            <span>{labels[0] || ''}</span>
            <span>{labels[labels.length - 1] || ''}</span>
          </div>
          <span id={hintId} className="sr-only">
            Use the left and right arrow keys to inspect data points.
          </span>
        </div>
      </div>
    </div>
  );
}
