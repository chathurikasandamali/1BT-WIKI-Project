import { render, screen } from '@testing-library/react';

const mockUseUser = jest.fn();

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

import { RoleGuard } from '@/components/auth/RoleGuard';

describe('RoleGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loading state while user data is loading', () => {
    mockUseUser.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <RoleGuard allowedRoles={['Admin']}>
        <div>Protected content</div>
      </RoleGuard>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders the default no-permission message when there is no user', () => {
    mockUseUser.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <RoleGuard allowedRoles={['Admin']}>
        <div>Protected content</div>
      </RoleGuard>
    );

    expect(
      screen.getByText(/you don't have permission to view this page/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId('roleguard-home-link')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders a custom fallback when the user role is not allowed', () => {
    mockUseUser.mockReturnValue({
      user: {
        id: 'u1',
        name: 'Test',
        email: 'test@1billiontech.com',
        role: 'User',
        avatarUrl: null,
        isActive: true,
        createdAt: '',
      },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <RoleGuard allowedRoles={['Admin']} fallback={<div>Custom fallback</div>}>
        <div>Protected content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when the user role is in the allowed list (role assignment respected)', () => {
    mockUseUser.mockReturnValue({
      user: {
        id: 'u1',
        name: 'Admin User',
        email: 'admin@1billiontech.com',
        role: 'Admin',
        avatarUrl: null,
        isActive: true,
        createdAt: '',
      },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <RoleGuard allowedRoles={['Admin']}>
        <div>Protected content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(
      screen.queryByText(/you don't have permission/i)
    ).not.toBeInTheDocument();
  });
});
