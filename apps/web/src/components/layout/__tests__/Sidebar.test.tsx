import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSignOut = jest.fn();
const mockUseUser = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), from: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

jest.mock('@/lib/auth/client', () => ({
  authClient: {
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
}));

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

import { Sidebar } from '@/components/layout/Sidebar';

describe('Sidebar sign-out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: { id: 'u1', name: 'Test User', email: 'test@1billiontech.com', role: 'User', avatarUrl: null, isActive: true, createdAt: '' },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    window.location.assign('http://localhost/');
  });

  it('calls authClient.signOut() and redirects to /signin on success', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<Sidebar />);
    await user.click(screen.getByTestId('logout-btn'));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(window.location.href).toBe('http://localhost/signin')
    );
  });

  it('does not redirect when authClient.signOut() rejects', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('network error'));
    const user = userEvent.setup();

    render(<Sidebar />);
    await user.click(screen.getByTestId('logout-btn'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(window.location.href).toBe('http://localhost/');
  });
});

describe('Sidebar navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: { id: 'u1', name: 'Test User', email: 'test@1billiontech.com', role: 'User', avatarUrl: null, isActive: true, createdAt: '' },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders a My Articles link pointing to /my-articles', () => {
    render(<Sidebar />);

    const link = screen.getByTestId('nav-my-articles');
    expect(link).toHaveAttribute('href', '/my-articles');
    expect(link).toHaveTextContent('My Articles');
  });

  it('does NOT render the Approvals link for a plain User role', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u1', name: 'Plain User', role: 'User' },
      loading: false,
    });

    render(<Sidebar />);
    expect(screen.queryByTestId('nav-reviewer-approvals')).not.toBeInTheDocument();
  });

  it('renders the Approvals link for Reviewer role', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u2', name: 'Reviewer User', role: 'Reviewer' },
      loading: false,
    });

    render(<Sidebar />);
    const link = screen.getByTestId('nav-reviewer-approvals');
    expect(link).toHaveAttribute('href', '/reviewer/approvals');
    expect(link).toHaveTextContent('Approvals');
  });

  it('renders the Approvals link for Admin role', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u3', name: 'Admin User', role: 'Admin' },
      loading: false,
    });

    render(<Sidebar />);
    const link = screen.getByTestId('nav-reviewer-approvals');
    expect(link).toHaveAttribute('href', '/reviewer/approvals');
    expect(link).toHaveTextContent('Approvals');
  });
});
