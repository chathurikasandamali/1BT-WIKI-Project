import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before the component import
// ---------------------------------------------------------------------------

// Mock useUser so we can control the user object in each test.
const mockUseUser = jest.fn();
jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

// Mock useRouter — handleNavigation calls router.push.
const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// Mock UserAvatar — not under test here.
jest.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div data-testid="user-avatar-mock">Avatar</div>,
}));

// Mock authClient — we assert that signOut is called.
const mockSignOut = jest.fn();
jest.mock('@/lib/auth/client', () => ({
  authClient: {
    signOut: () => mockSignOut(),
  },
}));

import { UserAccountMenu } from '../UserAccountMenu';
import { UserMeData } from '@/lib/hooks/useUser';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const NORMAL_USER: UserMeData = {
  id: 'u1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  avatarUrl: null,
  role: 'User',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
};

const ADMIN_USER: UserMeData = {
  ...NORMAL_USER,
  role: 'Admin',
};

/** Render with the menu CLOSED. */
function renderClosed(user = NORMAL_USER) {
  mockUseUser.mockReturnValue({ user, loading: false, error: null, refetch: jest.fn() });
  const onToggle = jest.fn();
  const onClose = jest.fn();
  render(
    <UserAccountMenu isOpen={false} onToggle={onToggle} onClose={onClose} />
  );
  return { onToggle, onClose };
}

/** Render with the menu OPEN. */
function renderOpen(user = NORMAL_USER) {
  mockUseUser.mockReturnValue({ user, loading: false, error: null, refetch: jest.fn() });
  const onToggle = jest.fn();
  const onClose = jest.fn();
  render(
    <UserAccountMenu isOpen={true} onToggle={onToggle} onClose={onClose} />
  );
  return { onToggle, onClose };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserAccountMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // jest-location-mock (from jest.setup.ts) already provides window.location.assign
    // as a jest mock — no need to redefine it here.
  });

  // ── 1. Menu closed initially ─────────────────────────────────────────────

  it('does not render the dropdown panel when isOpen is false', () => {
    renderClosed();
    expect(screen.queryByTestId('user-account-dropdown')).not.toBeInTheDocument();
  });

  it('renders the trigger button when isOpen is false', () => {
    renderClosed();
    expect(screen.getByTestId('user-account-trigger')).toBeInTheDocument();
  });

  // ── 2. Click trigger → opens (calls onToggle) ───────────────────────────

  it('calls onToggle when the trigger is clicked while closed', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderClosed();

    await user.click(screen.getByTestId('user-account-trigger'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  // ── 3. Click trigger again → closes (calls onToggle) ────────────────────

  it('calls onToggle when the trigger is clicked while open', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderOpen();

    await user.click(screen.getByTestId('user-account-trigger'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  // ── 4. Click outside → closes (calls onClose) ───────────────────────────

  it('calls onClose when clicking outside the menu', async () => {
    const user = userEvent.setup();
    const { onClose } = renderOpen();

    // Render a sibling element that is outside the component
    // We need to click *outside* after the menu is open.
    // Append an external element and click it.
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);

    await user.click(outside);
    expect(onClose).toHaveBeenCalledTimes(1);

    document.body.removeChild(outside);
  });

  // ── 5. Escape → closes (calls onClose) and returns focus to trigger ─────

  it('calls onClose and returns focus to trigger on Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderOpen();

    const trigger = screen.getByTestId('user-account-trigger');
    // Focus the trigger so we can verify focus is returned
    trigger.focus();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);
  });

  // ── 6. Normal-user menu items are displayed ─────────────────────────────

  it('shows My Articles, Settings, and Sign Out for a normal user', () => {
    renderOpen(NORMAL_USER);
    expect(screen.getByTestId('menu-item-my-articles')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-settings')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-sign-out')).toBeInTheDocument();
  });

  // ── 7. Admin-only item is displayed for an admin ────────────────────────

  it('shows the Admin Dashboard item for an admin user', () => {
    renderOpen(ADMIN_USER);
    expect(screen.getByTestId('menu-item-admin')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-admin')).toHaveTextContent('Admin Dashboard');
  });

  // ── 8. Admin-only item is hidden from a normal user ─────────────────────

  it('does not show the Admin Dashboard item for a normal user', () => {
    renderOpen(NORMAL_USER);
    expect(screen.queryByTestId('menu-item-admin')).not.toBeInTheDocument();
  });

  // ── 9. Clicking a navigation item calls router.push with the correct route

  it('navigates to /my-articles when My Articles is clicked', async () => {
    const user = userEvent.setup();
    renderOpen(NORMAL_USER);

    await user.click(screen.getByTestId('menu-item-my-articles'));
    expect(mockRouterPush).toHaveBeenCalledWith('/my-articles');
  });

  it('navigates to /settings when Settings is clicked', async () => {
    const user = userEvent.setup();
    renderOpen(NORMAL_USER);

    await user.click(screen.getByTestId('menu-item-settings'));
    expect(mockRouterPush).toHaveBeenCalledWith('/settings');
  });

  it('navigates to /admin when Admin Dashboard is clicked', async () => {
    const user = userEvent.setup();
    renderOpen(ADMIN_USER);

    await user.click(screen.getByTestId('menu-item-admin'));
    expect(mockRouterPush).toHaveBeenCalledWith('/admin');
  });

  // ── 10. Sign Out calls authClient.signOut ────────────────────────────────

  it('calls authClient.signOut when Sign Out is clicked', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderOpen(NORMAL_USER);

    await user.click(screen.getByTestId('menu-item-sign-out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  // ── 11. Menu closes after item selection (onClose called) ────────────────

  it('calls onClose after clicking a navigation item', async () => {
    const user = userEvent.setup();
    const { onClose } = renderOpen(NORMAL_USER);

    await user.click(screen.getByTestId('menu-item-my-articles'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose immediately when Sign Out is clicked', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onClose } = renderOpen(NORMAL_USER);

    await user.click(screen.getByTestId('menu-item-sign-out'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── 12. Aria attributes are correct ─────────────────────────────────────

  it('sets aria-expanded="false" on the trigger when closed', () => {
    renderClosed();
    expect(screen.getByTestId('user-account-trigger')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('sets aria-expanded="true" on the trigger when open', () => {
    renderOpen();
    expect(screen.getByTestId('user-account-trigger')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('sets aria-controls="user-account-menu" on the trigger', () => {
    renderClosed();
    expect(screen.getByTestId('user-account-trigger')).toHaveAttribute(
      'aria-controls',
      'user-account-menu'
    );
  });

  it('renders the panel with the correct id when open', () => {
    renderOpen();
    expect(screen.getByTestId('user-account-dropdown')).toHaveAttribute(
      'id',
      'user-account-menu'
    );
  });

  // ── Display of user info header ──────────────────────────────────────────

  it('displays the user name and email in the header', () => {
    renderOpen(NORMAL_USER);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });
});
