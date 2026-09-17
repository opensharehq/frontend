import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface TierDiscountRibbonProps {
  tier: string | null;
  tierYear: number | null;
  multiplier: number;
}

export function TierDiscountRibbon({
  tier,
  tierYear,
  multiplier,
}: TierDiscountRibbonProps) {
  const { t } = useTranslation();
  if (!tier || multiplier >= 1) return null;

  const discount = Math.round(multiplier * 100);
  const percent = 100 - discount;
  const tierLabel = t('shop.discountTooltipTier', {
    tier,
    year: tierYear ?? '—',
  });
  const discountLabel = t('shop.discountTooltipRate', {
    discount,
    percent,
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="absolute -right-10 top-5 z-20 w-36 rotate-45 cursor-help bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 py-1 text-center text-xs font-bold tracking-wide text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
          aria-label={`${tierLabel}；${discountLabel}`}
          tabIndex={0}
        >
          {t('shop.discountRibbon', { percent })}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        className="w-max max-w-none px-2.5 py-2 text-left leading-relaxed whitespace-nowrap"
      >
        <span className="block">{tierLabel}</span>
        <span className="block">{discountLabel}</span>
      </TooltipContent>
    </Tooltip>
  );
}
