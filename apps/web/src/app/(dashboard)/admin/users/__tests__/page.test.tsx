import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { UserRoleValue, type UserRole } from '@repo/shared';

const mockApiFetch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

import AdminUsersPage from '../page';

const member = {
  id: 'user-1',
  name: 'Alex Rivera',
  email: 'alex@1billiontech.com',
  role: UserRoleValue.User,
  banned: false,
  banReason: null,
  image: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function getConfirmButton(): HTMLElement {
  const btn = document.querySelector('[data-cy="confirm-submit-button"]');
  if (!btn) {
    throw new Error('Confirm button not found');
  }
  return btn as HTMLElement;
}

async function selectRole(
  user: ReturnType<typeof userEvent.setup>,
  userId: string,
  role: UserRole
): Promise<void> {
  await user.click(await screen.findByTestId(`role-select-${userId}`));
  await user.click(await screen.findByTestId(`role-option-${userId}-${role}`));
}

function expectRoleBadge(userId: string, role: UserRole): void {
  expect(screen.getByTestId(`role-select-${userId}`)).toHaveTextContent(role, {
    exact: false,
  });
}

describe('Admin user management role change', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockResolvedValue({ success: true, data: [member] });
  });

  it('opens a confirmation modal with user details instead of changing the role immediately', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await selectRole(user, 'user-1', UserRoleValue.Reviewer);

    const details = await screen.findByTestId('role-change-details');
    expect(screen.getByText('Change user role')).toBeInTheDocument();
    expect(details).toHaveTextContent('Alex Rivera');
    expect(details).toHaveTextContent('alex@1billiontech.com');
    expect(details).toHaveTextContent('Current role');
    expect(details).toHaveTextContent(UserRoleValue.User);
    expect(details).toHaveTextContent('New role');
    expect(details).toHaveTextContent(UserRoleValue.Reviewer);
    expectRoleBadge('user-1', UserRoleValue.User);
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/getAllUsers');
  });

  it('does not change the role when the admin cancels', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await selectRole(user, 'user-1', UserRoleValue.Admin);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByTestId('role-change-details')).not.toBeInTheDocument();
    });
    expectRoleBadge('user-1', UserRoleValue.User);
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it('updates the role after the admin confirms', async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce({ success: true, data: [member] })
      .mockResolvedValueOnce({ success: true, data: { ...member, role: UserRoleValue.Reviewer } });

    render(<AdminUsersPage />);

    await selectRole(user, 'user-1', UserRoleValue.Reviewer);

    fireEvent.click(getConfirmButton());

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/admin/users/user-1/role', {
        method: 'PATCH',
        body: JSON.stringify({ role: UserRoleValue.Reviewer }),
      });
    });
    await waitFor(() => {
      expectRoleBadge('user-1', UserRoleValue.Reviewer);
    });
    expect(screen.queryByTestId('role-change-details')).not.toBeInTheDocument();
  });
});
