import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserRoleValue } from '@repo/shared';
import { RoleUserGuide } from '@/components/profile/RoleUserGuide';

describe('RoleUserGuide', () => {
  it('lists admin actions in plain text', () => {
    render(<RoleUserGuide role={UserRoleValue.Admin} />);

    expect(screen.getByTestId('user-guide')).toHaveTextContent(
      'What you can do in 1BT Wiki as an Admin.'
    );
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You cannot change the last active admin’s role until you promote someone else.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(
      screen.queryByText('You cannot publish articles.')
    ).not.toBeInTheDocument();
  });

  it('lists reviewer actions in plain text', () => {
    render(<RoleUserGuide role={UserRoleValue.Reviewer} />);

    expect(screen.getByTestId('user-guide')).toHaveTextContent(
      'What you can do in 1BT Wiki as a Reviewer.'
    );
    expect(screen.getByText('Approvals')).toBeInTheDocument();
    expect(
      screen.getByText('Approve sends the article to an Admin to publish.')
    ).toBeInTheDocument();
    expect(screen.getByText('What you cannot do')).toBeInTheDocument();
    expect(screen.queryByText('User Management lists all accounts.')).not.toBeInTheDocument();
  });

  it('shows an empty message for a regular User', () => {
    render(<RoleUserGuide role={UserRoleValue.User} />);
    expect(screen.getByTestId('user-guide-empty')).toBeInTheDocument();
  });
});
