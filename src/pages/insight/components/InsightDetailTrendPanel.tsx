import type { TrendChartTone } from './TrendChart';
import { TrendChart } from './TrendChart';
import { InsightDetailSectionHeader } from './InsightDetailVisuals';

export type InsightDetailTrendItem = {
  key: string;
  values: number[];
  label: string;
  monthLabels: string[];
  tone: TrendChartTone;
};

type Props = {
  mode: 'month' | 'year';
  onModeChange: (mode: 'month' | 'year') => void;
  items: InsightDetailTrendItem[];
  t: (key: string) => string;
};

export function InsightDetailTrendPanel({ mode, onModeChange, items, t }: Props) {
  return (
    <div className="insight-detail-panel">
      <InsightDetailSectionHeader
        icon="timeline"
        eyebrow={t('insight.detailTrendEyebrow')}
        title={t('insight.detailHistoricalTrendHeading')}
        description={t('insight.detailTrendSummary')}
        controls={(
          <div
            className="flex rounded-lg border border-border bg-muted p-0.5"
            role="group"
            aria-label={t('insight.detailTrendModeAria')}
          >
            {(['month', 'year'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                className={`detail-trend-toggle rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === option ? 'active' : ''}`}
                onClick={() => onModeChange(option)}
              >
                {t(option === 'month' ? 'insight.detailTrendModeMonth' : 'insight.detailTrendModeYear')}
              </button>
            ))}
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="insight-detail-chart">
            <TrendChart
              values={item.values}
              label={item.label}
              monthLabels={item.monthLabels}
              noDataText={t('insight.noData')}
              tone={item.tone}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
