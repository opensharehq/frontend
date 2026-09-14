import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Plus, Loader2, Wallet, Banknote, HelpCircle } from "lucide-react";
import api, { getApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { toast } from "sonner";

interface Withdrawal {
  id: number;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  real_name: string;
  bank_name: string;
  bank_account: string;
  created_at: string;
  processed_at: string | null;
  admin_note: string | null;
}

interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface WithdrawalsResponse {
  items: Withdrawal[];
  pagination: PaginationMeta;
}

interface WithdrawalAccount {
  id: number;
  account_type: "domestic" | "international";
  real_name: string;
  created_at: string;
  id_card?: string;
  phone?: string;
  bank_card?: string;
  currency?: string;
  swift_account?: string;
}

interface WalletResponse {
  balance: {
    total: number;
    cash: number;
    gift: number;
    gift_no_tag: number;
    by_tag: Record<string, number>;
  };
  wallet_id: number | null;
  recent_transactions: unknown[];
}

function statusBadge(status: Withdrawal["status"], t: (key: string) => string) {
  const config: Record<
    Withdrawal["status"],
    { labelKey: string; className: string }
  > = {
    pending: {
      labelKey: "withdrawals.statusPending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    approved: {
      labelKey: "withdrawals.statusApproved",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    rejected: {
      labelKey: "withdrawals.statusRejected",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    completed: {
      labelKey: "withdrawals.statusCompleted",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    cancelled: {
      labelKey: "withdrawals.statusCancelled",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={c.className}>
      {t(c.labelKey)}
    </Badge>
  );
}

export default function WithdrawalsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "en" ? enUS : zhCN;

  // Wallet balance
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Withdrawal records
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accounts, setAccounts] = useState<WithdrawalAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [amountError, setAmountError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch wallet balance
  useEffect(() => {
    async function fetchBalance() {
      try {
        const { data } = await api.get<WalletResponse>("/points/me/wallet");
        setCashBalance(data.balance.cash);
      } catch {
        // silently fail, balance will show 0
      } finally {
        setBalanceLoading(false);
      }
    }
    fetchBalance();
  }, []);

  // Fetch withdrawal records
  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<WithdrawalsResponse>("/points/me/withdrawals", {
        params: { page, page_size: pageSize },
      });
      setWithdrawals(data.items ?? []);
      setTotal(data.pagination?.total_items ?? 0);
    } catch (err) {
      const apiErr = getApiError(err);
      toast.error(t('withdrawals.loadFailed'), { description: apiErr.message });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, t]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  // Open dialog and fetch accounts
  async function openApplyDialog() {
    setDialogOpen(true);
    setSelectedAccountId("");
    setWithdrawAmount("");
    setAmountError("");
    setAccountsLoading(true);
    try {
      const { data } = await api.get('/me/withdrawal-accounts');
      setAccounts(data.items ?? []);
    } catch (err) {
      const apiErr = getApiError(err);
      toast.error(apiErr.message);
    } finally {
      setAccountsLoading(false);
    }
  }

  // Validate amount
  function validateAmount(value: string): boolean {
    const num = Number(value);
    if (!value || isNaN(num) || num < 200) {
      setAmountError(t('withdrawals.minAmountError'));
      return false;
    }
    if (num > cashBalance) {
      setAmountError(t('withdrawals.insufficientBalance'));
      return false;
    }
    setAmountError("");
    return true;
  }

  // Submit withdrawal request
  async function handleSubmit() {
    if (!selectedAccountId) {
      toast.error(t('withdrawals.selectAccount'));
      return;
    }
    if (!validateAmount(withdrawAmount)) return;

    setIsSubmitting(true);
    try {
      await api.post('/points/me/withdrawals', {
        withdrawal_account_id: Number(selectedAccountId),
        amount: Number(withdrawAmount),
      });
      toast.success(t('withdrawals.submitSuccess'));
      setDialogOpen(false);
      // Refresh balance and records
      const { data } = await api.get<WalletResponse>("/points/me/wallet");
      setCashBalance(data.balance.cash);
      fetchWithdrawals();
    } catch (err) {
      const apiErr = getApiError(err);
      const description = apiErr.code
        ? t(`errors.${apiErr.code}`, { defaultValue: apiErr.message })
        : apiErr.message;
      toast.error(t('withdrawals.submitFailed'), { description });
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 + 余额 + 操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('withdrawals.title')}</h1>
          <p className="text-muted-foreground">{t('withdrawals.subtitle')}</p>
        </div>

        <Button onClick={openApplyDialog}>
          <Plus className="size-4 mr-2" />
          {t('withdrawals.applyWithdrawal')}
        </Button>
      </div>

      {/* 现金积分余额卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30">
              <Banknote className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">{t('withdrawals.currentCashPoints')}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t('withdrawals.cashPointsTooltip')}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <HelpCircle className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm text-pretty">
                    {t('withdrawals.cashPointsTooltip')}
                  </TooltipContent>
                </Tooltip>
              </div>
              {balanceLoading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground mt-1" />
              ) : (
                <p className="text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                  {cashBalance.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 提现记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('withdrawals.records', { total })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : withdrawals.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t('withdrawals.noRecords')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('withdrawals.tableAmount')}</TableHead>
                  <TableHead>{t('withdrawals.tableStatus')}</TableHead>
                  <TableHead>{t('withdrawals.tableBankInfo')}</TableHead>
                  <TableHead>{t('withdrawals.tableTime')}</TableHead>
                  <TableHead>{t('withdrawals.tableRemark')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">
                      {w.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{statusBadge(w.status, t)}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {w.real_name}{w.bank_account ? ` · ${w.bank_account}` : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-sm text-muted-foreground"
                        title={format(new Date(w.created_at), "yyyy-MM-dd HH:mm:ss")}
                      >
                        {formatDistanceToNow(new Date(w.created_at), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {w.admin_note ? (
                        <span
                          className={
                            w.status === "rejected"
                              ? "text-sm text-red-600"
                              : "text-sm text-muted-foreground"
                          }
                        >
                          {w.admin_note}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                {t('transactions.page', { current: page, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t('transactions.prevPage')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('transactions.nextPage')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 申请提现 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('withdrawals.applyWithdrawal')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: 现金积分余额 */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <Wallet className="size-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">{t('withdrawals.currentCashPoints')}</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={t('withdrawals.cashPointsTooltip')}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <HelpCircle className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm text-pretty">
                      {t('withdrawals.cashPointsTooltip')}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                  {cashBalance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Step 2: 选择提现账号 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('withdrawals.selectAccount')}</Label>
              {accountsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('withdrawals.noAccountTip')}
                  </p>
                </div>
              ) : (
                <RadioGroup
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                  className="gap-2"
                >
                  {accounts.map((account) => (
                    <label
                      key={account.id}
                      htmlFor={`account-${account.id}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAccountId === String(account.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem
                        value={String(account.id)}
                        id={`account-${account.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{account.real_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {account.account_type === "domestic" ? t('withdrawalAccounts.typeDomestic') : t('withdrawalAccounts.typeInternational')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {account.account_type === "domestic"
                            ? account.bank_card
                            : account.swift_account}
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </div>

            {/* Step 3: 填写提现金额 */}
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount" className="text-sm font-medium">
                {t('withdrawals.withdrawAmount')}
              </Label>
              <Input
                id="withdraw-amount"
                type="number"
                inputMode="numeric"
                min={200}
                max={cashBalance}
                placeholder={t('withdrawals.withdrawAmountPlaceholder')}
                value={withdrawAmount}
                aria-invalid={!!amountError}
                aria-describedby={
                  amountError ? "withdraw-amount-help withdraw-amount-error" : "withdraw-amount-help"
                }
                onChange={(e) => {
                  setWithdrawAmount(e.target.value);
                  if (amountError) setAmountError("");
                }}
                onBlur={() => {
                  if (withdrawAmount) validateAmount(withdrawAmount);
                }}
              />
              <p id="withdraw-amount-help" className="text-xs text-muted-foreground">
                {t('withdrawals.minAmountTip')}
              </p>
              {(() => {
                const num = Number(withdrawAmount);
                if (!withdrawAmount || isNaN(num) || num <= 0) return null;
                const cny = (num / 10).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const selectedAccount = accounts.find(
                  (a) => String(a.id) === selectedAccountId,
                );
                const isInternational =
                  selectedAccount?.account_type === "international";
                return (
                  <div className="space-y-1">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      {t('withdrawals.estimatedCash', { amount: cny })}
                    </p>
                    {isInternational && (
                      <p className="text-xs text-muted-foreground">
                        {t('withdrawals.internationalRateNote')}
                      </p>
                    )}
                  </div>
                );
              })()}
              {amountError && (
                <p id="withdraw-amount-error" className="text-xs text-destructive" aria-live="polite">
                  {amountError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedAccountId || !withdrawAmount}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {t('withdrawals.submitApply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
