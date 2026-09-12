import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { UserRoleValue } from '@repo/shared';

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

describe('Admin user management role change', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockResolvedValue({ success: true, data: [member] });
  });

  it('opens a confirmation modal with user details instead of changing the role immediately', async () => {
    render(<AdminUsersPage />);

    const roleSelect = await screen.findByTestId('role-select-user-1');
    fireEvent.change(roleSelect, { target: { value: UserRoleValue.Reviewer } });

    const details = await screen.findByTestId('role-change-details');
    expect(screen.getByText('Change user role')).toBeInTheDocument();
    expect(details).toHaveTextContent('Alex Rivera');
    expect(details).toHaveTextContent('alex@1billiontech.com');
    expect(details).toHaveTextContent('Current role');
    expect(details).toHaveTextContent(UserRoleValue.User);
    expect(details).toHaveTextContent('New role');
    expect(details).toHaveTextContent(UserRoleValue.Reviewer);
    expect(roleSelect).toHaveValue(UserRoleValue.User);
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/getAllUsers');
  });

  it('does not change the role when the admin cancels', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    const roleSelect = await screen.findByTestId('role-select-user-1');
    fireEvent.change(roleSelect, { target: { value: UserRoleValue.Admin } });

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByTestId('role-change-details')).not.toBeInTheDocument();
    });
    expect(roleSelect).toHaveValue(UserRoleValue.User);
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it('updates the role after the admin confirms', async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce({ success: true, data: [member] })
      .mockResolvedValueOnce({ success: true, data: { ...member, role: UserRoleValue.Reviewer } });

    render(<AdminUsersPage />);

    const roleSelect = await screen.findByTestId('role-select-user-1');
    fireEvent.change(roleSelect, { target: { value: UserRoleValue.Reviewer } });

    await user.click(await screen.findByRole('button', { name: 'Change role' }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/admin/users/user-1/role', {
        method: 'PATCH',
        body: JSON.stringify({ role: UserRoleValue.Reviewer }),
      });
    });
    await waitFor(() => {
      expect(roleSelect).toHaveValue(UserRoleValue.Reviewer);
    });
    expect(screen.queryByTestId('role-change-details')).not.toBeInTheDocument();
  });
});
