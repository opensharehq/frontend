import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { DATASETS } from '../constants'
import type { DatasetKey } from '../types'

interface MetricSelectorProps {
  value: DatasetKey
  onChange: (value: DatasetKey) => void
}

export function MetricSelector({ value, onChange }: MetricSelectorProps) {
  const { t } = useTranslation()

  const getLabel = (key: DatasetKey): string => {
    const i18nKey = `insight.overview.datasets.${key}`
    const translated = t(i18nKey)
    // 缺少翻译时回退到 key 本身，保证 trigger 不会出现空白
    return translated && translated !== i18nKey ? translated : key
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v as DatasetKey)}>
      <SelectTrigger className="openworld-metric-trigger w-full text-foreground">
        <SelectValue placeholder={getLabel(value)} />
      </SelectTrigger>
      <SelectContent>
        {DATASETS.map((key) => (
          <SelectItem key={key} value={key}>
            {getLabel(key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
