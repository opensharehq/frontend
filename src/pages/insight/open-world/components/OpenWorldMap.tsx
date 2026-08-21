import type { EChartsType } from 'echarts/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ALWAYS_LABEL_COUNTRIES, ALWAYS_LABEL_SUBDIVISIONS, COUNTRY_META, DRILL_DOWN_COUNTRIES } from '../constants'
import { formatCompactNumber } from '../format'
import type { GeoScope, LeaderboardRow } from '../types'

interface OverviewMapProps {
  /** 由 index.tsx 选取当前 dataset 中第一个含 code 的国家榜 data */
  rows: LeaderboardRow[]
  geoScope: GeoScope
  metricLabel: string
  regionLabel: string
  isZh: boolean
  loading: boolean
  onDrillDown: (countryCode: string) => void
  onBackToWorld: () => void
}

type EChartsModule = typeof import('./openWorldMapEcharts')

let echartsLoader: Promise<EChartsModule> | null = null

function loadECharts(): Promise<EChartsModule> {
  if (!echartsLoader) {
    echartsLoader = import('./openWorldMapEcharts')
  }
  return echartsLoader
}

const geoJsonCache = new Map<string, unknown>()
const registeredMaps = new Set<string>()

function readThemeColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

interface ThemeColors {
  card: string
  cardForeground: string
  border: string
  secondary: string
  foreground: string
  mutedForeground: string
  chart1: string
  heatRamp: string[]
}

function readThemeColors(): ThemeColors {
  return {
    card: readThemeColor('--card', '#1E293B'),
    cardForeground: readThemeColor('--card-foreground', '#E2E8F0'),
    border: readThemeColor('--border', '#475569'),
    secondary: readThemeColor('--secondary', '#334155'),
    foreground: readThemeColor('--foreground', '#E2E8F0'),
    mutedForeground: readThemeColor('--muted-foreground', '#64748B'),
    chart1: readThemeColor('--chart-1', '#22C55E'),
    heatRamp: document.documentElement.classList.contains('light')
      ? ['#E5F4E9', '#B8E1C5', '#76C893', '#35A86B', '#16734A']
      : ['#183237', '#17534B', '#14745C', '#18A46E', '#4ADE80'],
  }
}

function geoFileToMapName(geoFile: string): string {
  return geoFile.replace(/\.json$/i, '')
}

/**
 * 对原始数值做 log10(x+1) 变换，压缩中美印等头部国家与尾部国家之间的差距，
 * 提升热力图区分度；对 0 与负数做兜底，结果始终非负。
 */
function toLogScale(raw: number): number {
  const safe = Number.isFinite(raw) && raw > 0 ? raw : 0
  return Math.log10(safe + 1)
}

/**
 * 热力图绿色色带（从浅到深）。
 * 下界从浅绿起步（避免过白与背景难以区分），上界采用更深的草绿提升头部对比；
 * 与无数据区域的主题灰色 areaColor 产生明显区分。
 */
interface MapItem {
  /** 必须严格匹配 GeoJSON 内部 name，否则热力不着色 */
  name: string
  /** 当前语言下的展示名，在 tooltip 与 hover label 中使用 */
  displayName: string
  value: number
  rawValue: number
  code: string
}

/**
 * 将中国省级完整名称归一到 /geo/CN.json 的简称 key：
 * - 内蒙古自治区/内蒙古 → 内蒙古
 * - 黑龙江省/黑龙江 → 黑龙江
 * - 其他省/市/自治区/特别行政区 → 前两个汉字（如“北京市”→“北京”）
 * 已经是简称或未知名称原样返回。
 */
function normalizeCnProvinceName(raw: string): string {
  if (!raw) return raw
  if (raw.startsWith('内蒙古')) return '内蒙古'
  if (raw.startsWith('黑龙江')) return '黑龙江'
  // 取前两个汉字作为简称；对 ASCII / 其他字符名称不做调整
  const chars = Array.from(raw)
  if (chars.length >= 2 && /[\u4e00-\u9fa5]/.test(chars[0])) {
    return chars.slice(0, 2).join('')
  }
  return raw
}

interface MapClickParams {
  name?: string
  value?: number | number[]
  data?: { name?: string; displayName?: string; value?: number; rawValue?: number; code?: string }
}

