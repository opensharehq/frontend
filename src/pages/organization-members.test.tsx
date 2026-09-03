import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrganizationMembersPage from './organization-members';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
const i18nMock = vi.hoisted(() => ({
  t: (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${values.name ?? ''} ${values.id ?? ''}`.trim() : key,
}));

vi.mock('@/lib/api', () => ({
  default: apiMock,
  getApiError: (error: unknown) => error,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => i18nMock,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('OrganizationMembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/member-candidates')) {
        return {
          data: {
            items: [{ id: 42, username: 'searchable_handle', display_name: '' }],
          },
        };
      }
      return {
        data: {
          items: [{
            id: 11,
            user: { id: 1, username: 'owner', email: 'owner@example.com', avatar_url: '' },
            role: 'owner',
            joined_at: '2026-01-01T00:00:00Z',
          }],
        },
      };
    });
    apiMock.post.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches for a candidate and adds the selected user', async () => {
    render(
      <MemoryRouter initialEntries={['/organizations/test-org/members']}>
        <Routes>
          <Route path="/organizations/:slug/members" element={<OrganizationMembersPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'orgMembers.addMember' }));
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole('combobox', { name: 'orgMembers.userSearch' }), {
      target: { value: 'searchable' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const candidate = screen.getByRole('option', { name: /searchable_handle/ });
    expect(apiMock.get).toHaveBeenCalledWith(
      '/organizations/test-org/member-candidates',
      expect.objectContaining({ params: { q: 'searchable' } }),
    );

    fireEvent.click(candidate);
    expect(screen.getByText('orgMembers.selectedUser searchable_handle 42')).toBeInTheDocument();
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'common.submit' }));

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith('/organizations/test-org/members', {
        username: 'searchable_handle',
        role: 'member',
      });
    });
  });
});
