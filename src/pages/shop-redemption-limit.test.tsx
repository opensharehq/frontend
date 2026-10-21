import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import i18n from '@/i18n';
import ShopPage from './shop';
import ShopItemPage from './shop-item';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/lib/api', () => ({
  default: apiMock,
  getApiError: (error: unknown) => error,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const balance = { total: 1000, gift: 1000, gift_no_tag: 1000, cash: 0, by_tag: {} };
const baseItem = {
  id: 1,
  name_zh: '限兑商品',
  name_en: 'Limited item',
  brief_zh: '',
  brief_en: '',
  description_zh: '商品详情',
  description_en: 'Item details',
  cost: 100,
  original_cost: 100,
  discount_tier: null,
  discount_tier_year: null,
  discount_multiplier: 1,
  stock: 5,
  is_active: true,
  image_card_url: null,
  image_detail_url: null,
  requires_shipping: false,
  allowed_tags: [],
  shipping_addresses: [],
  max_redemptions_per_user: 2,
  user_redemption_count: 2,
  redemption_limit_reached: true,
};

function mockItem(overrides: Partial<typeof baseItem> = {}) {
  const item = { ...baseItem, ...overrides };
  apiMock.get.mockImplementation(async (url: string) => {
    if (url === '/shop/items') return { data: { items: [item], balance } };
    if (url === '/points/me/wallet') return { data: { balance } };
    return { data: item };
  });
  return item;
}

function renderPage(path = '/shop/1') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/:id" element={<ShopItemPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('shop per-user redemption limits', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await i18n.changeLanguage('zh');
    mockItem();
  });

  it('shows the personal limit on cards while keeping stock separate', async () => {
    renderPage('/shop');
    expect(await screen.findByText('已达兑换上限')).toBeInTheDocument();
    expect(screen.getByText('每人限兑 2 次 · 已兑换 2 次')).toBeInTheDocument();
    expect(screen.queryByText('立即兑换')).not.toBeInTheDocument();
    expect(screen.queryByText('已售罄')).not.toBeInTheDocument();
  });

  it.each([5, 0])('blocks the detail page at the limit with stock %i', async (stock) => {
    mockItem({ stock });
    renderPage();
    expect(await screen.findByText('已达兑换上限')).toBeInTheDocument();
    expect(screen.getByText('每人限兑 2 次')).toBeInTheDocument();
    expect(screen.getByText('已兑换 2 次')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认兑换' })).not.toBeInTheDocument();
    expect(screen.queryByText('该商品已售罄，暂时无法兑换')).not.toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it.each([
    { max_redemptions_per_user: 2, user_redemption_count: 1 },
    { max_redemptions_per_user: 0, user_redemption_count: 10 },
  ])('permits redemption below the limit or with no limit: %o', async (limits) => {
    mockItem({ ...limits, redemption_limit_reached: false });
    renderPage();
    expect(await screen.findByRole('button', { name: '确认兑换' })).toBeEnabled();
    expect(screen.queryByText('已达兑换上限')).not.toBeInTheDocument();
    if (limits.max_redemptions_per_user === 0) {
      expect(screen.queryByText(/每人限兑/)).not.toBeInTheDocument();
    }
  });

  it('shows the English limit message', async () => {
    await i18n.changeLanguage('en');
    renderPage();
    expect(await screen.findByText('Redemption limit reached')).toBeInTheDocument();
    expect(screen.getByText('Limit: 2 per user')).toBeInTheDocument();
  });

  it.each([true, false])('handles a stale page when refreshing succeeds: %s', async (refreshSucceeds) => {
    mockItem({ user_redemption_count: 1, redemption_limit_reached: false });
    apiMock.post.mockRejectedValue({ code: 'redemption_limit_reached' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '确认兑换' }));
    if (refreshSucceeds) {
      mockItem();
    } else {
      apiMock.get.mockRejectedValue(new Error('offline'));
    }
    fireEvent.click(await screen.findByRole('button', { name: '确认' }));
    expect(await screen.findByText('已达兑换上限')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认兑换' })).not.toBeInTheDocument();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      '您已达到该商品的个人兑换次数上限，无法继续兑换',
    ));
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    if (refreshSucceeds) expect(screen.getByText('已兑换 2 次')).toBeInTheDocument();
  });
});
