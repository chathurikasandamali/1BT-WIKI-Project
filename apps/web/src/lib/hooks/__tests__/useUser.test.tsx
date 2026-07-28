import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockApiFetch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { UserProvider, useUser, type UserMeData } from '@/lib/hooks/useUser';

const mockUser: UserMeData = {
  id: 'u1',
  name: 'Test User',
  email: 'test@1billiontech.com',
  avatarUrl: null,
  role: 'Admin',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function Consumer() {
  const { user, loading, error, refetch } = useUser();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user-role">{user?.role ?? 'none'}</span>
      <span data-testid="error">{error?.message ?? 'none'}</span>
      <button onClick={() => refetch()}>refetch</button>
    </div>
  );
}

describe('useUser / UserProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches /users/me on mount and exposes the resolved user and role', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: mockUser });

    render(
      <UserProvider>
        <Consumer />
      </UserProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    );

    expect(mockApiFetch).toHaveBeenCalledWith('/users/me');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Admin');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('leaves user as null (guest fallback) when the API responds with success: false', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: false,
      error: 'Unauthorized',
    });

    render(
      <UserProvider>
        <Consumer />
      </UserProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    );
    expect(screen.getByTestId('user-role')).toHaveTextContent('none');
  });

  it('leaves user as null and records the error when apiFetch rejects', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('network down'));

    render(
      <UserProvider>
        <Consumer />
      </UserProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    );
    expect(screen.getByTestId('user-role')).toHaveTextContent('none');
    expect(screen.getByTestId('error')).toHaveTextContent('network down');
  });

  it('refetch() re-fetches and updates the user', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: mockUser });
    const user = userEvent.setup();

    render(
      <UserProvider>
        <Consumer />
      </UserProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    );
    expect(mockApiFetch).toHaveBeenCalledTimes(1);

    mockApiFetch.mockResolvedValueOnce({
      success: true,
      data: { ...mockUser, role: 'Reviewer' },
    });
    await user.click(screen.getByRole('button', { name: 'refetch' }));

    await waitFor(() =>
      expect(screen.getByTestId('user-role')).toHaveTextContent('Reviewer')
    );
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('throws when useUser() is called outside a UserProvider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow(
      'useUser() must be used within a <UserProvider>'
    );

    consoleError.mockRestore();
  });
});
