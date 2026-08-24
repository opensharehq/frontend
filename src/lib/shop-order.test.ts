import { describe, expect, it } from 'vitest';
import { orderShopItems } from './shop-order';

describe('orderShopItems', () => {
  it('places stocked items first and orders each stock group by descending priority', () => {
    const items = [
      { id: 'sold-high', stock: 0, priority: 100 },
      { id: 'stocked-low', stock: 1, priority: 2 },
      { id: 'unlimited-high', stock: null, priority: 10 },
      { id: 'sold-low', stock: 0, priority: 1 },
    ];

    expect(orderShopItems(items).map((item) => item.id)).toEqual([
      'unlimited-high',
      'stocked-low',
      'sold-high',
      'sold-low',
    ]);
    expect(items.map((item) => item.id)).toEqual([
      'sold-high',
      'stocked-low',
      'unlimited-high',
      'sold-low',
    ]);
  });

  it('preserves the API order when stock status and priority are equal', () => {
    const items = [
      { id: 'first', stock: 1, priority: 1 },
      { id: 'second', stock: null, priority: 1 },
    ];

    expect(orderShopItems(items).map((item) => item.id)).toEqual([
      'first',
      'second',
    ]);
  });
});
