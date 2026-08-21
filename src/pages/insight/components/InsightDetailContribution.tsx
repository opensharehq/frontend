import { lazy, Suspense, useMemo } from 'react';
import { preprocessContributions } from '../domain/geography';
import type { ContributionRow, Lang } from '../types/api';
import { InsightDetailSectionHeader } from './InsightDetailVisuals';

const ContributionMap = lazy(() =>
  import('./ContributionMap').then((module) => ({ default: module.ContributionMap })),
);

type Props = {
  contributions: ContributionRow[];
  lang: Lang;
  t: (key: string) => string;
};

export function InsightDetailContribution({ contributions, lang, t }: Props) {
  const rows = useMemo(
    () => preprocessContributions(contributions).slice().sort((a, b) => b.openrank - a.openrank),
    [contributions],
  );

  if (rows.length === 0) return null;

  return (
    <div className="insight-detail-panel">
      <InsightDetailSectionHeader
        icon="map"
        eyebrow={t('insight.detailMapEyebrow')}
        title={t('insight.detailContributionMapHeading')}
        description={t('insight.detailMapSummary')}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="insight-detail-surface max-h-80 overflow-auto p-4">
          <ContributionTable rows={rows} lang={lang} t={t} />
        </div>
        <Suspense fallback={<ContributionMapFallback />}>
          <ContributionMap contributions={contributions} />
        </Suspense>
      </div>
    </div>
  );
}

function ContributionMapFallback() {
  return (
    <div className="detail-contribution-map" aria-hidden="true">
      <div className="detail-contribution-map__overlay">
        <span className="detail-contribution-map__loader" />
      </div>
    </div>
  );
}

function ContributionTable({
  rows,
  lang,
  t,
}: {
  rows: ReturnType<typeof preprocessContributions>;
  lang: Lang;
  t: (key: string) => string;
}) {
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
