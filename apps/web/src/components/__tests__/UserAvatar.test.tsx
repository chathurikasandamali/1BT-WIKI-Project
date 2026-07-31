import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserAvatar } from '../UserAvatar';
import { useUser } from '@/lib/hooks/useUser';

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: jest.fn(),
}));

const mockUseUser = useUser as jest.Mock;

describe('UserAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders explicit name and avatarUrl props when provided', () => {
    mockUseUser.mockReturnValue({ user: null });
    const avatarUrl = 'https://example.com/author.jpg';

    render(<UserAvatar name="Jane Doe" avatarUrl={avatarUrl} format="detail" />);

    const img = screen.getByRole('img', { name: 'Jane Doe' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', avatarUrl);
    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer');
  });

  it('falls back to useUser logged-in user when props are omitted', () => {
    mockUseUser.mockReturnValue({
      user: { name: 'Logged In User', avatarUrl: 'https://example.com/user.jpg' },
    });

    render(<UserAvatar format="collapsed" />);

    const img = screen.getByRole('img', { name: 'Logged In User' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/user.jpg');
    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer');
  });

  it('renders initial letter fallback when onError triggers on img', () => {
    mockUseUser.mockReturnValue({ user: null });
    const brokenUrl = 'https://example.com/broken.jpg';

    render(<UserAvatar name="Malindu Nayakkara" avatarUrl={brokenUrl} format="detail" />);

    const img = screen.getByRole('img', { name: 'Malindu Nayakkara' });
    expect(img).toBeInTheDocument();

    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('MN')).toBeInTheDocument();
  });

  it('renders initials circle when no avatarUrl is provided', () => {
    mockUseUser.mockReturnValue({ user: null });

    render(<UserAvatar name="John Doe" avatarUrl={null} format="detail" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
