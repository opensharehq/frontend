import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadAllocation } from './allocation-upload';

const state = vi.hoisted(() => ({
  batches: 0, recipients: 0, maxBatch: 0, maxBodyBytes: 0,
  status: 'draft', failIndex: -1, queued: 0, seen: new Set<number>(),
}));
vi.mock('@/lib/api', () => ({ default: {
  post: async (url: string, body?: { total_recipients: number }) => {
    if (url.endsWith('/execute')) { state.queued++; return { data: { id: 1, status: 'queued' } }; }
    expect(JSON.stringify(body).length).toBeLessThan(1000);
    return { data: { id: 1, status: state.status, batch_size: 1000 } };
  },
  put: async (url: string, body: { allocations: { actor_id: string; amount: number }[] }) => {
    const index = Number(url.split('/').pop());
    if (index === state.failIndex) throw new Error('network interrupted');
    state.batches++;
    state.maxBatch = Math.max(state.maxBatch, body.allocations.length);
    state.maxBodyBytes = Math.max(state.maxBodyBytes, new TextEncoder().encode(JSON.stringify(body)).length);
    if (!state.seen.has(index)) state.recipients += body.allocations.length;
    state.seen.add(index);
  },
} }));

describe('bounded allocation uploads', () => {
  beforeEach(() => {
    Object.assign(state, { batches: 0, recipients: 0, maxBatch: 0, maxBodyBytes: 0,
      status: 'draft', failIndex: -1, queued: 0, seen: new Set<number>() });
  });
  function getBatch(start: number, end: number) {
    return Array.from({ length: end - start }, (_, i) => ({
      actor_id: String(start + i), actor_login: `developer-${start + i}`, platform: 'GitHub',
      email: '', user_id: null, is_registered: false, contribution_score: 1, amount: 1,
    }));
  }
  it('uploads 3,000,001 recipients in bounded requests including the final partial batch', async () => {
    let progress = 0;
    const result = await uploadAllocation('same-id', { note: '感谢贡献' }, 3_000_001, getBatch, (value) => { progress = value; });
    expect(state.batches).toBe(3001);
    expect(state.recipients).toBe(3_000_001);
    expect(state.maxBatch).toBe(1000);
    expect(state.maxBodyBytes).toBeLessThan(256 * 1024);
    expect(progress).toBe(3_000_001);
    expect(result.status).toBe('queued');
    expect(state.queued).toBe(1);
  }, 20000);
  it('does not execute incomplete uploads and can safely retry the same batch indices', async () => {
    state.failIndex = 1;
    await expect(uploadAllocation('same-id', {}, 2001, getBatch, () => {})).rejects.toThrow('network interrupted');
    expect(state.queued).toBe(0);
    state.failIndex = -1;
    await uploadAllocation('same-id', {}, 2001, getBatch, () => {});
    expect(state.recipients).toBe(2001);
    expect(state.queued).toBe(1);
  });
  it.each(['queued', 'executing', 'completed', 'failed'])('resumes %s without uploading or executing again', async (status) => {
    state.status = status;
    const result = await uploadAllocation('same-id', {}, 3_000_000, getBatch, () => {});
    expect(result.status).toBe(status);
    expect(state.batches).toBe(0);
    expect(state.queued).toBe(0);
  });
});
