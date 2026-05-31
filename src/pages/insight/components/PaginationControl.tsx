import { Icon } from '@iconify/react/offline';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  /** Omit the label row; for toolbars next to other controls */
  compact?: boolean;
  /** Show prev/next and page dropdown even when totalPages is 1 */
  showWhenSinglePage?: boolean;
  /** Smaller bar height and text (toolbar next to other compact controls). */
  dense?: boolean;
};

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  compact = false,
  showWhenSinglePage = false,
  dense = false,
}: Props) {
  const { t } = useTranslation();
  const selectPageLabel = t('insight.selectPage');

  if (!showWhenSinglePage && totalPages <= 1) return null;

  const bar = (
    <div
      id={compact ? undefined : 'paginationContainer'}
      className={`flex items-center overflow-hidden border border-border bg-background ${compact ? (dense ? 'h-10 rounded-md sm:h-7' : 'h-10 rounded-lg') : 'rounded-lg'}`}
    >
      <button
        type="button"
        id="prevPageBtn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={`time-picker-arrow flex flex-shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 ${dense && compact ? 'size-10 sm:size-7' : 'h-10 w-9'}`}
      >
        <Icon icon="mdi:chevron-left" className={dense && compact ? 'text-sm' : 'text-lg'} aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <Select
          value={String(currentPage)}
          onValueChange={(value) => onPageChange(Number(value))}
        >
          <SelectTrigger
            id="pageDropdownBtn"
            aria-label={selectPageLabel}
            size={dense && compact ? 'sm' : 'default'}
            className={`page-select-trigger rounded-none border-0 bg-transparent shadow-none focus-visible:ring-2 focus-visible:ring-ring ${dense && compact ? 'h-10 px-2 py-1 text-xs sm:h-7' : 'h-10 px-3 py-2.5 text-sm'}`}
          >
            <SelectValue>
              {currentPage} / {totalPages}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            id="pageDropdownMenu"
            className={dense && compact ? 'max-h-40 min-w-20' : 'max-h-52 min-w-24'}
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <SelectItem
                key={p}
                value={String(p)}
                className={dense && compact ? 'min-h-8 text-xs' : undefined}
              >
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <button
        type="button"
        id="nextPageBtn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={`time-picker-arrow flex flex-shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 ${dense && compact ? 'size-10 sm:size-7' : 'h-10 w-9'}`}
      >
        <Icon icon="mdi:chevron-right" className={dense && compact ? 'text-sm' : 'text-lg'} aria-hidden />
      </button>
    </div>
  );

  if (compact) {
    return bar;
  }

  return (
    <>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon icon="mdi:page-next" />
        <span>{t('insight.pagination')}</span>
      </label>
      {bar}
    </>
  );
}
