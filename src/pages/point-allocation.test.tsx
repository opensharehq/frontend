import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('point allocation filters', () => {
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

  function renderPage(limit: number | null | undefined, platforms = ['GitHub', 'Gitee', 'AtomGit']) {
    apiMock.get.mockResolvedValue({
      data: {
        allocation_recipient_limit: limit,
        allocation_platforms: platforms,
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

  async function selectPool() {
    fireEvent.click(await screen.findByRole('combobox'));
    fireEvent.click(await screen.findByRole('option'));
  }

  const previewResponse = {
    data: {
      preview: [{
        actor_id: '123', actor_login: 'contributor', platform: 'GitHub',
        email: '', is_registered: false, contribution_score: 1,
      }],
      total_recipients: 1,
      contribution_to_points_ratio: 100,
    },
  };

  it('defaults to all platforms and requires at least one custom selection', async () => {
    renderPage(300000);
    await selectPool();
    const all = screen.getByRole('checkbox', { name: '全部平台' });
    const preview = screen.getByRole('button', { name: /预览分配/ });
    expect(all).toBeChecked();
    fireEvent.click(preview);
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith(
      '/points/allocations/preview',
      expect.objectContaining({ project_scope: expect.objectContaining({ platforms: null }) }),
    ));
    await waitFor(() => expect(preview).toBeEnabled());
    fireEvent.click(all);
    expect(preview).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('请至少选择一个平台');
    expect(screen.queryByRole('checkbox', { name: 'GitLab' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'GitHub' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gitee' }));
    fireEvent.click(preview);
    await waitFor(() => expect(apiMock.post).toHaveBeenLastCalledWith(
      '/points/allocations/preview',
      expect.objectContaining({ project_scope: expect.objectContaining({ platforms: ['GitHub', 'Gitee'] }) }),
    ));
    fireEvent.click(screen.getByRole('checkbox', { name: 'GitHub' }));
    await waitFor(() => expect(preview).toBeEnabled());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gitee' }));
    expect(preview).toBeDisabled();
    fireEvent.click(all);
    expect(preview).toBeEnabled();
    expect(screen.queryByRole('checkbox', { name: 'GitHub' })).not.toBeInTheDocument();
  });

  it('keeps all-platform preview available when no platforms can be bound', async () => {
    renderPage(300000, []);
    await selectPool();
    fireEvent.click(screen.getByRole('checkbox', { name: '全部平台' }));
    expect(screen.getByRole('alert')).toHaveTextContent('暂无可选平台');
    expect(screen.getByRole('button', { name: /预览分配/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: '全部平台' }));
    expect(screen.getByRole('button', { name: /预览分配/ })).toBeEnabled();
  });

  it('clears previews when platforms change and sends the same scope on execute', async () => {
    renderPage(300000);
    await selectPool();
    apiMock.post.mockResolvedValue(previewResponse);
    fireEvent.click(screen.getByRole('button', { name: /预览分配/ }));
    expect((await screen.findAllByText('contributor')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('checkbox', { name: '全部平台' }));
    expect(screen.queryByText('contributor')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'GitHub' }));
    fireEvent.click(screen.getByRole('button', { name: /预览分配/ }));
    expect((await screen.findAllByText('contributor')).length).toBeGreaterThan(0);
    apiMock.post.mockResolvedValue({ data: { result: { success: 0, pending: 1, failed: 0, total_points: 100 } } });
    fireEvent.click(screen.getByRole('button', { name: '执行分配' }));
    fireEvent.click(screen.getByRole('button', { name: '确认执行' }));
    await waitFor(() => expect(apiMock.post).toHaveBeenLastCalledWith(
      '/points/allocations',
      expect.objectContaining({ project_scope: expect.objectContaining({ platforms: ['GitHub'] }) }),
    ));
  });

  it('ignores an in-flight preview after the platform selection changes', async () => {
    renderPage(300000);
    await selectPool();
    let finishPreview!: (value: typeof previewResponse) => void;
    apiMock.post.mockReturnValue(new Promise((resolve) => { finishPreview = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: /预览分配/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: '全部平台' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gitee' }));
    await act(async () => finishPreview(previewResponse));
    expect(screen.queryByText('contributor')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /预览分配/ })).toBeEnabled();
  });

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
