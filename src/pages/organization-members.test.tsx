import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrganizationMembersPage from './organization-members';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
const i18nMock = vi.hoisted(() => ({ t: (key: string) => key }));

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
            items: [{ id: 42, username: 'searchable_handle', display_name: 'Ming Zhao' }],
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

  it('searches for a candidate and adds the selected user', async () => {
    render(
      <MemoryRouter initialEntries={['/organizations/test-org/members']}>
        <Routes>
          <Route path="/organizations/:slug/members" element={<OrganizationMembersPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'orgMembers.addMember' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'orgMembers.userSearch' }), {
      target: { value: 'Ming' },
    });

    const candidate = await screen.findByRole('option', { name: /Ming Zhao/ });
    expect(apiMock.get).toHaveBeenCalledWith(
      '/organizations/test-org/member-candidates',
      expect.objectContaining({ params: { q: 'Ming' } }),
    );

    fireEvent.click(candidate);
    fireEvent.click(screen.getByRole('button', { name: 'common.submit' }));

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith('/organizations/test-org/members', {
        username: 'searchable_handle',
        role: 'member',
      });
    });
  });
});
