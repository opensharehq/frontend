export interface RedemptionPaymentOption {
  type: 'gift' | 'cash';
  tagSlug: string | null;
  balance: number;
}

export interface RedemptionPaymentLine {
  pointType: 'gift' | 'cash';
  tagSlug: string | null;
  amount: number;
}

interface CalculateRedemptionPaymentInput {
  cost: number;
  primary: RedemptionPaymentOption;
  untaggedGiftBalance: number;
  cashBalance: number;
  useUntaggedGift: boolean;
  useCash: boolean;
}

export interface RedemptionPaymentPlan {
  lines: RedemptionPaymentLine[];
  covered: number;
  remaining: number;
  sufficient: boolean;
}

export function calculateRedemptionPayment({
  cost,
  primary,
  untaggedGiftBalance,
  cashBalance,
  useUntaggedGift,
  useCash,
}: CalculateRedemptionPaymentInput): RedemptionPaymentPlan {
  let remaining = cost;
  const lines: RedemptionPaymentLine[] = [];

  const primaryAmount = Math.min(primary.balance, remaining);
  if (primaryAmount > 0) {
    lines.push({
      pointType: primary.type,
      tagSlug: primary.tagSlug,
      amount: primaryAmount,
    });
    remaining -= primaryAmount;
  }

  if (
    remaining > 0 &&
    primary.type === 'gift' &&
    primary.tagSlug !== null &&
    useUntaggedGift
  ) {
    const untaggedGiftAmount = Math.min(untaggedGiftBalance, remaining);
    if (untaggedGiftAmount > 0) {
      lines.push({
        pointType: 'gift',
        tagSlug: null,
        amount: untaggedGiftAmount,
      });
      remaining -= untaggedGiftAmount;
    }
  }

  if (remaining > 0 && primary.type === 'gift' && useCash) {
    const cashAmount = Math.min(cashBalance, remaining);
    if (cashAmount > 0) {
      lines.push({ pointType: 'cash', tagSlug: null, amount: cashAmount });
      remaining -= cashAmount;
    }
  }

  return {
    lines,
    covered: cost - remaining,
    remaining,
    sufficient: remaining === 0,
  };
}

export function canAffordRedemption(
  cost: number,
  allowedTagBalances: number[],
  untaggedGiftBalance: number,
  cashBalance: number,
): boolean {
  const primaryGiftBalance =
    allowedTagBalances.length > 0
      ? Math.max(...allowedTagBalances)
      : untaggedGiftBalance;
  const fallbackGiftBalance =
    allowedTagBalances.length > 0 ? untaggedGiftBalance : 0;
  return primaryGiftBalance + fallbackGiftBalance + cashBalance >= cost;
}
