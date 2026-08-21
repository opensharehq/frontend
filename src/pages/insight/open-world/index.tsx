import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleSlash2, Globe2, MapPinned, MousePointer2, Radio } from 'lucide-react'

import { fetchOverviewDataset, fetchOverviewMeta } from './api'
import { InfoBar } from './components/InfoBar'
import { LeaderboardPanel } from './components/LeaderboardPanel'
import { MetricSelector } from './components/MetricSelector'
import { OverviewMap } from './components/OpenWorldMap'
import { TrendChart } from './components/TrendChart'
import {
  COUNTRY_META,
  DEFAULT_DATASET,
  DEFAULT_GEO_SCOPE,
  DRILL_DOWN_COUNTRIES,
} from './constants'
import type { DatasetKey, GeoScope, LeaderboardRow, OverviewDataset, OverviewMeta, OverviewSummary } from './types'

/** 将 ISO 时间或 'YYYY-MM-DD' 刪到 YYYY-MM（InfoBar 要求精度到月） */
function normalizeUpdatedAt(raw: string | undefined): string {
  if (typeof raw === 'string' && /^\d{4}-\d{2}/.test(raw)) {
    return raw.slice(0, 7)
  }
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** 当前客户端时间格式化为 YYYY-MM 用于 InfoBar.updatedAt 兜底 */
function getCurrentYearMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default function OverviewPage() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')

  const [dataset, setDataset] = useState<DatasetKey>(DEFAULT_DATASET)
  const [geoScope, setGeoScope] = useState<GeoScope>(DEFAULT_GEO_SCOPE)
  const [payload, setPayload] = useState<OverviewDataset | null>(null)
  const [meta, setMeta] = useState<OverviewMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // meta 只需拉一次（summary / drillDownCountries）
  useEffect(() => {
    let cancelled = false
    fetchOverviewMeta().then((data) => {
      if (cancelled) return
      setMeta(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // influence 不支持下钻，切换到 influence 时回归世界视图
  useEffect(() => {
    if (dataset === 'influence' && geoScope !== 'world') {
      setGeoScope(DEFAULT_GEO_SCOPE)
    }
  }, [dataset, geoScope])

  // 切换 dataset 或 geoScope 时拉取数据；切 dataset 时保留 geoScope（用户停留在下钻态）
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const effectiveScope = dataset === 'influence' ? 'world' : geoScope
    fetchOverviewDataset(dataset, effectiveScope).then((data) => {
      if (cancelled) return
      setPayload(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [dataset, geoScope])

  const handleDrillDown = useCallback((countryCode: string) => {
    if (dataset === 'influence') return
    setGeoScope(countryCode)
  }, [dataset])

  const handleBackToWorld = useCallback(() => {
    setGeoScope(DEFAULT_GEO_SCOPE)
  }, [])

  const handleRowClick = useCallback((row: LeaderboardRow) => {
    if (dataset === 'influence') return
    if (typeof row.code === 'string' && DRILL_DOWN_COUNTRIES.includes(row.code) && geoScope === 'world') {
      setGeoScope(row.code)
    }
  }, [dataset, geoScope])

  // dataset 名称（i18n + key 兜底）
  const datasetI18nKey = `insight.overview.datasets.${dataset}`
  const translatedDataset = t(datasetI18nKey)
  const metricLabel = translatedDataset === datasetI18nKey ? dataset : translatedDataset

  // 地区名称（world / 下钻国家）
  const regionLabel = useMemo(() => {
    if (geoScope === 'world') return isZh ? '全球' : 'World'
    const meta = COUNTRY_META[geoScope]
    if (!meta) return geoScope
    return isZh ? meta.zh : meta.en
  }, [geoScope, isZh])

  const pageTitle = t('insight.overview.map.titlePattern', { metric: metricLabel, region: regionLabel })
  const drillDownAvailable = dataset !== 'influence'

  // 地图数据源：固定取第一个含 code 的国家榜（企业榜无 code 不参与地图）
  const mapRows: LeaderboardRow[] = useMemo(() => {
    if (!payload) return []
    const board = payload.leaderboards.find(b => b.data.some(r => typeof r.code === 'string'))
    return board?.data ?? []
  }, [payload])

  const leaderboards = payload?.leaderboards ?? []
  const trends = payload?.trends ?? []

  // InfoBar summary：优先用 meta，未拉到时本地兜底
  const summary: OverviewSummary = useMemo(() => {
    if (meta?.summary) {
      const s = meta.summary
      return {
        totalRecords: typeof s.totalRecords === 'number' ? s.totalRecords : undefined,
        totalRepos: typeof s.totalRepos === 'number' ? s.totalRepos : 0,
        totalDevelopers: typeof s.totalDevelopers === 'number' ? s.totalDevelopers : 0,
        totalCountries: typeof s.totalCountries === 'number' ? s.totalCountries : undefined,
        dataSource: typeof s.dataSource === 'string' && s.dataSource ? s.dataSource : 'OpenDigger',
        updatedAt: normalizeUpdatedAt(s.updatedAt),
      }
    }
    return {
      totalRepos: 0,
      totalDevelopers: 0,
      dataSource: 'OpenDigger',
      updatedAt: getCurrentYearMonth(),
    }
  }, [meta])

  return (
    <section className="openworld-page flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="openworld-hero shrink-0">
        <div className="min-w-0">
          <div className="openworld-eyebrow">
            <Globe2 className="size-3.5" aria-hidden="true" />
            <span>{t('insight.overview.hero.eyebrow')}</span>
          </div>
          <div className="mt-1 flex min-w-0 items-baseline gap-3">
            <h1 className="openworld-title">{t('insight.overview.hero.title')}</h1>
            <span className="openworld-scope-label">/ {regionLabel}</span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground md:text-sm">
            {t('insight.overview.hero.description')}
          </p>
        </div>

        <div className="flex shrink-0 items-end gap-3">
          <div className="openworld-live-status hidden xl:flex">
            <Radio className="size-3.5" aria-hidden="true" />
            <span>{t('insight.overview.hero.live')}</span>
          </div>
          <div className="w-72">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t('insight.overview.hero.metricLabel')}
            </p>
            <MetricSelector value={dataset} onChange={setDataset} />
          </div>
        </div>
      </header>

      <div className="shrink-0">
        <InfoBar summary={summary} />
      </div>

      {/* 主内容区域 */}
      <div className="openworld-dashboard-grid min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="openworld-map-shell flex min-h-0 flex-1 flex-col">
            <div className="openworld-map-header">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="openworld-section-icon">
                  <MapPinned className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {t('insight.overview.map.coverage')}
                  </p>
                  <h2 className="truncate text-sm font-semibold text-foreground" title={pageTitle}>
                    {pageTitle}
                  </h2>
                </div>
              </div>
              <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex">
                {drillDownAvailable ? (
                  <MousePointer2 className="size-3.5 text-primary" aria-hidden="true" />
                ) : (
                  <CircleSlash2 className="size-3.5" aria-hidden="true" />
                )}
                <span>
                  {t(drillDownAvailable
                    ? 'insight.overview.map.exploreHint'
                    : 'insight.overview.map.noDrillDownHint')}
                </span>
              </div>
            </div>

            <div className="openworld-map-stage min-h-0 flex-1 overflow-hidden">
              <OverviewMap
                rows={mapRows}
                geoScope={geoScope}
                metricLabel={metricLabel}
                regionLabel={regionLabel}
                isZh={isZh}
                loading={loading}
                onDrillDown={handleDrillDown}
                onBackToWorld={handleBackToWorld}
              />
            </div>
          </div>

          <div className="openworld-trend-grid h-[136px] shrink-0 overflow-hidden">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="min-h-0 min-w-0 overflow-hidden">
                <TrendChart
                  trend={trends[idx] ?? null}
                  loading={loading}
                  isZh={isZh}
                  compact
                  accentIndex={idx}
                />
              </div>
            ))}
          </div>
        </div>

        <aside className="min-h-0 min-w-0">
          <LeaderboardPanel
            leaderboards={leaderboards}
            isZh={isZh}
            loading={loading}
            onRowClick={handleRowClick}
          />
        </aside>
      </div>

      <div className="sr-only" aria-live="polite">
        {loading ? t('insight.overview.loading') : `${metricLabel} · ${regionLabel}`}
      </div>
    </section>
  )
}
