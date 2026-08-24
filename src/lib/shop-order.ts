interface OrderableShopItem {
  stock: number | null;
  priority?: number | null;
}

function getAvailabilityRank(stock: number | null): number {
  return stock === 0 ? 0 : 1;
}

function getPriority(priority: number | null | undefined): number {
  return typeof priority === 'number' && Number.isFinite(priority) ? priority : 1;
}

export function orderShopItems<T extends OrderableShopItem>(items: readonly T[]): T[] {
  return [...items].sort((first, second) => {
    const stockDifference = getAvailabilityRank(second.stock) - getAvailabilityRank(first.stock);
    if (stockDifference !== 0) return stockDifference;
    return getPriority(second.priority) - getPriority(first.priority);
  });
}
