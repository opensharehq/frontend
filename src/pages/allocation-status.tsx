import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { getApiError } from '@/lib/api';
import type { AllocationUploadStatus } from '@/lib/allocation-upload';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import AllocationDetailDialog from '@/app/components/allocation-detail-dialog';

export default function AllocationStatusPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [status, setStatus] = useState<AllocationUploadStatus | null>(null);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get<AllocationUploadStatus>(`/points/allocation-uploads/${id}`);
      setStatus(data);
      setError('');
    } catch (err) { setError(getApiError(err).message); }
  }, [id]);
  useEffect(() => {
    void fetchStatus();
    if (status?.status === 'completed' || status?.status === 'failed') return;
    const timer = setInterval(() => { void fetchStatus(); }, 3000);
    return () => clearInterval(timer);
  }, [fetchStatus, status?.status]);
  async function retry() {
    setRetrying(true);
    try {
      const { data } = await api.post<AllocationUploadStatus>(`/points/allocation-uploads/${id}/execute`);
      setStatus(data);
      setError('');
    } catch (err) { setError(getApiError(err).message); }
    finally { setRetrying(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-6">
    <h1 className="text-2xl font-bold">{t('pointAllocation.batchTitle', { id })}</h1>
    <Card>
      <CardHeader><CardTitle>{status ? t(`allocationDetail.status.${status.status}`) : t('common.loading')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {status && <p>{t('pointAllocation.uploadProgress', { uploaded: status.uploaded_recipients.toLocaleString(), total: status.total_recipients.toLocaleString() })}</p>}
        {(status?.status === 'queued' || status?.status === 'executing') && <>
          <p>{t(`pointAllocation.${status.funds_reserved ? status.status : 'unfunded'}Hint`)}</p>
          <p className="text-muted-foreground">{t('pointAllocation.backgroundHint')}</p>
        </>}
        {error && <p role="alert">{error}</p>}
        {status?.error && <p role="alert">{status.error}</p>}
        {status?.result && <p>{t('pointAllocation.executeSuccessDesc', { success: status.result.success, pending: status.result.pending, failed: status.result.failed, totalPoints: status.result.total_points })}</p>}
        {!!status?.refunded_amount && <p>{t('pointAllocation.refundHint', { amount: status.refunded_amount.toLocaleString() })}</p>}
        {status?.status === 'failed' && <Button onClick={retry} disabled={retrying}>{t('pointAllocation.retryExecution')}</Button>}
        {status?.status === 'completed' && <Button onClick={() => setDetailOpen(true)}>{t('transactions.viewAllocation')}</Button>}
      </CardContent>
    </Card>
    <AllocationDetailDialog allocationId={Number(id)} open={detailOpen} onOpenChange={setDetailOpen} />
  </div>;
}
