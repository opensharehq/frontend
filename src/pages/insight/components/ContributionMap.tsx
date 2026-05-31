import type { ECharts, EChartsOption } from 'echarts';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import type { ContributionRow } from '../types/api';
import { preprocessContributions } from '../domain/geography';
import { WORLD_GEOJSON_URL } from '../api/constants';
import { normalizeInsightLang } from '../domain/lang';

type Props = {
  contributions: ContributionRow[];
};

type EChartsModule = typeof import('./contributionMapEcharts');

let echartsLoader: Promise<EChartsModule> | null = null;

function loadECharts() {
  if (!echartsLoader) {
    echartsLoader = import('./contributionMapEcharts');
  }
  return echartsLoader;
}

function readThemeColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function ContributionMap({ contributions }: Props) {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const lang = normalizeInsightLang(i18n.language);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const optionRef = useRef<EChartsOption | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const processed = preprocessContributions(contributions);
  const hasData = processed.length > 0;

  useEffect(() => {
    if (!hasData || shouldLoadMap) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: '360px 0px' },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [hasData, shouldLoadMap]);

  useEffect(() => {
    setMapReady(false);
    setLoadError(false);
    const proc = preprocessContributions(contributions);
    if (proc.length === 0 || !shouldLoadMap) return;

    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let chart: ECharts | null = null;
    let onResize: (() => void) | null = null;

    const mapData = proc.map((c) => ({
      name: c.mapName,
      value: Math.log(c.openrank + 1),
      openrank: c.openrank,
      developers: c.developers ?? 0,
      countryCode: c.countryCode,
      displayNameZh: c.displayNameZh,
      displayNameEn: c.displayNameEn,
    }));
    const maxValue = Math.max(...mapData.map((d) => d.value));
    const cardColor = readThemeColor('--card', '#1E293B');
    const foregroundColor = readThemeColor('--foreground', '#E2E8F0');
    const mutedColor = readThemeColor('--muted-foreground', '#94A3B8');
    const borderColor = readThemeColor('--border', '#475569');
    const secondaryColor = readThemeColor('--secondary', '#334155');
    const primaryColor = readThemeColor('--primary', '#22C55E');

    Promise.all([
      loadECharts(),
      fetch(WORLD_GEOJSON_URL).then((res) => res.json()),
    ])
      .then(([{ echarts }, worldJson]) => {
        if (cancelled) return;
        echarts.registerMap('world', worldJson);
        chart = echarts.init(container);
        chartRef.current = chart;
        onResize = () => chart?.resize();
        window.addEventListener('resize', onResize);
        const option: EChartsOption = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            backgroundColor: cardColor,
            borderColor,
            borderWidth: 1,
            textStyle: { color: foregroundColor, fontSize: 12 },
            formatter(params: unknown) {
              const p = params as {
                name?: string;
                data?: {
                  openrank?: number;
                  value?: number;
                  developers?: number;
                  displayNameZh?: string;
                  displayNameEn?: string;
                  countryCode?: string | null;
                };
              };
              const openrank =
                (p.data?.openrank != null ? p.data.openrank : (p as { value?: number }).value) ?? 0;
              const displayVal = Number(openrank);
              const safeVal = typeof displayVal === 'number' && !Number.isNaN(displayVal) ? displayVal : 0;
              const developers =
                p.data?.developers != null && typeof p.data.developers === 'number' ? p.data.developers : 0;
              const countryDisplay =
                lang === 'zh' ? p.data?.displayNameZh || p.name : p.data?.displayNameEn || p.name;
              const devLabel = t('insight.mapTooltipDevelopers');
              const flagCode = p.data?.countryCode;
              const flagImg = flagCode
                ? `<img src="https://flagcdn.com/24x18/${flagCode.toLowerCase()}.png" alt="" style="vertical-align:middle;margin-right:4px;width:24px;height:18px;">`
                : '';
              return `<div style="font-weight:600">${flagImg}${countryDisplay}</div><div>${t('insight.headerOpenRank')}: ${safeVal.toLocaleString()}</div><div>${devLabel}: ${developers.toLocaleString()}</div>`;
            },
          },
          visualMap: {
            min: 0,
            max: maxValue,
            left: 'left',
            bottom: '10',
            text: [t('insight.mapVisualHigh'), t('insight.mapVisualLow')],
            formatter: () => '',
            textStyle: { color: mutedColor },
            calculable: true,
            inRange: { color: ['#dcfce7', '#86efac', '#4ade80', '#22c55e', '#16a34a'] },
          },
          series: [
            {
              name: t('insight.mapSeriesName'),
              type: 'map',
              map: 'world',
              roam: true,
              emphasis: {
                label: { show: true, color: foregroundColor },
                itemStyle: { areaColor: primaryColor },
              },
              itemStyle: {
                areaColor: secondaryColor,
                borderColor,
                borderWidth: 0.5,
              },
              label: { show: false },
              data: mapData,
            },
          ],
        };
        optionRef.current = option;
        chart.setOption(option);
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      if (onResize) window.removeEventListener('resize', onResize);
      chart?.dispose();
      chartRef.current = null;
      optionRef.current = null;
    };
  }, [contributions, lang, resolvedTheme, shouldLoadMap, t]);

  const resetMap = () => {
    const chart = chartRef.current;
    const opt = optionRef.current;
    if (chart && opt) {
      chart.clear();
      chart.setOption(opt);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      {!hasData && (
        <div
          id="contributionMapContainer"
          className="rounded-lg border border-border bg-background p-4"
          style={{ height: 320 }}
        >
          <p className="py-4 text-center text-sm text-muted-foreground">{t('insight.noData')}</p>
        </div>
      )}
      {hasData && loadError && (
        <div
          className="rounded-lg border border-border bg-background p-4"
          style={{ height: 320 }}
        >
          <p className="py-4 text-center text-sm text-muted-foreground">{t('insight.mapLoadFailed')}</p>
        </div>
      )}
      {hasData && !loadError && (
        <>
          <div
            ref={containerRef}
            id="contributionMapContainer"
            className="rounded-lg border border-border bg-background p-4"
            style={{ height: 320 }}
          />
          {mapReady && (
            <button
              id="contributionMapResetBtn"
              type="button"
              className="absolute right-6 top-6 cursor-pointer rounded border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              title={t('insight.mapResetTitle')}
              onClick={resetMap}
            >
              {t('insight.mapReset')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
