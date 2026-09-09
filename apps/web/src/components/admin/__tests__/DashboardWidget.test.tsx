import { render, screen } from '@testing-library/react';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { UsersIcon } from '@/components/shared/icons/UsersIcon';

describe('DashboardWidget', () => {
  it('renders the label, description, value, and navigates to the target page', () => {
    render(
      <DashboardWidget
        label="Registered users"
        description="People with access to the wiki"
        value={42}
        href="/admin/users"
        icon={<UsersIcon className="h-4 w-4" />}
        testId="widget-total-users"
      />
    );

    const widget = screen.getByTestId('widget-total-users');
    expect(widget).toHaveAttribute('href', '/admin/users');
    expect(widget).toHaveTextContent('Registered users');
    expect(widget).toHaveTextContent('42');
    expect(widget).toHaveTextContent('People with access to the wiki');
  });

  it('shows a review badge when highlight is true', () => {
    render(
      <DashboardWidget
        label="Pending reviews"
        description="Articles waiting for a reviewer"
        value={3}
        href="/reviewer/approvals"
        icon={<UsersIcon className="h-4 w-4" />}
        highlight
        testId="widget-pending-reviews"
      />
    );

    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });
});
