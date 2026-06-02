import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { cn } from './utils';

describe('Button', () => {
  it('renders children and forwards the button type', () => {
    render(<Button type="submit">Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'submit');
  });
});

describe('cn', () => {
  it('merges conditional and conflicting Tailwind classes', () => {
    const optionalClass: string | undefined = undefined;

    expect(cn('px-2', optionalClass, 'px-4')).toBe('px-4');
  });
});
