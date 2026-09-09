import { render, screen } from '@testing-library/react';
import { PageLoader } from '@/components/shared/PageLoader';

describe('PageLoader', () => {
  it('renders the branded loading animation with a status role', () => {
    render(<PageLoader />);

    const loader = screen.getByTestId('page-loader');
    expect(loader).toHaveAttribute('role', 'status');
    expect(loader).toHaveTextContent('WIKI');
    expect(loader).toHaveTextContent('Loading');
  });

  it('accepts a custom message and test id', () => {
    render(<PageLoader message="Loading dashboard" testId="custom-loader" />);

    expect(screen.getByTestId('custom-loader')).toHaveTextContent(
      'Loading dashboard'
    );
  });
});
