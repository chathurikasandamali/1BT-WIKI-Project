import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRoleValue } from '@repo/shared';

const mockUseUser = jest.fn();

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('@/lib/api/client', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    from: jest.fn(),
    to: jest.fn(),
    fromTo: jest.fn(),
  },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

import ProfileSettingsPage from '../page';

const staffUser = {
  id: 'u-1',
  name: 'Casey Admin',
  email: 'casey@1billiontech.com',
  avatarUrl: null,
  role: UserRoleValue.Admin,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('Profile settings user guide tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the User Guide tab for an Admin and opens the guide', async () => {
    mockUseUser.mockReturnValue({
      user: staffUser,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    const user = userEvent.setup();
    render(<ProfileSettingsPage />);

    expect(screen.getByTestId('tab-user-guide')).toBeInTheDocument();
    expect(screen.queryByTestId('user-guide')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('tab-user-guide'));

    expect(screen.getByTestId('user-guide')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'User Guide' })).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows the User Guide tab for a Reviewer', () => {
    mockUseUser.mockReturnValue({
      user: { ...staffUser, role: UserRoleValue.Reviewer, name: 'Riley Reviewer' },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProfileSettingsPage />);

    expect(screen.getByTestId('tab-user-guide')).toBeInTheDocument();
  });

  it('hides the User Guide tab for a regular User', () => {
    mockUseUser.mockReturnValue({
      user: { ...staffUser, role: UserRoleValue.User, name: 'Pat User' },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProfileSettingsPage />);

    expect(screen.queryByTestId('tab-user-guide')).not.toBeInTheDocument();
    expect(screen.getByTestId('tab-profile')).toBeInTheDocument();
  });
});
