import { render, screen } from '@testing-library/react';

const mockUseUser = jest.fn();

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('@/components/profile/MyArticlesList', () => ({
  MyArticlesList: () => <div data-testid="my-articles-list-stub" />,
}));

import MyArticlesPage from '@/app/(dashboard)/my-articles/page';

describe('MyArticlesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state while the user is loading', () => {
    mockUseUser.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<MyArticlesPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(
      screen.queryByTestId('my-articles-list-stub')
    ).not.toBeInTheDocument();
  });

  it('prompts sign-in when there is no user', () => {
    mockUseUser.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<MyArticlesPage />);

    expect(
      screen.getByText('Please sign in to view your articles.')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('my-articles-list-stub')
    ).not.toBeInTheDocument();
  });

  it('renders the article list for a signed-in user', () => {
    mockUseUser.mockReturnValue({
      user: {
        id: 'u1',
        name: 'Test User',
        email: 'test@1billiontech.com',
        role: 'User',
        avatarUrl: null,
        isActive: true,
        createdAt: '',
      },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<MyArticlesPage />);

    expect(
      screen.getByRole('heading', { name: 'My Articles' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('my-articles-list-stub')).toBeInTheDocument();
  });
});
