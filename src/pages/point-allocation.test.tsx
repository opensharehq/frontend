import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import PointAllocationPage from './point-allocation';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/lib/api', () => ({
  default: apiMock,
  getApiError: (error: unknown) => error,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('allocation recipient limits', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    });
    await i18n.changeLanguage('zh');
    apiMock.post.mockResolvedValue({
      data: { preview: [], total_recipients: 0, contribution_to_points_ratio: 100 },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  function renderPage(limit: number | null | undefined) {
    apiMock.get.mockResolvedValue({
      data: {
        allocation_recipient_limit: limit,
        items: [{
          owner_type: 'user',
          owner_name: 'operator',
          owner_slug: '',
          point_type: 'gift',
          tag: null,
          available_balance: 1000,
          source_selector: { owner_type: 'user', point_type: 'gift', tag_slug: null },
        }],
      },
    });
    render(
      <MemoryRouter initialEntries={['/points/allocate?tag_id=repo:test&tag_name=Test']}>
        <PointAllocationPage />
      </MemoryRouter>,
    );
  }

  it.each([300000, undefined])('keeps the ordinary limit hint for %s', async (limit) => {
    renderPage(limit);
    expect(await screen.findByText('最多返回 30 万条记录。')).toBeInTheDocument();
    expect(screen.queryByText(/平台管理员无账号数量上限/)).not.toBeInTheDocument();
  });

  it.each(['', '-1', '300001'])('sends the admin selection %s without capping it', async (value) => {
    renderPage(null);
    expect(await screen.findByText(/平台管理员无账号数量上限/)).toBeInTheDocument();
    expect(screen.queryByText('最多返回 30 万条记录。')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option'));
    fireEvent.change(screen.getByPlaceholderText('留空或填 -1 表示全部'), {
      target: { value },
    });
    fireEvent.click(screen.getByRole('button', { name: /预览分配/ }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith(
      '/points/allocations/preview',
      expect.objectContaining({ top_n: value === '' ? -1 : Number(value) }),
    ));
  });
});
