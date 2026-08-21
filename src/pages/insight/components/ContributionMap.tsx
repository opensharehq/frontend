import type { EChartsType } from 'echarts/core';
import type { EChartsOption } from 'echarts';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { RotateCcw } from 'lucide-react';
import type { ContributionRow } from '../types/api';
import { preprocessContributions } from '../domain/geography';
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

type MapTheme = {
  card: string;
  cardForeground: string;
  border: string;
  secondary: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  heatRamp: string[];
};

function readMapTheme(): MapTheme {
  return {
    card: readThemeColor('--card', '#1E293B'),
    cardForeground: readThemeColor('--card-foreground', '#E2E8F0'),
    border: readThemeColor('--border', '#475569'),
    secondary: readThemeColor('--secondary', '#334155'),
    foreground: readThemeColor('--foreground', '#E2E8F0'),
    mutedForeground: readThemeColor('--muted-foreground', '#94A3B8'),
    primary: readThemeColor('--primary', '#22C55E'),
    heatRamp: document.documentElement.classList.contains('light')
      ? ['#E5F4E9', '#B8E1C5', '#76C893', '#35A86B', '#16734A']
      : ['#183237', '#17534B', '#14745C', '#18A46E', '#4ADE80'],
  };
}

function toLogScale(raw: number): number {
  const safe = Number.isFinite(raw) && raw > 0 ? raw : 0;
  return Math.log10(safe + 1);
}

export function ContributionMap({ contributions }: Props) {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const lang = normalizeInsightLang(i18n.language);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
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
    let chart: EChartsType | null = null;
    let onResize: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const mapData = proc.map((c) => ({
      name: c.mapName,
      value: toLogScale(c.openrank),
      openrank: c.openrank,
      developers: c.developers ?? 0,
      countryCode: c.countryCode,
      displayNameZh: c.displayNameZh,
      displayNameEn: c.displayNameEn,
    }));
    const positiveOpenrank = mapData.map((item) => item.openrank).filter((value) => value > 0);
    const rawMax = positiveOpenrank.length ? Math.max(...positiveOpenrank) : 1;
    const rawMin = positiveOpenrank.length ? Math.min(...positiveOpenrank) : 0;
    const logMax = toLogScale(rawMax);
    const rawDisplayMin = rawMin > 0 ? rawMin * 0.8 : 0;
    const calculatedLogMin = toLogScale(rawDisplayMin);
    const logMin = calculatedLogMin < logMax ? calculatedLogMin : Math.max(0, logMax - 0.5);
    const topLabelNames = new Set(
      mapData
        .slice()
        .sort((a, b) => b.openrank - a.openrank)
        .slice(0, 6)
        .map((item) => item.name),
    );
    const theme = readMapTheme();

    Promise.all([
      loadECharts(),
      fetch('/geo/world.json').then((res) => {
        if (!res.ok) throw new Error('Failed to load world map');
        return res.json();
      }),
    ])
      .then(([{ echarts }, worldJson]) => {
        if (cancelled) return;
        echarts.registerMap('world', worldJson);
        const instance = echarts.init(container);
        chart = instance;
        chartRef.current = instance;
        onResize = () => instance.resize();
        window.addEventListener('resize', onResize);
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => instance.resize());
          resizeObserver.observe(container);
        }
        const option: EChartsOption = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            textStyle: { color: theme.cardForeground, fontSize: 12 },
            extraCssText: 'border-radius:10px;box-shadow:0 14px 34px rgba(2,6,23,.34);backdrop-filter:blur(12px);',
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
            min: logMin,
            max: logMax > logMin ? logMax : logMin + 1,
            left: 14,
            bottom: 32,
            itemHeight: 104,
            itemWidth: 10,
            text: [t('insight.mapVisualHigh'), t('insight.mapVisualLow')],
            formatter: (value: unknown) => {
              const numericValue = Number(value) || 0;
              const raw = Math.max(0, Math.round(Math.pow(10, numericValue) - 1));
              return raw.toLocaleString();
            },
            textStyle: { color: theme.mutedForeground, fontSize: 10 },
            calculable: true,
            inRange: { color: theme.heatRamp },
          },
          series: [
            {
              name: t('insight.mapSeriesName'),
              type: 'map',
              map: 'world',
              roam: true,
              emphasis: {
                label: {
                  show: true,
                  color: theme.foreground,
                  formatter: (params: unknown) => {
                    const p = params as {
                      name?: string;
                      data?: { displayNameZh?: string; displayNameEn?: string };
                    };
                    return lang === 'zh'
                      ? p.data?.displayNameZh || p.name || ''
                      : p.data?.displayNameEn || p.name || '';
                  },
                },
                itemStyle: {
                  areaColor: theme.primary,
                  borderColor: theme.primary,
                  shadowBlur: 16,
                  shadowColor: theme.primary,
                },
              },
              itemStyle: {
                areaColor: theme.secondary,
                borderColor: theme.border,
                borderWidth: 0.65,
              },
              label: {
                show: true,
                color: '#1F2937',
                textBorderColor: '#FFFFFF',
                textBorderWidth: 2,
                fontSize: 9,
                fontWeight: 600,
                formatter: (params: unknown) => {
                  const p = params as {
                    name?: string;
                    data?: { displayNameZh?: string; displayNameEn?: string };
                  };
                  if (!p.name || !topLabelNames.has(p.name)) return '';
                  return lang === 'zh'
                    ? p.data?.displayNameZh || p.name
                    : p.data?.displayNameEn || p.name;
                },
              },
              scaleLimit: { min: 1, max: 8 },
              data: mapData,
            },
          ],
        };
        optionRef.current = option;
        instance.setOption(option);
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      if (onResize) window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
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
        <div id="contributionMapContainer" className="detail-contribution-map">
          <div className="detail-contribution-map__overlay">
            <p>{t('insight.noData')}</p>
          </div>
        </div>
      )}
      {hasData && loadError && (
        <div className="detail-contribution-map">
          <div className="detail-contribution-map__overlay">
            <p>{t('insight.mapLoadFailed')}</p>
          </div>
        </div>
      )}
      {hasData && !loadError && (
        <div className="detail-contribution-map">
          <span className="detail-contribution-map__signal">
            <span aria-hidden />
            {t('insight.detailMapScope')}
          </span>
          <div
            ref={containerRef}
            id="contributionMapContainer"
            className="detail-contribution-map__canvas"
          />
          {!mapReady ? (
            <div className="detail-contribution-map__overlay">
              <span className="detail-contribution-map__loader" aria-hidden />
              <p>{t('insight.loading')}</p>
            </div>
          ) : null}
          {mapReady && (
            <button
              id="contributionMapResetBtn"
              type="button"
              className="openworld-map-action detail-contribution-map__reset"
              title={t('insight.mapResetTitle')}
              onClick={resetMap}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              {t('insight.mapReset')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
