import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockUseNotificationContext = jest.fn();
jest.mock('@/components/providers/NotificationProvider', () => ({
  useNotificationContext: () => mockUseNotificationContext(),
}));

// UserAvatar is rendered inside UserAccountMenu (not Navbar directly anymore),
// but we still mock it to avoid its useUser dependency.
jest.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div data-testid="user-avatar-mock">User</div>,
}));

// Mock useUser — required by UserAccountMenu (rendered by Navbar).
const mockUseUser = jest.fn();
jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

// Mock useRouter — required by UserAccountMenu.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock authClient — required by UserAccountMenu.
jest.mock('@/lib/auth/client', () => ({
  authClient: { signOut: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    from: jest.fn(),
    fromTo: jest.fn(),
    utils: {
      toArray: jest.fn(() => []),
    },
    to: jest.fn(),
  },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn((callback) => {
    callback();
  }),
}));

import { Navbar } from '../Navbar';

// ---------------------------------------------------------------------------
// Default user fixture
// ---------------------------------------------------------------------------

const NORMAL_USER = {
  id: 'u1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  avatarUrl: null,
  role: 'User' as const,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Test setup helpers
// ---------------------------------------------------------------------------

function setupNotificationContext(overrides = {}) {
  mockUseNotificationContext.mockReturnValue({
    notifications: [],
    unreadCount: 0,
    loading: false,
    markAsRead: jest.fn(),
    ...overrides,
  });
}

function setupUser(user = NORMAL_USER) {
  mockUseUser.mockReturnValue({
    user,
    loading: false,
    error: null,
    refetch: jest.fn(),
  });
}

// ---------------------------------------------------------------------------
// Existing: Notification Bell tests
// ---------------------------------------------------------------------------

describe('Navbar Notification Bell', () => {
  const mockMarkAsRead = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setupUser();
    setupNotificationContext({ markAsRead: mockMarkAsRead });
  });

  it('renders the bell and unread count', () => {
    render(<Navbar notificationCount={5} />);
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('toggles the notification dropdown on click', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    const bell = screen.getByTestId('notification-bell');

    // Initial state: dropdown is closed
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();

    // Click to open
    await user.click(bell);
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

    // Click to close
    await user.click(bell);
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('closes the notification dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <Navbar notificationCount={0} />
      </div>
    );

    const bell = screen.getByTestId('notification-bell');
    await user.click(bell);
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

    // Click outside
    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('closes the notification dropdown on Escape key', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    const bell = screen.getByTestId('notification-bell');
    await user.click(bell);
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('displays empty state when there are no notifications', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('displays loading state', async () => {
    setupNotificationContext({ loading: true, markAsRead: mockMarkAsRead });

    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders notifications and handles markAsRead', async () => {
    setupNotificationContext({
      notifications: [
        {
          id: 'n1',
          notificationTitle: 'Test Notification 1',
          message: 'Message 1',
          isRead: false,
          createdAt: '2026-07-27T10:00:00Z',
        },
        {
          id: 'n2',
          notificationTitle: 'Test Notification 2',
          message: 'Message 2',
          isRead: true,
          createdAt: '2026-07-26T10:00:00Z',
        },
      ],
      unreadCount: 1,
      markAsRead: mockMarkAsRead.mockResolvedValue(undefined),
    });

    const user = userEvent.setup();
    render(<Navbar notificationCount={1} />);

    await user.click(screen.getByTestId('notification-bell'));

    // Check if both notifications are rendered
    expect(screen.getByText('Test Notification 1')).toBeInTheDocument();
    expect(screen.getByText('Test Notification 2')).toBeInTheDocument();

    // Click the unread notification
    const unreadNotification = screen.getByText('Test Notification 1').closest('button');
    expect(unreadNotification).not.toBeNull();
    await user.click(unreadNotification!);

    expect(mockMarkAsRead).toHaveBeenCalledWith('n1');
    expect(mockMarkAsRead).toHaveBeenCalledTimes(1);

    // The dropdown closes after a click. We must re-open it.
    await user.click(screen.getByTestId('notification-bell'));

    // Click the read notification (should not trigger markAsRead)
    const readNotification = screen.getByText('Test Notification 2').closest('button');
    expect(readNotification).not.toBeNull();
    await user.click(readNotification!);

    expect(mockMarkAsRead).toHaveBeenCalledTimes(1); // Still 1
  });
});

// ---------------------------------------------------------------------------
// Existing: Logo Link tests
// ---------------------------------------------------------------------------

describe('Navbar Logo Link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupUser();
    setupNotificationContext();
  });

  it('renders a logo link pointing to home when sidebar is open', () => {
    render(<Navbar notificationCount={0} isSidebarOpen={true} />);
    const logoLink = screen.getByRole('link', { name: /1bt wiki home/i });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('hides the logo link when sidebar is collapsed', () => {
    render(<Navbar notificationCount={0} isSidebarOpen={false} />);
    expect(screen.queryByRole('link', { name: /1bt wiki home/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Existing: Sidebar Toggle tests
// ---------------------------------------------------------------------------

describe('Navbar Sidebar Toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupUser();
    setupNotificationContext();
  });

  it('renders Collapse sidebar button when expanded', () => {
    render(<Navbar isSidebarOpen={true} onToggleSidebar={jest.fn()} />);
    const button = screen.getByTestId('sidebar-toggle');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Collapse sidebar');
  });

  it('renders Expand sidebar button when collapsed', () => {
    render(<Navbar isSidebarOpen={false} onToggleSidebar={jest.fn()} />);
    const button = screen.getByTestId('sidebar-toggle');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Expand sidebar');
  });
});

// ---------------------------------------------------------------------------
// NEW: Mutual-exclusion integration tests
// ---------------------------------------------------------------------------

describe('Navbar — mutual-exclusion of notification and account dropdowns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupUser();
    setupNotificationContext();
  });

  it('account dropdown is closed initially', () => {
    render(<Navbar notificationCount={0} />);
    expect(screen.queryByTestId('user-account-dropdown')).not.toBeInTheDocument();
  });

  it('notification dropdown is closed initially', () => {
    render(<Navbar notificationCount={0} />);
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('opens the account dropdown when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    await user.click(screen.getByTestId('user-account-trigger'));
    expect(screen.getByTestId('user-account-dropdown')).toBeInTheDocument();
  });

  it('closes the account dropdown when the trigger is clicked again', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    const trigger = screen.getByTestId('user-account-trigger');
    await user.click(trigger); // open
    expect(screen.getByTestId('user-account-dropdown')).toBeInTheDocument();

    await user.click(trigger); // close
    expect(screen.queryByTestId('user-account-dropdown')).not.toBeInTheDocument();
  });

  it('opening the notification dropdown closes the account dropdown', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    // Open account menu first
    await user.click(screen.getByTestId('user-account-trigger'));
    expect(screen.getByTestId('user-account-dropdown')).toBeInTheDocument();

    // Now open notifications — account menu must close
    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.queryByTestId('user-account-dropdown')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('opening the account dropdown closes the notification dropdown', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    // Open notifications first
    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

    // Now open account menu — notification panel must close
    await user.click(screen.getByTestId('user-account-trigger'));
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(screen.getByTestId('user-account-dropdown')).toBeInTheDocument();
  });

  it('only one dropdown is visible at a time', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    // Open notifications
    await user.click(screen.getByTestId('notification-bell'));
    const notificationPanelOpen = screen.queryByRole('dialog', { name: 'Notifications' });
    const accountPanelClosedA = screen.queryByTestId('user-account-dropdown');
    expect(notificationPanelOpen).toBeInTheDocument();
    expect(accountPanelClosedA).not.toBeInTheDocument();

    // Switch to account menu
    await user.click(screen.getByTestId('user-account-trigger'));
    const notificationPanelClosed = screen.queryByRole('dialog', { name: 'Notifications' });
    const accountPanelOpen = screen.queryByTestId('user-account-dropdown');
    expect(notificationPanelClosed).not.toBeInTheDocument();
    expect(accountPanelOpen).toBeInTheDocument();
  });

  it('notification unread badge is visible while account menu is open', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={3} />);

    // Open account menu
    await user.click(screen.getByTestId('user-account-trigger'));
    expect(screen.getByTestId('user-account-dropdown')).toBeInTheDocument();

    // Badge should still be visible
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('notification bell is still clickable while account menu is open', async () => {
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);

    // Open account menu
    await user.click(screen.getByTestId('user-account-trigger'));
    expect(screen.getByTestId('user-account-dropdown')).toBeInTheDocument();

    // Bell should open notifications and close account menu
    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByTestId('user-account-dropdown')).not.toBeInTheDocument();
  });
});
