import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUseNotificationContext = jest.fn();
jest.mock('@/components/providers/NotificationProvider', () => ({
  useNotificationContext: () => mockUseNotificationContext(),
}));

jest.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div data-testid="user-avatar-mock">User</div>,
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
    // Optionally trigger immediately or do nothing to prevent animation errors
    callback();
  }),
}));

import { Navbar } from '../Navbar';

describe('Navbar Notification Bell', () => {
  const mockMarkAsRead = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationContext.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      markAsRead: mockMarkAsRead,
    });
  });

  it('renders the bell and unread count', () => {
    render(<Navbar notificationCount={5} />);
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('toggles the dropdown on click', async () => {
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

  it('closes the dropdown when clicking outside', async () => {
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

  it('closes the dropdown on Escape key', async () => {
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
    mockUseNotificationContext.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: true,
      markAsRead: mockMarkAsRead,
    });
    
    const user = userEvent.setup();
    render(<Navbar notificationCount={0} />);
    
    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders notifications and handles markAsRead', async () => {
    mockUseNotificationContext.mockReturnValue({
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
        }
      ],
      unreadCount: 1,
      loading: false,
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

describe('Navbar Logo Link', () => {
  it('renders a logo link pointing to home', () => {
    render(<Navbar notificationCount={0} />);
    const logoLink = screen.getByRole('link', { name: /1bt wiki home/i });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', '/');
  });
});

