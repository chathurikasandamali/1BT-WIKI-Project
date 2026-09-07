import { render, screen } from '@testing-library/react';
import { DashboardSection } from '@/components/admin/DashboardSection';

describe('DashboardSection', () => {
  it('renders the title and a Show more link to the dedicated page', () => {
    render(
      <DashboardSection
        title="Users"
        description="Most recently registered accounts"
        showMoreHref="/admin/users"
        testId="dashboard-users-section"
      >
        <p>Preview</p>
      </DashboardSection>
    );

    expect(screen.getByText('Users')).toBeInTheDocument();
    const showMore = screen.getByTestId('dashboard-users-section-show-more');
    expect(showMore).toHaveAttribute('href', '/admin/users');
    expect(showMore).toHaveTextContent('Show more');
  });
});
