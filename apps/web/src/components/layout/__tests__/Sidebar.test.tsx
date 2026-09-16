import { render, screen } from '@testing-library/react';

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

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

import { Sidebar } from '@/components/layout/Sidebar';

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

  it('renders a My Profile link pointing to /settings', () => {
    render(<Sidebar />);

    const link = screen.getByTestId('nav-settings');
    expect(link).toHaveAttribute('href', '/settings');
    expect(link).toHaveTextContent('My Profile');
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

  it('renders the Approvals link for Admin role pointing at the publish queue', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u3', name: 'Admin User', role: 'Admin' },
      loading: false,
    });

    render(<Sidebar />);
    const link = screen.getByTestId('nav-admin-approvals');
    expect(link).toHaveAttribute('href', '/admin/approvals');
    expect(link).toHaveTextContent('Approvals');
    expect(screen.queryByTestId('nav-reviewer-approvals')).not.toBeInTheDocument();
  });

  it('does NOT render the Tech Talk Management link for a plain User role', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u1', name: 'Plain User', role: 'User' },
      loading: false,
    });

    render(<Sidebar />);
    expect(screen.queryByTestId('nav-admin-tech-talks')).not.toBeInTheDocument();
  });

  it('does NOT render the Tech Talk Management link for a Reviewer role', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u2', name: 'Reviewer User', role: 'Reviewer' },
      loading: false,
    });

    render(<Sidebar />);
    expect(screen.queryByTestId('nav-admin-tech-talks')).not.toBeInTheDocument();
  });

  it('renders the Tech Talk Management link for Admin role', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u3', name: 'Admin User', role: 'Admin' },
      loading: false,
    });

    render(<Sidebar />);
    const link = screen.getByTestId('nav-admin-tech-talks');
    expect(link).toHaveAttribute('href', '/admin/tech-talks');
    expect(link).toHaveTextContent('Tech Talk Management');
  });
});

describe('Sidebar collapsed state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: { id: 'u3', name: 'Admin User', role: 'Admin' },
      loading: false,
    });
  });

  it('renders the full logo when expanded', () => {
    render(<Sidebar isOpen={true} />);
    const logo = screen.getByTestId('sidebar-logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('href', '/');
    expect(logo).toHaveTextContent('1BT');
    expect(logo).toHaveTextContent('WIKI');
    expect(screen.queryByTestId('compact-logo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('logout-btn')).not.toBeInTheDocument();
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });

  it('renders compact logo when collapsed', () => {
    render(<Sidebar isOpen={false} />);
    const logo = screen.getByTestId('compact-logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('href', '/');
    expect(logo).toHaveTextContent('1BT');
    expect(logo).not.toHaveTextContent('WIKI');
    expect(screen.queryByTestId('sidebar-logo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('logout-btn')).not.toBeInTheDocument();
  });

  it('hides text labels and shows tooltips when collapsed', () => {
    render(<Sidebar isOpen={false} />);
    const articlesLink = screen.getByTestId('nav-articles');
    
    // The text 'Articles' should not be visibly rendered in the DOM except inside the tooltip.
    // Tooltips are visible on hover, but present in DOM
    const tooltip = screen.getByText('Articles');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveClass('opacity-0'); // visually hidden initially
    
    // The link should have aria-label for accessibility
    expect(articlesLink).toHaveAttribute('aria-label', 'Articles');
  });

  it('preserves the sidebar component when collapsed', () => {
    render(<Sidebar isOpen={false} />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveClass('w-[78px]');
  });

  it('shows Admin icon but hides Admin heading when collapsed', () => {
    render(<Sidebar isOpen={false} />);
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    const adminLink = screen.getByTestId('nav-admin-users');
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('aria-label', 'User Management');
  });
});
