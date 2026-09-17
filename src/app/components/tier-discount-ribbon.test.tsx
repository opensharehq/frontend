import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { TierDiscountRibbon } from './tier-discount-ribbon';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values: Record<string, string | number>) => {
      if (key === 'shop.discountRibbon') return `${values.percent}% OFF`;
      if (key === 'shop.discountTooltipTier') {
        return `Highest annual tier: ${values.tier} (${values.year})`;
      }
      return `Current discount: ${values.discount}% (${values.percent}% OFF)`;
    },
  }),
}));

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('TierDiscountRibbon', () => {
  it('keeps discount labels complementary and exposes the tooltip to keyboards', () => {
    render(<TierDiscountRibbon tier="SS" tierYear={2023} multiplier={0.855} />);

    const trigger = screen.getByText('14% OFF');
    expect(trigger).toHaveAttribute('tabindex', '0');
    trigger.focus();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAccessibleName(
      'Highest annual tier: SS (2023)；Current discount: 86% (14% OFF)',
    );
    expect(trigger).toHaveClass('focus-visible:ring-2');
  });
});
