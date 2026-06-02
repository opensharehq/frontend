import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Package, Tag } from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';

interface AllowedTag {
  slug: string;
  name: string;
}

interface ShopItem {
  id: number;
  name: string;
  description: string;
  cost: number;
  stock: number | null;
  image_url: string | null;
  requires_shipping: boolean;
  is_active: boolean;
  allowed_tags: AllowedTag[];
}

interface UserBalance {
  total: number;
  cash: number;
  gift: number;
  gift_no_tag: number;
  by_tag: Record<string, number>;
}

interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface ShopResponse {
  items: ShopItem[];
  balance: UserBalance;
  pagination?: Pagination;
}

function getStockLabel(stock: number | null, t: (key: string, options?: Record<string, unknown>) => string): { text: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (stock === null) return { text: t('shop.stockSufficient'), variant: 'secondary' };
  if (stock === 0) return { text: t('shop.soldOut'), variant: 'destructive' };
  return { text: t('shop.stock', { count: stock }), variant: 'secondary' };
}

function canAfford(item: ShopItem, balance: UserBalance): boolean {
  if (item.allowed_tags.length > 0) {
    const tagBalance = item.allowed_tags.reduce((sum, tag) => {
      return sum + (balance.by_tag[tag.slug] || 0);
    }, 0);
    return (tagBalance + balance.gift_no_tag) >= item.cost;
  }
  return balance.gift >= item.cost;
}

export default function ShopPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await api.get<ShopResponse>('/shop/items');
        setData(res.data);
      } catch (err) {
        const apiErr = getApiError(err);
        toast.error(apiErr.message || t('shop.loadFailed'));
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, [t]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { items, balance: user_balance } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 顶部标题和余额 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="size-6" />
          {t('shop.title')}
        </h1>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {t('shop.myGiftPoints', { amount: user_balance.gift.toLocaleString() })}
        </Badge>
      </div>

      {/* 商品网格 */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="size-12 mx-auto mb-4 opacity-50" />
          <p>{t('shop.noItems')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const stockInfo = getStockLabel(item.stock, t);
            const affordable = canAfford(item, user_balance);
            const soldOut = item.stock === 0;

            return (
              <Card key={item.id} className="overflow-hidden flex flex-col">
                {/* 商品图片 */}
                <div className="aspect-[2/1] bg-muted flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="size-10 text-muted-foreground/50" />
                  )}
                </div>

                <CardHeader className="pb-1 pt-3">
                  <CardTitle className="text-base font-semibold">{item.name}</CardTitle>
                </CardHeader>

                <CardContent className="flex-1 space-y-2 pb-3">
                  {/* 描述 */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>

                  {/* 积分和库存 */}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {item.cost.toLocaleString()} {t('shop.points')}
                    </span>
                    <Badge variant={stockInfo.variant}>{stockInfo.text}</Badge>
                  </div>

                  {/* 标签限制 */}
                  {item.allowed_tags.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="size-3" />
                      <span>{t('shop.tagOnly', { tags: item.allowed_tags.map(tg => tg.name).join('、') })}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  {soldOut ? (
                    <Button disabled className="w-full" variant="secondary">
                      {t('shop.soldOut')}
                    </Button>
                  ) : !affordable ? (
                    <Button disabled className="w-full" variant="secondary">
                      {t('shop.insufficientPoints')}
                    </Button>
                  ) : (
                    <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                      <Link to={`/shop/${item.id}`}>{t('shop.redeemNow')}</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
