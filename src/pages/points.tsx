import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  ArrowUpRight,
  ShoppingBag,
  Send,
  Loader2,
} from "lucide-react";
import api, { getApiError } from "@/lib/api";
import { getIsMainlandCn } from "@/lib/geo";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  PointsBalanceCard,
  type PointsBalanceData,
} from "@/app/components/points-balance-card";
import { toast } from "sonner";

interface WalletResponse {
  balance: PointsBalanceData;
  wallet_id: number | null;
  recent_transactions: unknown[];
}

export default function PointsPage() {
  const { t } = useTranslation();
  const [balance, setBalance] = useState<PointsBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const isMainlandCn = getIsMainlandCn();

  useEffect(() => {
    async function fetchBalance() {
      try {
        const { data } = await api.get<WalletResponse>("/points/me/wallet");
        setBalance(data.balance);
      } catch (err) {
        const apiErr = getApiError(err);
        toast.error(t('points.loadFailed'), { description: apiErr.message });
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">{t('points.loadFailedData')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{t('points.title')}</h1>
          <p className="max-w-2xl text-sm leading-6 text-foreground/70 text-pretty">{t('points.subtitle')}</p>
        </div>
        <Button variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
          <Link to="/points/transactions">
            <ArrowRightLeft className="size-4" />
            <span>{t('points.transactions')}</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <PointsBalanceCard balance={balance} />

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('points.operations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {isMainlandCn && (
                <Button variant="outline" className="min-h-11 justify-start" asChild>
                  <Link to="/points/withdrawals">
                    <ArrowUpRight className="size-4" />
                    <span>{t('points.withdrawRequest')}</span>
                  </Link>
                </Button>
              )}
              <Button variant="outline" className="min-h-11 justify-start" asChild>
                <Link to="/shop">
                  <ShoppingBag className="size-4" />
                  <span>{t('points.shop')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="min-h-11 justify-start" asChild>
                <Link to="/points/allocate">
                  <Send className="size-4" />
                  <span>{t('points.allocatePoints')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="min-h-11 justify-start" asChild>
                <Link to="/points/transactions">
                  <ArrowRightLeft className="size-4" />
                  <span>{t('points.transactions')}</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
