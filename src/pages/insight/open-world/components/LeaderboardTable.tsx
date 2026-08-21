import type { SyntheticEvent } from 'react'
import { Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getCountryFlagCode } from '../../domain/geography'
import { formatCompactChange, formatCompactNumber } from '../format'
import type { Leaderboard, LeaderboardColumn, LeaderboardRow } from '../types'

interface LeaderboardTableProps {
  leaderboard: Leaderboard
  isZh: boolean
  loading: boolean
  /** 仅当行含 code 时调用，外层据此驱动地图下钻 */
  onRowClick?: (row: LeaderboardRow) => void
}

const MAX_ITEMS = 100

const PLACEHOLDER_FLAG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18"><rect width="24" height="18" fill="%23334155"/></svg>'

function rankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-500'
  if (rank === 2) return 'text-slate-400'
  if (rank === 3) return 'text-amber-600'
  return 'text-primary'
}

/**
 * 从 row.code 解析 ISO-3166-1 alpha-2 国家代码：
 * - 国家行: code='US' / 'CN'
 * - 省/州行: code='CN-BJ'，取前两位
 */
function flagUrlFromCode(code: string | undefined | null): string {
  if (!code) return ''
  const iso = code.split('-')[0]?.trim().toLowerCase()
  if (!iso || iso.length !== 2) return ''
  return `https://flagcdn.com/24x18/${iso}.png`
}

/** 剥离国家名中可能存在的 emoji 国旗前缀（Regional Indicator Symbols） */
function stripFlagEmoji(text: string): string {
  // Regional indicator symbols: U+1F1E6..U+1F1FF (组合两个形成国旗 emoji)
  return text.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '').trim()
}

/** 从国家名称获取 flagcdn 图片 URL */
function flagUrlFromCountryName(name: string | undefined | null): string {
  if (!name) return ''
  const stripped = stripFlagEmoji(name)
  const iso = getCountryFlagCode(stripped)
  if (!iso) return ''
  return `https://flagcdn.com/24x18/${iso.toLowerCase()}.png`
}

function formatChange(change: number, isZh: boolean): { text: string; cls: string; arrow: string } {
  if (!Number.isFinite(change) || change === 0) {
    return { text: '0', cls: 'text-muted-foreground', arrow: '—' }
  }
  const text = formatCompactChange(change, isZh)
  if (change > 0) {
    return { text, cls: 'text-emerald-500', arrow: '▲' }
  }
  return { text, cls: 'text-rose-500', arrow: '▼' }
}

