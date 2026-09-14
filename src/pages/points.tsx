import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  ShoppingBag,
  ClipboardList,
  Send,
  Loader2,
} from "lucide-react";
import api, { getApiError } from "@/lib/api";
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
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{t('points.title')}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70 text-pretty">{t('points.subtitle')}</p>
      </div>

      <PointsBalanceCard balance={balance} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('points.operations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11 flex-1 justify-center sm:min-w-[10rem]" asChild>
              <Link to="/shop">
                <ShoppingBag className="size-4" />
                <span>{t('points.shop')}</span>
              </Link>
            </Button>
            <Button variant="outline" className="min-h-11 flex-1 justify-center sm:min-w-[10rem]" asChild>
              <Link to="/redemptions">
                <ClipboardList className="size-4" />
                <span>{t('redemptions.title')}</span>
              </Link>
            </Button>
            <Button variant="outline" className="min-h-11 flex-1 justify-center sm:min-w-[10rem]" asChild>
              <Link to="/points/allocate">
                <Send className="size-4" />
                <span>{t('points.allocatePoints')}</span>
              </Link>
            </Button>
            <Button variant="outline" className="min-h-11 flex-1 justify-center sm:min-w-[10rem]" asChild>
              <Link to="/points/transactions">
                <ArrowRightLeft className="size-4" />
                <span>{t('points.transactions')}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