/**
 * 将榜单行映射为地图项：
 * - world 视图: 仅取 alpha2（code 长度=2）行；name 用英文匹配 GeoJSON，displayName 按语言选中/英
 * - 下钻视图: 仅取 ISO 3166-2（code 形如 'CN-XX'）行；CN 用中文简称匹配 /geo/CN.json，US 用英文州名匹配 /geo/US.json；
 *   displayName 按当前语言从 row.name / row.name_zh 选取，实现中英文切换展示。
 */
function buildMapItems(rows: LeaderboardRow[], geoScope: GeoScope, isZh: boolean): MapItem[] {
  if (!Array.isArray(rows)) return []
  if (geoScope === 'world') {
    return rows
      .filter(r => typeof r.code === 'string' && r.code.length === 2)
      .map(r => ({
        name: r.name,
        displayName: (isZh ? r.name_zh : r.name) || r.name || r.name_zh,
        rawValue: Number(r.value) || 0,
        value: toLogScale(Number(r.value) || 0),
        code: r.code as string,
      }))
  }
  // 下钻：行 code 形如 'CN-BJ'，命名按目标 GeoJSON 选择
  const useZhKey = geoScope === 'CN'
  return rows
    .filter(r => typeof r.code === 'string' && (r.code as string).startsWith(`${geoScope}-`))
    .map((r) => {
      const rawKey = useZhKey ? r.name_zh || r.name : r.name || r.name_zh
      // /geo/CN.json 使用省份简称（如“北京”而非“北京市”），
      // 后端下发为完整名，需在映射时归一，否则热力着色会全部丢失。
      const name = useZhKey ? normalizeCnProvinceName(rawKey) : rawKey
      // 展示名：严格使用数据原始名（如“北京市”/“Beijing”），不做归一，
      // 仅负责着色的 name 需匹配 GeoJSON。
      const displayName = isZh ? r.name_zh || r.name : r.name || r.name_zh
      return {
        name,
        displayName,
        rawValue: Number(r.value) || 0,
        value: toLogScale(Number(r.value) || 0),
        code: r.code as string,
      }
    })
}

