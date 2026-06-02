import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, MapPin, ArrowLeft, Tag, CheckCircle } from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/app/components/ui/alert-dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';

interface AllowedTag {
  slug: string;
  name: string;
}

interface ShippingAddress {
  id: number;
  receiver_name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  is_default: boolean;
}

interface UserBalance {
  total: number;
  cash: number;
  gift: number;
  gift_no_tag: number;
  by_tag: Record<string, number>;
}

interface ShopItemDetail {
  id: number;
  name: string;
  description: string;
  cost: number;
  stock: number | null;
  image_url: string | null;
  requires_shipping: boolean;
  allowed_tags: AllowedTag[];
  shipping_addresses: ShippingAddress[] | null;
}

interface WalletResponse {
  balance: UserBalance;
  wallet_id: number | null;
}

interface RedemptionResponse {
  id: number;
  item: { id: number; name: string };
  status: string;
  points_cost_at_redemption: number;
  created_at: string;
}

function getStockLabel(stock: number | null, t: (key: string, options?: Record<string, unknown>) => string): { text: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (stock === null) return { text: t('shop.stockSufficient'), variant: 'secondary' };
  if (stock === 0) return { text: t('shop.soldOut'), variant: 'destructive' };
  return { text: t('shop.stock', { count: stock }), variant: 'secondary' };
}

export default function ShopItemPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ShopItemDetail | null>(null);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [itemRes, walletRes] = await Promise.all([
          api.get<ShopItemDetail>(`/shop/items/${id}`),
          api.get<WalletResponse>('/points/me/wallet'),
        ]);
        setItem(itemRes.data);
        setBalance(walletRes.data.balance);
        // 预选默认地址
        const addresses = itemRes.data.shipping_addresses ?? [];
        const defaultAddr = addresses.find(a => a.is_default);
        if (defaultAddr) {
          setSelectedAddressId(String(defaultAddr.id));
        } else if (addresses.length > 0) {
          setSelectedAddressId(String(addresses[0].id));
        }
      } catch (err) {
        const apiErr = getApiError(err);
        toast.error(apiErr.message || t('shop.loadItemFailed'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, t]);

  async function handleRedeem() {
    if (!item) return;
    setRedeeming(true);
    try {
      const payload: { item_id: number; shipping_address_id?: number } = { item_id: item.id };
      if (item.requires_shipping && selectedAddressId) {
        payload.shipping_address_id = Number(selectedAddressId);
      }
      await api.post<RedemptionResponse>('/shop/redemptions', payload);
      setRedeemed(true);
      toast.success(t('shop.redeemSuccess').replace('！', ''));
    } catch (err) {
      const apiErr = getApiError(err);
      toast.error(apiErr.message || t('shop.redeemFailed'));
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!item || !balance) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>{t('shop.itemNotFound')}</p>
        <Button asChild variant="link" className="mt-4">
          <Link to="/shop">{t('shop.backToShop')}</Link>
        </Button>
      </div>
    );
  }

  const stockInfo = getStockLabel(item.stock, t);
  const soldOut = item.stock === 0;
  const addresses = item.shipping_addresses ?? [];
  const affordable = (() => {
    if (item.allowed_tags.length > 0) {
      const tagBalance = item.allowed_tags.reduce(
        (sum, tag) => sum + (balance.by_tag[tag.slug] || 0),
        0,
      );
      return tagBalance + balance.gift_no_tag >= item.cost;
    }
    return balance.gift >= item.cost;
  })();
  const canRedeem = !soldOut && affordable;

  // 兑换成功状态
  if (redeemed) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center py-12 space-y-4">
            <CheckCircle className="size-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold">{t('shop.redeemSuccess')}</h2>
            <p className="text-muted-foreground">
              {t('shop.redeemSuccessDesc', { cost: item.cost.toLocaleString(), name: item.name })}
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button asChild variant="outline">
                <Link to="/shop">{t('shop.continueShopping')}</Link>
              </Button>
              <Button asChild>
                <Link to="/redemptions">{t('shop.viewRedemptions')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <Button asChild variant="ghost" size="sm">
        <Link to="/shop">
          <ArrowLeft className="size-4" />
          {t('shop.backToShop')}
        </Link>
      </Button>

      {/* 商品信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 商品大图 */}
        <div className="aspect-square bg-muted rounded-xl flex items-center justify-center overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <Package className="size-24 text-muted-foreground/50" />
          )}
        </div>

        {/* 商品详情 */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <p className="text-muted-foreground">{item.description}</p>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('shop.requiredPoints')}</span>
              <span className="text-2xl font-bold text-primary">
                {item.cost.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('shop.stockStatus')}</span>
              <Badge variant={stockInfo.variant}>{stockInfo.text}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('shop.myPoints')}</span>
              <span className="font-medium">{balance.gift.toLocaleString()}</span>
            </div>
          </div>

          {/* 标签限制 */}
          {item.allowed_tags.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="size-4" />
                <span>{t('shop.tagOnlyRedeem')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.allowed_tags.map(tag => (
                  <Badge key={tag.slug} variant="outline">{tag.name}</Badge>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 兑换确认区 */}
      {canRedeem && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('shop.confirmRedeemTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 收货地址选择 */}
            {item.requires_shipping && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    {t('shop.shippingAddress')}
                  </Label>
                  <Button asChild variant="link" size="sm" className="h-auto p-0">
                    <Link to="/settings/addresses">{t('shop.manageAddress')}</Link>
                  </Button>
                </div>

                {addresses.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    <p>{t('shop.noAddress')}</p>
                    <Button asChild variant="link" size="sm" className="mt-1">
                      <Link to="/settings/addresses">{t('shop.addAddress')}</Link>
                    </Button>
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedAddressId}
                    onValueChange={setSelectedAddressId}
                  >
                    {addresses.map((addr) => (
                      <div key={addr.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <RadioGroupItem value={String(addr.id)} id={`addr-${addr.id}`} className="mt-1" />
                        <Label htmlFor={`addr-${addr.id}`} className="flex-1 cursor-pointer font-normal">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{addr.receiver_name}</span>
                            <span className="text-muted-foreground">{addr.phone}</span>
                            {addr.is_default && <Badge variant="secondary">{t('common.default')}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {addr.province}{addr.city}{addr.district}{addr.address}
                          </p>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            )}

            {/* 兑换按钮 */}
            <Separator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={item.requires_shipping && !selectedAddressId}
                >
                  {t('shop.confirmRedeem')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('shop.confirmRedeemTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('shop.confirmRedeemDesc', { cost: item.cost.toLocaleString(), name: item.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {redeeming ? t('shop.redeeming') : t('common.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* 不可兑换提示 */}
      {!canRedeem && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            {soldOut ? (
              <p>{t('shop.soldOutHint')}</p>
            ) : (
              <p>{t('shop.insufficientHint')}</p>
            )}
            <Button asChild variant="link" className="mt-2">
              <Link to="/shop">{t('shop.backToShop')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
