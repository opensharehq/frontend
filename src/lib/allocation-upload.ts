import api from '@/lib/api';

export const ALLOCATION_BATCH_SIZE = 1000;

export interface AllocationUploadStatus {
  id: number;
  status: 'draft' | 'queued' | 'executing' | 'completed' | 'failed';
  batch_size: number;
  uploaded_recipients: number;
  total_recipients: number;
  error: string;
  funds_reserved?: boolean;
  refunded_amount?: number;
  result: { success: number; pending: number; failed: number; total_points: number } | null;
}

export async function uploadAllocation<T>(
  submissionId: string,
  config: object,
  count: number,
  getBatch: (start: number, end: number) => T[],
  onProgress: (uploaded: number) => void,
): Promise<AllocationUploadStatus> {
  const { data: upload } = await api.post<AllocationUploadStatus>('/points/allocation-uploads', {
    ...config, submission_id: submissionId, total_recipients: count,
  });
  if (upload.status !== 'draft') return upload;
  const size = Math.min(upload.batch_size, ALLOCATION_BATCH_SIZE);
  if (!Number.isInteger(size) || size < 1) throw new Error('Invalid allocation batch size');
  for (let start = 0; start < count; start += size) {
    const end = Math.min(start + size, count);
    await api.put(`/points/allocation-uploads/${upload.id}/batches/${start / size}`, {
      allocations: getBatch(start, end),
    });
    onProgress(end);
  }
  const { data } = await api.post<AllocationUploadStatus>(`/points/allocation-uploads/${upload.id}/execute`);
  return data;
}
