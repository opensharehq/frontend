import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Package } from 'lucide-react';
import { format } from 'date-fns';
import api, { getApiError } from '@/lib/api';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';

interface RedemptionItem {
  id: number;
  name: string;
  image_url: string | null;
}

interface ShippingAddress {
  receiver_name: string;
  phone: string;
  address: string;
}

interface Redemption {
  id: number;
  item: RedemptionItem;
  points_cost_at_redemption: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  shipping_address: ShippingAddress | null;
  created_at: string;
}

interface RedemptionsResponse {
  items: Redemption[];
  total: number;
  page: number;
  page_size: number;
}

function getStatusBadge(status: Redemption['status'], t: (key: string) => string): { text: string; className: string } {
  switch (status) {
    case 'COMPLETED':
      return { text: t('redemptions.completed'), className: 'bg-green-100 text-green-800 border-green-200' };
    case 'PENDING':
      return { text: t('redemptions.pending'), className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    case 'CANCELLED':
      return { text: t('redemptions.cancelled'), className: 'bg-red-100 text-red-800 border-red-200' };
    default:
      return { text: status, className: '' };
  }
}

export default function RedemptionsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<RedemptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRedemptions() {
      try {
        const res = await api.get<RedemptionsResponse>('/shop/redemptions');
        setData(res.data);
      } catch (err) {
        const apiErr = getApiError(err);
        toast.error(apiErr.message || t('redemptions.loadFailed'));
      } finally {
        setLoading(false);
      }
    }
    fetchRedemptions();
  }, [t]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { items } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 标题 */}
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShoppingBag className="size-6" />
        {t('redemptions.title')}
      </h1>

      {/* 空状态 */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="size-12 mx-auto mb-4 opacity-50" />
          <p>{t('redemptions.noRecords')}</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/shop">{t('redemptions.goToShop')}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((redemption) => {
            const statusBadge = getStatusBadge(redemption.status, t);
            return (
              <div
                key={redemption.id}
                className="flex items-center gap-4 rounded-xl border p-4"
              >
                {/* 商品缩略图 */}
                <div className="size-16 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {redemption.item.image_url ? (
                    <img
                      src={redemption.item.image_url}
                      alt={redemption.item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="size-6 text-muted-foreground/50" />
                  )}
                </div>

                {/* 信息区 */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{redemption.item.name}</span>
                    <Badge variant="outline" className={statusBadge.className}>
                      {statusBadge.text}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span>{t('redemptions.costPoints', { amount: redemption.points_cost_at_redemption.toLocaleString() })}</span>
                    <span>{format(new Date(redemption.created_at), 'yyyy-MM-dd HH:mm')}</span>
                  </div>
                  {redemption.shipping_address && (
                    <p className="text-xs text-muted-foreground truncate">
                      {t('redemptions.shippingTo', { name: redemption.shipping_address.receiver_name, phone: redemption.shipping_address.phone, address: redemption.shipping_address.address })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
