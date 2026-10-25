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

  it('searches all accounts locally across both tabs and resets pages', async () => {
    apiMock.get.mockResolvedValue({ data: detail });
    const view = render(<AllocationDetailDialog allocationId={42} open onOpenChange={onOpenChange} />);
    expect(await screen.findByText('registered-0')).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'RED-10' } });
    expect(screen.getByText('registered-10')).toBeVisible();
    expect(screen.getByText('匹配 1 / 共 11 个账号')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Go to next page' })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: '-10' } });
    await userEvent.click(screen.getByRole('tab', { name: '待领取 (1)' }));
    expect(screen.getByText('pending-10')).toBeVisible();
    fireEvent.change(search, { target: { value: 'missing' } });
    expect(screen.getByText('没有匹配的账号')).toBeVisible();
    expect(screen.getByText('匹配 0 / 共 11 个账号')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '清除账号搜索' }));
    expect(screen.getByText('pending-0')).toBeVisible();
    expect(apiMock.get).toHaveBeenCalledTimes(1);

    fireEvent.change(search, { target: { value: 'missing' } });
    view.rerender(<AllocationDetailDialog allocationId={42} open={false} onOpenChange={onOpenChange} />);
    view.rerender(<AllocationDetailDialog allocationId={42} open onOpenChange={onOpenChange} />);
    expect(await screen.findByText('pending-0')).toBeVisible();
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(apiMock.get).toHaveBeenCalledTimes(2);
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
    expect(apiMock.get).toHaveBeenLastCalledWith('/points/allocations/43');
  });
});
