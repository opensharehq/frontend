import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Wallet,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/app/components/ui/form';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface WithdrawalAccount {
  id: number;
  account_type: string;
  real_name: string;
  created_at: string;
  // domestic
  id_card?: string;
  phone?: string;
  bank_card?: string;
  // international (legacy, display only)
  currency?: string;
  swift_account?: string;
}

export default function WithdrawalAccountsPage() {
  const { t } = useTranslation();

  const domesticSchema = z.object({
    real_name: z.string().min(1, t('withdrawalAccounts.fieldRequired')),
    id_card: z.string().min(1, t('withdrawalAccounts.fieldRequired')),
    phone: z.string().min(1, t('withdrawalAccounts.fieldRequired')),
    bank_card: z
      .string()
      .min(1, t('withdrawalAccounts.fieldRequired'))
      .regex(/^\d+$/, t('withdrawalAccounts.bankCardDigitsOnly')),
  });

  type DomesticFormValues = z.infer<typeof domesticSchema>;

  const [accounts, setAccounts] = useState<WithdrawalAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WithdrawalAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const domesticForm = useForm<DomesticFormValues>({
    resolver: zodResolver(domesticSchema),
    defaultValues: {
      real_name: '',
      id_card: '',
      phone: '',
      bank_card: '',
    },
  });

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await api.get('/me/withdrawal-accounts');
      setAccounts(data.items ?? []);
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('withdrawalAccounts.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function openCreateDialog() {
    domesticForm.reset({
      real_name: '',
      id_card: '',
      phone: '',
      bank_card: '',
    });
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
  }

  async function submitDomestic(values: DomesticFormValues) {
    setIsSubmitting(true);
    try {
      await api.post('/me/withdrawal-accounts', {
        account_type: 'domestic',
        ...values,
      });
      toast.success(t('withdrawalAccounts.addSuccess'));
      setDialogOpen(false);
      await fetchAccounts();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      if (apiError.code === 'not_signed') {
        toast.error(t('withdrawalAccounts.notSignedError'));
      } else {
        toast.error(apiError.message || t('common.operationFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(account: WithdrawalAccount) {
    try {
      await api.delete(`/me/withdrawal-accounts/${account.id}`);
      toast.success(t('withdrawalAccounts.deleteSuccess'));
      setDeleteTarget(null);
      await fetchAccounts();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('withdrawalAccounts.deleteFailed'));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-primary" />
            <h1 className="text-2xl font-bold">{t('withdrawalAccounts.title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('withdrawalAccounts.subtitle')}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          {t('withdrawalAccounts.addAccount')}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="mx-auto size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('withdrawalAccounts.noAccounts')}</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              <Plus className="size-4" />
              {t('withdrawalAccounts.addAccount')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{account.real_name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {account.account_type === 'domestic'
                        ? t('withdrawalAccounts.typeDomestic')
                        : t('withdrawalAccounts.typeInternational')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground mb-3">
                  {account.account_type === 'domestic' ? (
                    <>
                      <div>
                        <span className="text-foreground/70 mr-2">
                          {t('withdrawalAccounts.idCard')}:
                        </span>
                        {account.id_card}
                      </div>
                      <div>
                        <span className="text-foreground/70 mr-2">
                          {t('withdrawalAccounts.phone')}:
                        </span>
                        {account.phone}
                      </div>
                      <div>
                        <span className="text-foreground/70 mr-2">
                          {t('withdrawalAccounts.bankCard')}:
                        </span>
                        {account.bank_card}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-foreground/70 mr-2">
                          {t('withdrawalAccounts.currency')}:
                        </span>
                        {account.currency}
                      </div>
                      <div>
                        <span className="text-foreground/70 mr-2">
                          {t('withdrawalAccounts.swiftAccount')}:
                        </span>
                        {account.swift_account}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(account)}
                  >
                    <Trash2 className="size-3.5" />
                    {t('withdrawalAccounts.deleteAccount')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 添加国内提现账号 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('withdrawalAccounts.addAccount')}</DialogTitle>
          </DialogHeader>

          <Form {...domesticForm}>
            <form
              onSubmit={domesticForm.handleSubmit(submitDomestic)}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                {t('withdrawalAccounts.domesticNotice')}
              </p>
              <div className="flex justify-center">
                <img
                  src="/withdraw-qrcode.png"
                  alt="withdraw qrcode"
                  className="size-40 rounded-md border"
                />
              </div>
              <FormField
                control={domesticForm.control}
                name="real_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('withdrawalAccounts.realName')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={domesticForm.control}
                name="id_card"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('withdrawalAccounts.idCard')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={domesticForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('withdrawalAccounts.phone')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={domesticForm.control}
                name="bank_card"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('withdrawalAccounts.bankCard')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>
                  {t('withdrawalAccounts.infoConsistencyWarning')}
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {t('withdrawalAccounts.submit')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('withdrawalAccounts.deleteAccount')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('withdrawalAccounts.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {t('withdrawalAccounts.deleteAccount')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
