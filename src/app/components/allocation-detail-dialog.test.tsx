import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import AllocationDetailDialog from './allocation-detail-dialog';

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: apiMock, getApiError: (error: unknown) => error }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('allocation detail pagination', () => {
  const onOpenChange = vi.fn();
  const registered = Array.from({ length: 11 }, (_, index) => ({
    actor_id: String(index), actor_login: `registered-${index}`, is_registered: true, amount: 1,
  }));
  const pending = Array.from({ length: 11 }, (_, index) => ({
    id: index, actor_login: `pending-${index}`, email: '', amount: 1, is_claimed: false,
  }));
  const detail = {
    id: 42, status: 'completed', total_amount: 22, total_recipients: 22,
    registered_recipients: 11, unregistered_recipients: 11,
    start_month: '2026-08-01', end_month: '2026-09-01', adjustment_ratio: 1,
    executed_at: null, contribution_data: registered, pending_grants: pending,
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    await i18n.changeLanguage('zh');
  });

  it.each([false, undefined])('pages both complete lists locally when paginated is %s', async (paginated) => {
    apiMock.get.mockResolvedValue({ data: { ...detail, paginated } });
    render(<AllocationDetailDialog allocationId={42} open onOpenChange={onOpenChange} />);
    expect(await screen.findByText('registered-0')).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    expect(screen.getByText('registered-10')).toBeVisible();
    expect(screen.queryByText('registered-0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Go to previous page' }));
    expect(screen.getByText('registered-0')).toBeVisible();

    await userEvent.click(screen.getByRole('tab', { name: '待领取 (11)' }));
    expect(screen.getByText('pending-0')).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    expect(screen.getByText('pending-10')).toBeVisible();
    expect(screen.queryByText('pending-0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Go to previous page' }));
    expect(screen.getByText('pending-0')).toBeVisible();
    expect(apiMock.get).toHaveBeenCalledTimes(1);
  });

  it('fetches server pages on demand and keeps the other tab page unchanged', async () => {
    apiMock.get.mockImplementation(async (_url, { params }) => ({ data: {
      ...detail, paginated: true, page_size: 10, registered_count: 11, pending_count: 11,
      contribution_data: registered.slice((params.registered_page - 1) * 10, params.registered_page * 10),
      pending_grants: pending.slice((params.pending_page - 1) * 10, params.pending_page * 10),
    } }));
    const view = render(<AllocationDetailDialog allocationId={42} open onOpenChange={onOpenChange} />);
    expect(await screen.findByText('registered-0')).toBeVisible();
    expect(apiMock.get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    expect(await screen.findByText('registered-10')).toBeVisible();
    expect(apiMock.get).toHaveBeenLastCalledWith('/points/allocations/42', {
      params: { registered_page: 2, pending_page: 1 },
    });

    await userEvent.click(screen.getByRole('tab', { name: '待领取 (11)' }));
    expect(apiMock.get).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    expect(await screen.findByText('pending-10')).toBeVisible();
    expect(apiMock.get).toHaveBeenLastCalledWith('/points/allocations/42', {
      params: { registered_page: 2, pending_page: 2 },
    });
    expect(screen.getByRole('tab', { name: '待领取 (11)' })).toHaveAttribute('data-state', 'active');

    view.rerender(<AllocationDetailDialog allocationId={42} open={false} onOpenChange={onOpenChange} />);
    view.rerender(<AllocationDetailDialog allocationId={42} open onOpenChange={onOpenChange} />);
    expect(await screen.findByText('pending-0')).toBeVisible();
    expect(apiMock.get).toHaveBeenCalledTimes(4);
    expect(apiMock.get).toHaveBeenLastCalledWith('/points/allocations/42', {
      params: { registered_page: 1, pending_page: 1 },
    });
  });

  it('resets cached local pages when opening a different allocation', async () => {
    apiMock.get.mockImplementation(async (url: string) => ({
      data: { ...detail, id: Number(url.split('/').pop()), paginated: false },
    }));
    const view = render(<AllocationDetailDialog allocationId={42} open onOpenChange={onOpenChange} />);
    expect(await screen.findByText('registered-0')).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    await waitFor(() => expect(screen.getByText('registered-10')).toBeVisible());
    view.rerender(<AllocationDetailDialog allocationId={43} open onOpenChange={onOpenChange} />);
    expect(await screen.findByText('registered-0')).toBeVisible();
    expect(within(screen.getByRole('dialog')).getByText('分配详情 #43')).toBeVisible();
    expect(apiMock.get).toHaveBeenCalledTimes(2);
    expect(apiMock.get).toHaveBeenLastCalledWith('/points/allocations/43', {
      params: { registered_page: 1, pending_page: 1 },
    });
  });
});
