interface OrderableShopItem {
  stock: number | null;
  priority: number;
}

export function orderShopItems<T extends OrderableShopItem>(items: readonly T[]): T[] {
  return [...items].sort((first, second) => {
    const stockDifference = Number(second.stock !== 0) - Number(first.stock !== 0);
    if (stockDifference !== 0) return stockDifference;
    return second.priority - first.priority;
  });
}
