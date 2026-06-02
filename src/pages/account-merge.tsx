import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Loader2, GitMerge, Send, Inbox, Clock, CheckCircle2, XCircle } from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { resolveApiErrorMessage } from '@/lib/auth-errors';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/app/components/ui/form';

interface SentMergeRequest {
  id: number;
  target_username: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface ReceivedMergeRequest {
  id: number;
  source_username: string;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
  asset_snapshot: Record<string, unknown>;
}

interface MergeData {
  sent: SentMergeRequest[];
  incoming: ReceivedMergeRequest[];
}

export default function AccountMergePage() {
  const { t } = useTranslation();

  const mergeSchema = z.object({
    target: z.string().min(1, t('accountMerge.enterTarget')),
  });

  type MergeFormValues = z.infer<typeof mergeSchema>;

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="size-3 mr-1" />{t('accountMerge.pending')}</Badge>;
      case 'accepted':
        return <Badge variant="default"><CheckCircle2 className="size-3 mr-1" />{t('accountMerge.accepted')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="size-3 mr-1" />{t('accountMerge.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const [mergeData, setMergeData] = useState<MergeData>({ sent: [], incoming: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptTarget, setAcceptTarget] = useState<ReceivedMergeRequest | null>(null);
  const [rejectingToken, setRejectingToken] = useState<string | null>(null);

  const form = useForm<MergeFormValues>({
    resolver: zodResolver(mergeSchema),
    defaultValues: { target: '' },
  });

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/me/account-merges');
      setMergeData({ sent: data.sent ?? [], incoming: data.incoming ?? [] });
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(resolveApiErrorMessage(t, apiError, t('accountMerge.loadFailed')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onSubmit(values: MergeFormValues) {
    setIsSubmitting(true);
    try {
      const isEmail = values.target.includes('@');
      const payload = isEmail
        ? { target_email: values.target }
        : { target_username: values.target };
      await api.post('/me/account-merges', payload);
      toast.success(t('accountMerge.requestSent'));
      setDialogOpen(false);
      form.reset();
      await fetchData();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(resolveApiErrorMessage(t, apiError, t('accountMerge.sendFailed')));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAccept(token: string) {
    try {
      await api.post(`/me/account-merges/review/${token}/accept`);
      toast.success(t('accountMerge.acceptSuccess'));
      setAcceptTarget(null);
      await fetchData();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(resolveApiErrorMessage(t, apiError, t('accountMerge.acceptFailed')));
    }
  }

  async function handleReject(token: string) {
    setRejectingToken(token);
    try {
      await api.post(`/me/account-merges/review/${token}/reject`);
      toast.success(t('accountMerge.rejectSuccess'));
      await fetchData();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(resolveApiErrorMessage(t, apiError, t('accountMerge.rejectFailed')));
    } finally {
      setRejectingToken(null);
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
        <div className="flex items-center gap-2">
          <GitMerge className="size-5 text-primary" />
          <h1 className="text-2xl font-bold">{t('accountMerge.title')}</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Send className="size-4" />
          {t('accountMerge.initMerge')}
        </Button>
      </div>

      <Tabs defaultValue="sent">
        <TabsList className="w-full">
          <TabsTrigger value="sent" className="flex-1">
            <Send className="size-3.5 mr-1" />
            {t('accountMerge.sent', { count: mergeData.sent?.length ?? 0 })}
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex-1">
            <Inbox className="size-3.5 mr-1" />
            {t('accountMerge.incoming', { count: mergeData.incoming?.length ?? 0 })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-4">
          {(mergeData.sent?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t('accountMerge.noSent')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {mergeData.sent.map((req) => (
                <Card key={req.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {t('accountMerge.targetUser', { username: req.target_username })}
                      </CardTitle>
                      {getStatusBadge(req.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{t('accountMerge.sentAt', { time: new Date(req.created_at).toLocaleString() })}</p>
                      <p>{t('accountMerge.expiresAt', { time: new Date(req.expires_at).toLocaleString() })}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-4">
          {(mergeData.incoming?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t('accountMerge.noIncoming')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {mergeData.incoming.map((req) => (
                <Card key={req.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {t('accountMerge.fromUser', { username: req.source_username })}
                      </CardTitle>
                      {getStatusBadge(req.status)}
                    </div>
                    <CardDescription>
                      {t('accountMerge.sentAt', { time: new Date(req.created_at).toLocaleString() })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {req.asset_snapshot && Object.keys(req.asset_snapshot).length > 0 && (
                      <div className="mb-3 rounded-md bg-muted p-3">
                        <p className="text-xs font-medium mb-1">{t('accountMerge.assetSnapshot')}</p>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {Object.entries(req.asset_snapshot).map(([key, value]) => (
                            <p key={key}>{key}：{String(value)}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setAcceptTarget(req)}
                        >
                          <CheckCircle2 className="size-3.5" />
                        {t('accountMerge.accept')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={rejectingToken === req.token}
                          onClick={() => handleReject(req.token)}
                        >
                          {rejectingToken === req.token ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <XCircle className="size-3.5" />
                          )}
                          {t('accountMerge.reject')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 发起合并 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('accountMerge.initMergeTitle')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('accountMerge.targetUserLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('accountMerge.targetUserPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t('accountMerge.mergeHint')}
              </p>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {t('accountMerge.sendRequest')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 接受合并确认 */}
      <AlertDialog open={!!acceptTarget} onOpenChange={(open) => !open && setAcceptTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accountMerge.confirmAcceptTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('accountMerge.confirmAcceptDesc', { username: acceptTarget?.source_username })}
              <span className="block mt-2 font-medium text-destructive">
                {t('accountMerge.confirmAcceptWarning')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => acceptTarget && handleAccept(acceptTarget.token)}
            >
              {t('accountMerge.confirmAccept')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
