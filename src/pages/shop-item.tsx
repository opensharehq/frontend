import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import i18n from '@/i18n';
import { Package, MapPin, ArrowLeft, Tag, CheckCircle, Wallet } from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { calculateRedemptionPayment } from '@/lib/redemption-payment';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
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
  by_tag_names?: Record<string, string>;
}

interface ShopItemDetail {
  id: number;
  name_zh: string;
  name_en: string;
  brief_zh: string;
  brief_en: string;
  description_zh: string;
  description_en: string;
  cost: number;
  stock: number | null;
  image_card_url: string | null;
  image_detail_url: string | null;
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
  item: { id: number; name_zh: string; name_en: string };
  status: string;
  points_cost: number;
  created_at: string;
  coupon_code: string | null;
  payment_lines: Array<{
    point_type: 'gift' | 'cash';
    tag_slug: string | null;
    amount: number;
  }>;
}

interface PaymentOption {
  type: 'gift' | 'cash';
  tag_slug: string | null;
  tag_name: string | null;
  balance: number;
  sufficient: boolean;
}

function getStockLabel(stock: number | null, t: (key: string, options?: Record<string, unknown>) => string): { text: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (stock === null) return { text: t('shop.stockSufficient'), variant: 'secondary' };
  if (stock === 0) return { text: t('shop.soldOut'), variant: 'destructive' };
  return { text: t('shop.stockSufficient'), variant: 'secondary' };
}

const getLocalizedField = (item: ShopItemDetail, field: string): string => {
  const lang = i18n.language === 'zh' ? 'zh' : 'en';
  const value = item[`${field}_${lang}` as keyof ShopItemDetail] as string;
  const fallback = item[`${field}_zh` as keyof ShopItemDetail] as string;
  return value || fallback || '';
};

/** Tailwind v4 arbitrary-variant styles for ReactMarkdown rendered content */
const MARKDOWN_PROSE_CLASS =
  "max-w-none text-sm leading-relaxed text-muted-foreground " +
  "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 " +
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 " +
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 " +
  "[&_p]:my-2 [&_p]:leading-relaxed " +
  "[&_strong]:font-semibold [&_em]:italic " +
  "[&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80 " +
  "[&_img]:max-w-full [&_img]:rounded-md [&_img]:my-2 " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 " +
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 " +
  "[&_li]:my-1 [&_li]:leading-relaxed " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 " +
  "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm " +
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:my-2 " +
  "[&_hr]:my-4 [&_hr]:border-border " +
  "[&_table]:my-2 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold";

