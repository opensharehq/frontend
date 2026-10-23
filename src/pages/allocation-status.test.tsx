import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import AllocationStatusPage from './allocation-status';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: apiMock, getApiError: (error: unknown) => error }));

describe('allocation prepayment status', () => {
  const queued = { id: 7, status: 'queued', batch_size: 1000, uploaded_recipients: 130320,
    total_recipients: 130320, error: '', result: null, funds_reserved: true, refunded_amount: 0 };

  beforeEach(async () => {
    vi.resetAllMocks();
    await i18n.changeLanguage('zh');
    apiMock.get.mockResolvedValue({ data: queued });
  });

  function renderPage() {
    return render(<MemoryRouter initialEntries={['/points/allocations/7']}>
      <Routes><Route path="/points/allocations/:id" element={<AllocationStatusPage />} /></Routes>
    </MemoryRouter>);
  }

  it('shows prepaid points as unavailable while queued or executing', async () => {
    const page = renderPage();
    expect(await screen.findByText(/本次分配所需积分已扣除，不能再次使用/)).toBeVisible();
    page.unmount();
    apiMock.get.mockResolvedValue({ data: { ...queued, status: 'executing' } });
    renderPage();
    expect(await screen.findByText(/完成时不会再次扣款/)).toBeVisible();
  });

  it('shows a failed task refund and clears it after a prepaid retry', async () => {
    apiMock.get.mockResolvedValue({ data: { ...queued, status: 'failed', funds_reserved: false, refunded_amount: 912369 } });
    renderPage();
    expect(await screen.findByText(/已退回未发放积分：912,369/)).toBeVisible();
    apiMock.get.mockResolvedValue({ data: queued });
    apiMock.post.mockResolvedValue({ data: queued });
    fireEvent.click(screen.getByRole('button', { name: '重新执行本次分配' }));
    expect(await screen.findByText(/本次分配所需积分已扣除/)).toBeVisible();
    expect(screen.queryByText(/已退回未发放积分/)).not.toBeInTheDocument();
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/points/allocation-uploads/7/execute'));
  });

  it('does not claim legacy unreserved tasks have been prepaid', async () => {
    apiMock.get.mockResolvedValue({ data: { ...queued, funds_reserved: false } });
    renderPage();
    expect(await screen.findByText(/此任务尚未预扣积分/)).toBeVisible();
    expect(screen.queryByText(/本次分配所需积分已扣除/)).not.toBeInTheDocument();
  });
});
