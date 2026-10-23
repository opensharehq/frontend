import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import TransactionsPage from './transactions';
import OrganizationTransactionsPage from './organization-transactions';

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: apiMock, getApiError: (error: unknown) => error }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe.each([
  { name: 'personal', path: '/transactions', endpoint: '/points/me/transactions', page: <TransactionsPage /> },
  { name: 'organization', path: '/organizations/demo/transactions', endpoint: '/points/organizations/demo/transactions', page: <OrganizationTransactionsPage /> },
])('$name transaction history', ({ path, endpoint, page }) => {
  const items = Array.from({ length: 22 }, (_, index) => ({
    id: 200 - index,
    transaction_type: index === 1 ? 'earn' : 'spend',
    point_type: 'gift',
    amount: index === 0 ? -912369 : index === 1 ? 308 : -1,
    description: index === 0 ? '本次分配扣款' : index === 1 ? '本次收到积分' : `其他交易 ${index}`,
    reference_id: index < 2 ? 'allocation_7' : '',
    merged_count: index === 0 ? 116 : 1,
    balance_after: 88062,
    created_at: '2026-10-23T04:41:26Z',
    tag: null,
    created_by: null,
  }));

  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('zh');
    apiMock.get.mockImplementation(async (_url, { params }) => {
      const filtered = params.transaction_type ? items.filter(item => item.transaction_type === params.transaction_type) : items;
      const start = (params.page - 1) * 20;
      return { data: {
        items: filtered.slice(start, start + 20),
        pagination: { page: params.page, page_size: 20, total_items: filtered.length, total_pages: Math.ceil(filtered.length / 20) },
        organization: { slug: 'demo', name: 'Demo' },
      } };
    });
  });

  function renderPage() {
    render(<MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/transactions" element={page} />
      <Route path="/organizations/:slug/transactions" element={page} />
    </Routes></MemoryRouter>);
  }

  it('shows the full grouped debit and paginates by displayed records', async () => {
    renderPage();
    expect(await screen.findByText('合并 116 笔明细')).toBeVisible();
    expect(screen.getByText('共 22 条记录')).toBeVisible();
    expect(screen.getByText('-912,369')).toBeVisible();
    expect(screen.getByText('本次收到积分')).toBeVisible();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(21);
    expect(apiMock.get).toHaveBeenCalledWith(endpoint, {
      params: { page: 1, page_size: 20, group_allocations: 1 },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    expect(await screen.findByText('其他交易 21')).toBeVisible();
    expect(screen.queryByText('本次分配扣款')).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    expect(apiMock.get).toHaveBeenLastCalledWith(endpoint, {
      params: { page: 2, page_size: 20, group_allocations: 1 },
    });
  });

  it('resets pagination when filtering the grouped history', async () => {
    renderPage();
    await screen.findByText('合并 116 笔明细');
    fireEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
    await screen.findByText('其他交易 21');
    fireEvent.click(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByRole('option', { name: '获得' }));
    await waitFor(() => expect(apiMock.get).toHaveBeenLastCalledWith(endpoint, {
      params: { page: 1, page_size: 20, group_allocations: 1, transaction_type: 'earn' },
    }));
    expect(await screen.findByText('共 1 条记录')).toBeVisible();
    expect(screen.queryByText('合并 116 笔明细')).not.toBeInTheDocument();
  });
});