export default function ShopItemPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ShopItemDetail | null>(null);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [useUntaggedGift, setUseUntaggedGift] = useState(false);
  const [useCash, setUseCash] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [itemRes, walletRes] = await Promise.all([
          api.get<ShopItemDetail>(`/shop/items/${id}`),
          api.get<WalletResponse>('/points/me/wallet'),
        ]);
        setItem(itemRes.data);
        setBalance(walletRes.data.balance);
        const defaultTag = itemRes.data.allowed_tags[0];
        setSelectedPayment(defaultTag ? `gift:${defaultTag.slug}` : 'gift');
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
      const payload: {
        item_id: number;
        shipping_address_id?: number;
        lang: string;
        point_type: string;
        tag_slug: string | null;
        use_untagged_gift: boolean;
        use_cash: boolean;
      } = {
        item_id: item.id,
        lang: i18n.language === 'zh' ? 'zh' : 'en',
        point_type: 'gift',
        tag_slug: null,
        use_untagged_gift: useUntaggedGift,
        use_cash: useCash,
      };
      if (selectedPayment) {
        const [type, ...tagParts] = selectedPayment.split(':');
        payload.point_type = type;
        payload.tag_slug = tagParts.length > 0 ? tagParts.join(':') : null;
      }
      if (item.requires_shipping && selectedAddressId) {
        payload.shipping_address_id = Number(selectedAddressId);
      }
      const res = await api.post<RedemptionResponse>('/shop/redemptions', payload);
      setCouponCode(res.data.coupon_code);
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

  // 计算可用的支付选项
  const paymentOptions = (() => {
    const options: PaymentOption[] = [];

    // 带标签礼物积分（仅对 allowed_tags 商品可用）
    if (item.allowed_tags.length > 0) {
      for (const tag of item.allowed_tags) {
        const tagBalance = balance.by_tag[tag.slug] || 0;
        options.push({
          type: 'gift',
          tag_slug: tag.slug,
          tag_name: tag.name,
          balance: tagBalance,
          sufficient: tagBalance >= item.cost,
        });
      }
    }

    // 通用礼物积分对所有商品都可作为主支付积分使用。
    options.push({
      type: 'gift',
      tag_slug: null,
      tag_name: null,
      balance: balance.gift_no_tag,
      sufficient: balance.gift_no_tag >= item.cost,
    });

    // 现金积分（对所有商品可用）
    options.push({
      type: 'cash',
      tag_slug: null,
      tag_name: null,
      balance: balance.cash,
      sufficient: balance.cash >= item.cost,
    });

    return options;
  })();

  const paymentKey = (opt: PaymentOption) =>
    opt.type + (opt.tag_slug ? `:${opt.tag_slug}` : '');

  const currentPayment = paymentOptions.find(
    opt => paymentKey(opt) === selectedPayment,
  );
  const paymentPlan = currentPayment
    ? calculateRedemptionPayment({
        cost: item.cost,
        primary: {
          type: currentPayment.type,
          tagSlug: currentPayment.tag_slug,
          balance: currentPayment.balance,
        },
        untaggedGiftBalance: balance.gift_no_tag,
        cashBalance: balance.cash,
        useUntaggedGift,
        useCash,
      })
    : null;
  const canRedeem = !soldOut && (paymentPlan?.sufficient ?? false);

  const primaryShortfall = currentPayment
    ? Math.max(item.cost - currentPayment.balance, 0)
    : item.cost;
  const canOfferUntaggedGift = Boolean(
    currentPayment?.type === 'gift' &&
      currentPayment.tag_slug &&
      primaryShortfall > 0 &&
      balance.gift_no_tag > 0,
  );
  const untaggedGiftTopUpAmount = canOfferUntaggedGift
    ? Math.min(balance.gift_no_tag, primaryShortfall)
    : 0;
  const shortfallAfterGift = Math.max(
    primaryShortfall -
      (useUntaggedGift ? untaggedGiftTopUpAmount : 0),
    0,
  );
  const canOfferCash = Boolean(
    currentPayment?.type === 'gift' &&
      shortfallAfterGift > 0 &&
      balance.cash > 0,
  );
  const cashTopUpAmount = canOfferCash
    ? Math.min(balance.cash, shortfallAfterGift)
    : 0;
  const displayedUntaggedGiftBalance =
    balance.gift_no_tag - (useUntaggedGift ? untaggedGiftTopUpAmount : 0);
  const displayedCashBalance = balance.cash - (useCash ? cashTopUpAmount : 0);

  const handlePaymentChange = (value: string) => {
    setSelectedPayment(value);
    setUseUntaggedGift(false);
    setUseCash(false);
  };

  // 兑换成功状态
  if (redeemed) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center py-12 space-y-4">
            <CheckCircle className="size-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold">{t('shop.redeemSuccess')}</h2>
            <p className="text-muted-foreground">
              {t('shop.redeemSuccessDesc', { cost: item.cost.toLocaleString(), name: getLocalizedField(item, 'name') })}
            </p>
            {couponCode && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium">{t('shop.couponCodeReceived')}</p>
                <p className="mt-2 font-mono text-lg text-center bg-white p-2 rounded border text-gray-900">
                  {couponCode}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{t('shop.checkMessage')}</p>
              </div>
            )}
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <Button asChild variant="ghost" size="sm">
        <Link to="/shop">
          <ArrowLeft className="size-4" />
          {t('shop.backToShop')}
        </Link>
      </Button>

      <h1 className="text-2xl font-bold lg:hidden">{getLocalizedField(item, 'name')}</h1>

      {/* 商品信息 */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
        {/* 左列：商品大图 + 详情描述 */}
        <div className="space-y-6">
          <div className="aspect-square w-full max-w-xl bg-muted rounded-xl flex items-center justify-center overflow-hidden mx-auto">
            {item.image_detail_url ? (
              <img
                src={item.image_detail_url}
                alt={getLocalizedField(item, 'name')}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Package className="size-24 text-muted-foreground/50" />
            )}
          </div>

          <div className={MARKDOWN_PROSE_CLASS}>
            <ReactMarkdown>{getLocalizedField(item, 'description')}</ReactMarkdown>
          </div>
        </div>

        {/* 右列：商品信息 + 兑换确认 */}
        <div className="space-y-5">
          <h1 className="hidden text-2xl font-bold lg:block">{getLocalizedField(item, 'name')}</h1>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{t('shop.requiredPoints')}</span>
              <span className="text-2xl font-bold text-primary">
                {item.cost.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{t('shop.stockStatus')}</span>
              <Badge variant={stockInfo.variant}>{stockInfo.text}</Badge>
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

          {/* 兑换确认区 */}
          {!soldOut && currentPayment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('shop.confirmRedeemTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 支付方式选择 */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Wallet className="size-4" />
                    {t('shop.paymentMethod')}
                  </Label>
                  <RadioGroup
                    value={selectedPayment}
                    onValueChange={handlePaymentChange}
                  >
                    {paymentOptions.map((opt) => {
                      const key = paymentKey(opt);
                      let label: string;
                      if (opt.type === 'gift' && opt.tag_slug) {
                        label = t('shop.paymentGiftTagged', { tag: opt.tag_name ?? opt.tag_slug });
                      } else if (opt.type === 'gift' && !opt.tag_slug) {
                        label = t('shop.paymentGiftUntagged');
                      } else {
                        label = t('shop.paymentCash');
                      }
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => handlePaymentChange(key)}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={key} id={`payment-${key}`} />
                            <Label htmlFor={`payment-${key}`} className="cursor-pointer font-normal">
                              <span className="font-medium">{label}</span>
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {t('shop.paymentBalance', { balance: opt.balance.toLocaleString() })}
                            </span>
                            {!opt.sufficient && (
                              <Badge variant="destructive" className="text-xs">
                                {t('shop.insufficientBalance')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                {currentPayment.type === 'gift' && primaryShortfall > 0 && (
                  <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                    <div>
                      <p className="font-medium text-sm">{t('shop.topUpTitle')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('shop.topUpShortfall', { amount: primaryShortfall.toLocaleString() })}
                      </p>
                    </div>

                    {canOfferUntaggedGift && (
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="use-untagged-gift"
                          checked={useUntaggedGift}
                          onCheckedChange={checked => setUseUntaggedGift(checked === true)}
                        />
                        <Label htmlFor="use-untagged-gift" className="cursor-pointer font-normal leading-snug">
                          {t('shop.useUniversalTopUp', {
                            amount: untaggedGiftTopUpAmount.toLocaleString(),
                            balance: displayedUntaggedGiftBalance.toLocaleString(),
                          })}
                        </Label>
                      </div>
                    )}

                    {canOfferCash && (
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="use-cash-topup"
                          checked={useCash}
                          onCheckedChange={checked => setUseCash(checked === true)}
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Label htmlFor="use-cash-topup" className="cursor-pointer font-normal leading-snug">
                            {t('shop.useCashTopUp', {
                              amount: cashTopUpAmount.toLocaleString(),
                              balance: displayedCashBalance.toLocaleString(),
                            })}
                          </Label>
                          <p className="rounded-md border border-amber-300 bg-amber-100/60 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            {t('shop.cashTopUpWarning')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {paymentPlan && (
                  <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                    <Label>{t('shop.paymentPreview')}</Label>
                    {paymentPlan.lines.map((line) => {
                      const tag = item.allowed_tags.find(option => option.slug === line.tagSlug);
                      const label = line.pointType === 'cash'
                        ? t('shop.paymentCash')
                        : line.tagSlug
                          ? t('shop.paymentGiftTagged', { tag: tag?.name ?? line.tagSlug })
                          : t('shop.paymentGiftUntagged');
                      return (
                        <div
                          key={`${line.pointType}:${line.tagSlug ?? 'untagged'}`}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{line.amount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                    {paymentPlan.remaining > 0 && (
                      <div className="flex justify-between text-sm text-destructive font-medium">
                        <span>{t('shop.remainingShortfall')}</span>
                        <span>{paymentPlan.remaining.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

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
                      disabled={!canRedeem || (item.requires_shipping && !selectedAddressId)}
                    >
                      {t('shop.confirmRedeem')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('shop.confirmRedeemTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('shop.confirmRedeemDesc', { cost: item.cost.toLocaleString(), name: getLocalizedField(item, 'name') })}
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
                {!canRedeem && (
                  <p className="text-center text-sm text-muted-foreground">
                    {t('shop.insufficientHint')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 不可兑换提示 */}
          {(soldOut || !currentPayment) && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                {soldOut ? (
                  <p>{t('shop.soldOutHint')}</p>
                ) : (
                  <p>{t('shop.selectPayment')}</p>
                )}
                <Button asChild variant="link" className="mt-2">
                  <Link to="/shop">{t('shop.backToShop')}</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
