import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Footer } from './footer';

vi.mock('@/app/contexts/language-context', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Footer', () => {
  it('shows the ICP record and MIIT link on the China frontend', () => {
    vi.stubEnv('VITE_FRONTEND_SITE', 'cn');

    render(<Footer />);

    expect(screen.getByRole('link', { name: '浙ICP备2026079381号' })).toHaveAttribute(
      'href',
      'https://beian.miit.gov.cn/',
    );
  });

  it('does not show the ICP record on the global frontend', () => {
    vi.stubEnv('VITE_FRONTEND_SITE', 'global');

    render(<Footer />);

    expect(screen.queryByText('浙ICP备2026079381号')).not.toBeInTheDocument();
  });
});
