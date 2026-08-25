import { describe, expect, it } from 'vitest';

import {
  calculateRedemptionPayment,
  canAffordRedemption,
} from '@/lib/redemption-payment';

describe('calculateRedemptionPayment', () => {
  it('uses tagged, untagged gift, and cash points in order', () => {
    const plan = calculateRedemptionPayment({
      cost: 100,
      primary: { type: 'gift', tagSlug: 'event', balance: 60 },
      untaggedGiftBalance: 25,
      cashBalance: 20,
      useUntaggedGift: true,
      useCash: true,
    });

    expect(plan).toEqual({
      lines: [
        { pointType: 'gift', tagSlug: 'event', amount: 60 },
        { pointType: 'gift', tagSlug: null, amount: 25 },
        { pointType: 'cash', tagSlug: null, amount: 15 },
      ],
      covered: 100,
      remaining: 0,
      sufficient: true,
    });
  });

  it('does not use a fallback bucket without explicit authorization', () => {
    const plan = calculateRedemptionPayment({
      cost: 100,
      primary: { type: 'gift', tagSlug: 'event', balance: 60 },
      untaggedGiftBalance: 100,
      cashBalance: 100,
      useUntaggedGift: false,
      useCash: false,
    });

    expect(plan.sufficient).toBe(false);
    expect(plan.remaining).toBe(40);
    expect(plan.lines).toEqual([
      { pointType: 'gift', tagSlug: 'event', amount: 60 },
    ]);
  });

  it('allows cash to top up untagged gift points', () => {
    const plan = calculateRedemptionPayment({
      cost: 100,
      primary: { type: 'gift', tagSlug: null, balance: 80 },
      untaggedGiftBalance: 80,
      cashBalance: 30,
      useUntaggedGift: false,
      useCash: true,
    });

    expect(plan.lines).toEqual([
      { pointType: 'gift', tagSlug: null, amount: 80 },
      { pointType: 'cash', tagSlug: null, amount: 20 },
    ]);
    expect(plan.sufficient).toBe(true);
  });
});

describe('canAffordRedemption', () => {
  it('uses only the largest eligible tag bucket plus explicit fallback pools', () => {
    expect(canAffordRedemption(100, [40, 30], 20, 40)).toBe(true);
    expect(canAffordRedemption(101, [40, 30], 20, 40)).toBe(false);
  });

  it('does not count tagged balances for an unrestricted item', () => {
    expect(canAffordRedemption(100, [], 60, 40)).toBe(true);
    expect(canAffordRedemption(101, [], 60, 40)).toBe(false);
  });
});
