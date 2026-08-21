import { CalendarClock, Database, GitFork, Globe2, Layers3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatCompactNumber } from '../format'
import type { OverviewSummary } from '../types'

interface InfoBarProps {
  summary: OverviewSummary | null
}

export function InfoBar({ summary }: InfoBarProps) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')

  if (!summary) return null

  // 仅在远端下发对应字段时展示，避免出现 "NaN" 或 "0"
  const stats = [
    ...(typeof summary.totalRecords === 'number'
      ? [{
          label: t('insight.overview.infoBar.totalRecords'),
          value: formatCompactNumber(summary.totalRecords, isZh),
          icon: Database,
        }]
      : []),
    {
      label: t('insight.overview.infoBar.totalRepos'),
      value: formatCompactNumber(summary.totalRepos, isZh),
      icon: GitFork,
    },
    {
      label: t('insight.overview.infoBar.totalDevelopers'),
      value: formatCompactNumber(summary.totalDevelopers, isZh),
      icon: Layers3,
    },
    ...(typeof summary.totalCountries === 'number'
      ? [{
          label: t('insight.overview.infoBar.totalCountries'),
          value: formatCompactNumber(summary.totalCountries, isZh),
          icon: Globe2,
        }]
      : []),
    {
      label: t('insight.overview.infoBar.updatedAt'),
      value: summary.updatedAt,
      icon: CalendarClock,
    },
  ]

  return (
    <section className="openworld-stat-rail dark-scrollbar" aria-label={t('insight.overview.infoBar.summary')}>
      <div className="openworld-source-cell">
        <span className="openworld-stat-icon openworld-stat-icon--source">
          <img
            src="https://oss.open-digger.cn/logos/communities/xlab/open_digger.png"
            alt=""
            className="size-4 object-contain"
          />
        </span>
        <div className="min-w-0">
          <p className="openworld-stat-label">{t('insight.overview.infoBar.dataSource')}</p>
          <a
            href="https://open-digger.cn"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            {summary.dataSource}
          </a>
        </div>
      </div>

      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="openworld-stat-cell">
          <span className="openworld-stat-icon">
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="openworld-stat-label">{label}</p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="truncate text-sm font-semibold tabular-nums text-foreground">{value}</span>
              <span className="size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