/** 取列首字段值的字符串表示 */
function readField(row: LeaderboardRow, field: string): string {
  const v = row[field]
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

export function LeaderboardTable({ leaderboard, isZh, loading, onRowClick }: LeaderboardTableProps) {
  const { t } = useTranslation()

  const columns: LeaderboardColumn[] = isZh ? leaderboard.options_zh : leaderboard.options
  const rows = (leaderboard.data ?? []).slice(0, MAX_ITEMS)
  const isEmpty = !loading && rows.length === 0
  const title = isZh ? leaderboard.title_zh : leaderboard.title

  const handleFlagError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    img.onerror = null
    img.src = PLACEHOLDER_FLAG
  }

  return (
    <section className="openworld-leaderboard-card flex h-full flex-col overflow-hidden">
      <div className="openworld-leaderboard-header">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="openworld-section-icon openworld-section-icon--amber">
            <Trophy className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-500">
              {t('insight.overview.leaderboard.eyebrow')}
            </p>
            <h3 className="truncate text-xs font-semibold text-foreground" title={title}>{title}</h3>
          </div>
        </div>
        <span className="openworld-leaderboard-count">
          TOP {Math.min(rows.length, MAX_ITEMS)}
        </span>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('insight.overview.loading')}</p>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('insight.overview.noData')}</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <ul className="dark-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-1.5">
          {rows.map((row) => {
            const flagSrc = flagUrlFromCode(row.code)
            const change = formatChange(row.change, isZh)
            const clickable = !!onRowClick && !!row.code
            return (
              <li key={`${row.rank}-${row.id ?? row.code ?? row.name}`}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onRowClick?.(row)}
                  className={[
                    'openworld-leaderboard-row flex w-full items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-1 transition-colors duration-150',
                    row.rank <= 3 ? `openworld-leaderboard-row--rank-${row.rank}` : '',
                    clickable
                      ? 'cursor-pointer hover:border-primary/25 hover:bg-secondary/55'
                      : 'cursor-default',
                  ].join(' ')}
                  title={isZh ? row.name_zh || row.name : row.name}
                >
                  <span
                    className={`openworld-rank-number w-5 shrink-0 text-center text-[11px] font-bold tabular-nums ${rankColor(row.rank)}`}
                  >
                    {row.rank}
                  </span>

                  {/* 仅国家维度行（alpha-2 code，如 'US'/'CN'）带国旗；
                      下钻后的省/州行（'CN-BJ'等）不再带国旗，避免同一国家重复展示 */}
                  {row.code && row.code.length === 2 && (
                    <img
                      src={flagSrc || PLACEHOLDER_FLAG}
                      alt=""
                      onError={handleFlagError}
                      className="h-4 w-[22px] shrink-0 bg-secondary object-cover shadow-sm"
                      style={{ borderRadius: 2 }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* 主体: 按列定义 fields 渲染（首列 + 可选企业 logo） */}
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {columns.map((col, idx) => {
                      // rank/value/change 三列在表格中以固定位置渲染（非主体列）
                      const f0 = col.fields[0]
                      if (f0 === 'rank' || f0 === 'value' || f0 === 'change') return null
                      if (col.type === 'StringWithIcon') {
                        const textField = col.fields[0]
                        const logoField = col.fields[1]
                        const text = readField(row, textField)
                        const logo = logoField ? readField(row, logoField) : ''
                        return (
                          <span
                            key={`${col.name}-${idx}`}
                            className="flex min-w-0 items-center gap-1.5"
                          >
                            {logo && (
                              <img
                                src={logo}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                                className="h-4 w-4 shrink-0 rounded-sm object-contain"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <span className="min-w-0 truncate text-left text-[11px] font-medium text-foreground">
                              {text}
                            </span>
                          </span>
                        )
                      }
                      // String 类型
                      const text = readField(row, f0)
                      // 国家归属列（country/country_zh）使用次级颜色，并显示国旗图片
                      // 英文模式下不显示国家信息，避免文字过长截断
                      const isCountryCol = f0 === 'country' || f0 === 'country_zh'
                      if (isCountryCol) {
                        const rawCountry = readField(row, 'country')
                        const countryFlagSrc = flagUrlFromCountryName(rawCountry)
                        if (!countryFlagSrc) return null
                        return (
                          <span
                            key={`${col.name}-${idx}`}
                            className="flex shrink-0 items-center"
                          >
                            <img
                              src={countryFlagSrc}
                              alt={stripFlagEmoji(readField(row, isZh ? 'country_zh' : 'country') || rawCountry)}
                              title={stripFlagEmoji(readField(row, isZh ? 'country_zh' : 'country') || rawCountry)}
                              onError={handleFlagError}
                              className="h-[14px] w-5 shrink-0 bg-secondary object-cover"
                              style={{ borderRadius: 2 }}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          </span>
                        )
                      }
                      return (
                        <span
                          key={`${col.name}-${idx}`}
                          className="min-w-0 truncate text-left text-[11px] font-medium text-foreground"
                        >
                          {text}
                        </span>
                      )
                    })}
                  </div>

                  {/* 数值 + change 固定追加在行尾 */}
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground">
                    {formatCompactNumber(row.value, isZh)}
                  </span>
                  <span
                    className={`openworld-change-pill w-[4.15rem] shrink-0 text-right text-[9px] tabular-nums ${change.cls}`}
                    title={String(row.change)}
                  >
                    {change.arrow} {change.text}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