export function OverviewMap({
  rows,
  geoScope,
  metricLabel,
  regionLabel,
  isZh,
  loading,
  onDrillDown,
  onBackToWorld,
}: OverviewMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<EChartsType | null>(null)
  const [echartsReady, setEchartsReady] = useState(false)
  const [mapName, setMapName] = useState<string | null>(null)
  const [error, setError] = useState(false)

  // activeMapName: the map currently being rendered (only switches when data is ready)
  const [activeMapName, setActiveMapName] = useState<string | null>(null)
  // activeGeoScope: the geoScope corresponding to activeMapName
  const [activeGeoScope, setActiveGeoScope] = useState<GeoScope>(geoScope)

  // Determine which GeoJSON file to load for the current scope
  const geoTarget = useMemo<{ url: string; name: string } | null>(() => {
    if (geoScope === 'world') {
      return { url: '/geo/world.json', name: 'world' }
    }
    if (!DRILL_DOWN_COUNTRIES.includes(geoScope)) return null
    const geoFile = COUNTRY_META[geoScope]?.geoFile ?? `${geoScope}.json`
    return { url: `/geo/${geoFile}`, name: geoFileToMapName(geoFile) }
  }, [geoScope])

  // Load ECharts module + GeoJSON, register map
  useEffect(() => {
    if (!geoTarget) return
    let cancelled = false
    setError(false)

    const ensureGeoJson = async (): Promise<unknown> => {
      const cached = geoJsonCache.get(geoTarget.url)
      if (cached) return cached
      const res = await fetch(geoTarget.url)
      if (!res.ok) throw new Error(`Failed to load ${geoTarget.url}`)
      const json: unknown = await res.json()
      geoJsonCache.set(geoTarget.url, json)
      return json
    }

    Promise.all([loadECharts(), ensureGeoJson()])
      .then(([{ echarts }, geoJson]) => {
        if (cancelled) return
        if (!registeredMaps.has(geoTarget.name)) {
          echarts.registerMap(geoTarget.name, geoJson as Parameters<typeof echarts.registerMap>[1])
          registeredMaps.add(geoTarget.name)
        }
        setMapName(geoTarget.name)
        setEchartsReady(true)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [geoTarget])

  // Only switch the actively rendered map when both GeoJSON is ready and data has loaded.
  // This prevents the map from going gray during drill-down transitions.
  useEffect(() => {
    if (!loading && mapName && geoTarget && mapName === geoTarget.name) {
      setActiveMapName(mapName)
      setActiveGeoScope(geoScope)
    }
  }, [loading, mapName, geoTarget, geoScope])

  // Whether we are in transition (waiting for GeoJSON + data to arrive for new scope)
  const isTransitioning = geoScope !== activeGeoScope || loading

  // Use activeGeoScope for building map items so the old map keeps its data during transition
  const mapItems = useMemo(() => buildMapItems(rows, activeGeoScope, isZh), [rows, activeGeoScope, isZh])

  const drillCodeSet = useMemo(() => new Set(DRILL_DOWN_COUNTRIES), [])

  // Build option from current data + theme
  const buildOption = useCallback(
    (currentMapName: string, theme: ThemeColors) => {
      // 自适应 visualMap 区间：以当前数据的「最小值× 0.8」为下界，
      // 避免因固定从 0 起步导致头部区间被压缩、色阶趋同；
      // 同时保留 log 压缩以压住中美印等头部国家的带宽占据。
      const positiveRawValues = mapItems
        .map(it => it.rawValue)
        .filter(v => Number.isFinite(v) && v > 0)
      const rawMax = positiveRawValues.length
        ? Math.max(...positiveRawValues)
        : 1
      const rawMin = positiveRawValues.length
        ? Math.min(...positiveRawValues)
        : 0
      const displayRawMin = rawMin > 0 ? rawMin * 0.8 : 0
      const logMax = toLogScale(rawMax)
      const logMinRaw = toLogScale(displayRawMin)
      // 全部数据相同时，指定一个下界避免 min===max导致 visualMap 崩溃
      const logMin = logMinRaw < logMax ? logMinRaw : Math.max(0, logMax - 0.5)
      return {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item' as const,
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1,
          textStyle: { color: theme.cardForeground, fontSize: 12 },
          formatter: (params: unknown) => {
            const p = params as MapClickParams
            const raw = typeof p.data?.rawValue === 'number' ? p.data.rawValue : 0
            // 优先用 displayName（当前语言），未命中数据的 region 回退为 GeoJSON 原名
            const label = p.data?.displayName || p.name || ''
            return `<div style="font-weight:600">${label}</div><div>${metricLabel}: ${formatCompactNumber(raw, isZh)}</div>`
          },
        },
        visualMap: {
          min: logMin,
          max: logMax > logMin ? logMax : logMin + 1,
          left: 14,
          bottom: 48,
          itemHeight: 108,
          itemWidth: 10,
          calculable: true,
          show: true,
          textStyle: { color: theme.mutedForeground },
          formatter: (value: number) => {
            const raw = Math.max(0, Math.round(Math.pow(10, value) - 1))
            return formatCompactNumber(raw, isZh)
          },
          // 色带：低值近于白的极浅绿，高值为饱和草绿；
          // 无数据区域沿用 itemStyle.areaColor=theme.card（主题灰），
          // 与最低段的极浅绿形成视觉区分，避免「有数据但显示成灰色」的误判。
          inRange: {
            color: theme.heatRamp,
          },
        },
        series: [
          {
            type: 'map' as const,
            map: currentMapName,
            roam: true,
            data: mapItems,
            itemStyle: {
              areaColor: theme.secondary,
              borderColor: theme.border,
              borderWidth: 0.65,
            },
            emphasis: {
              itemStyle: {
                areaColor: theme.chart1,
                shadowBlur: 14,
                shadowColor: theme.chart1,
              },
              label: {
                show: true,
                color: theme.foreground,
                // hover 时按当前语言显示；无数据 region 回退为 GeoJSON 原名
                formatter: (params: unknown) => {
                  const p = params as MapClickParams
                  return p.data?.displayName || p.name || ''
                },
              },
            },
            // 世界视图下仅对白名单内的国家默认显示名称；
            // 下钻视图下同样仅对 ALWAYS_LABEL_SUBDIVISIONS 中配置的省/州默认显示。
            // 其他区域仍隐藏，仅在 emphasis 时显示。
            label: {
              show: true,
              // 黑灰色 + 白色描边，保证在浅绿/深绿等任意底色上都能清晰识别
              color: '#1F2937',
              textBorderColor: '#FFFFFF',
              textBorderWidth: 2,
              fontSize: 10,
              fontWeight: 600 as const,
              formatter: (params: unknown) => {
                const p = params as MapClickParams
                const name = p.name || ''
                if (activeGeoScope === 'world') {
                  const meta = ALWAYS_LABEL_COUNTRIES[name]
                  if (!meta) return ''
                  return isZh ? meta.zh : (p.data?.displayName || meta.en)
                }
                const subMap = ALWAYS_LABEL_SUBDIVISIONS[activeGeoScope]
                if (!subMap) return ''
                const meta = subMap[name]
                if (!meta) return ''
                return isZh ? meta.zh : (p.data?.displayName || meta.en)
              },
            },
          },
        ],
      }
    },
    [mapItems, metricLabel, activeGeoScope, isZh],
  )

  // 重置地图缩放与平移
  const handleReset = useCallback(() => {
    if (!chartRef.current || !activeMapName) return
    chartRef.current.setOption(buildOption(activeMapName, readThemeColors()), { notMerge: true })
  }, [buildOption, activeMapName])

  // Initialize / update the chart instance
  useEffect(() => {
    if (!echartsReady || !activeMapName) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let chart: EChartsType | null = chartRef.current

    const handleClick = (params: unknown) => {
      const p = params as MapClickParams
      const code = p.data?.code
      if (code && drillCodeSet.has(code) && geoScope === 'world') {
        onDrillDown(code)
      }
    }

    const handleResize = () => {
      chartRef.current?.resize()
    }

    const applyOption = () => {
      if (!chartRef.current) return
      const theme = readThemeColors()
      chartRef.current.setOption(buildOption(activeMapName, theme), { notMerge: true })
    }

    loadECharts()
      .then(({ echarts }) => {
        if (cancelled) return
        if (!chart) {
          chart = echarts.init(container)
          chartRef.current = chart
        }
        chart.off('click')
        chart.on('click', handleClick)
        applyOption()
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    window.addEventListener('resize', handleResize)

    // 父容器尺寸变化（如 InfoBar 加载后主区被压缩）主动触发 resize，
    // 避免 echarts 初始化后锁定的 inline style 尺寸与父容器实际尺寸不一致
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        chartRef.current?.resize()
      })
      resizeObserver.observe(container)
    }

    const observer = new MutationObserver(() => {
      applyOption()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })

    return () => {
      cancelled = true
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
      observer.disconnect()
      chartRef.current?.off('click')
    }
  }, [echartsReady, activeMapName, buildOption, drillCodeSet, geoScope, onDrillDown])

  // Dispose chart only when component unmounts
  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  const hasData = mapItems.length > 0
  // Only show full overlay for initial load or error; during drill-down transition use spinner
  const showFullOverlay = (!isTransitioning && !hasData && !loading) || error
  const showTransitionSpinner = isTransitioning && !error
  const overlayMessage = error
    ? t('insight.overview.error')
    : !hasData && !loading
      ? t('insight.overview.noData')
      : ''

  // 仅用于无障碍 aria-label，避免在 dataset 切换时丢失上下文
  return (
    <div className="relative h-full w-full">
      {geoScope !== 'world' && (
        <button
          type="button"
          onClick={onBackToWorld}
          className="openworld-map-action absolute left-3 top-3 z-10"
          title={t('insight.overview.map.backToWorld')}
        >
          ← {t('insight.overview.map.backToWorld')}
        </button>
      )}
      <div
        ref={containerRef}
        className="absolute inset-0"
        aria-label={`${metricLabel} - ${regionLabel}`}
      />
      {echartsReady && !error && (
        <button
          type="button"
          onClick={handleReset}
          className="openworld-map-action absolute bottom-3 left-3 z-10"
          title={t('insight.overview.map.resetZoom')}
        >
          ↻ {t('insight.overview.map.resetZoom')}
        </button>
      )}
      {showTransitionSpinner && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 rounded-lg bg-card/90 px-5 py-4 shadow-lg">
            <svg
              className="h-8 w-8 animate-spin text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs text-muted-foreground">{t('insight.overview.loading')}</p>
          </div>
        </div>
      )}
      {showFullOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-md bg-card/80 px-4 py-2 text-sm text-muted-foreground">
            {overlayMessage}
          </p>
        </div>
      )}
    </div>
  )
}

export default OverviewMap
