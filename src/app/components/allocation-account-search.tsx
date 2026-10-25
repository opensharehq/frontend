import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

interface AllocationAccountSearchProps {
  value: string;
  onChange: (value: string) => void;
  matchedCount: number;
  totalCount: number;
}

export default function AllocationAccountSearch({ value, onChange, matchedCount, totalCount }: AllocationAccountSearchProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          aria-label={t('allocationSearch.placeholder')}
          placeholder={t('allocationSearch.placeholder')}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pl-9 pr-10 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
            aria-label={t('allocationSearch.clear')}
            onClick={() => onChange('')}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground shrink-0" role="status">
        {t('allocationSearch.resultCount', { matched: matchedCount.toLocaleString(), total: totalCount.toLocaleString() })}
      </p>
    </div>
  );
}
