import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockFetchLikers = jest.fn();

jest.mock('@/lib/api/likes', () => ({
  fetchLikers: (...args: unknown[]) => mockFetchLikers(...args),
}));

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => ({ user: null }),
}));

import { LikedByAvatars } from '@/components/article-detail/LikedByAvatars';

const likers = [
  { id: 'like-1', articleId: 'a1', userId: 'u1', userName: 'Alice', userImage: null, createdAt: '2026-01-01' },
  { id: 'like-2', articleId: 'a1', userId: 'u2', userName: 'Bob', userImage: 'https://img.com/bob.png', createdAt: '2026-01-02' },
  { id: 'like-3', articleId: 'a1', userId: 'u3', userName: 'Carol', userImage: null, createdAt: '2026-01-03' },
  { id: 'like-4', articleId: 'a1', userId: 'u4', userName: 'Dave', userImage: null, createdAt: '2026-01-04' },
];

describe('LikedByAvatars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when likeCount is 0', () => {
    const { container } = render(<LikedByAvatars articleId="a1" likeCount={0} />);
    expect(mockFetchLikers).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('fetches and shows an avatar stack with a +N bubble beyond the first 3', async () => {
    mockFetchLikers.mockResolvedValueOnce(likers);

    render(<LikedByAvatars articleId="a1" likeCount={4} />);

    expect(mockFetchLikers).toHaveBeenCalledWith('a1');
    await waitFor(() =>
      expect(screen.getAllByTestId('liked-by-avatar')).toHaveLength(3)
    );
    expect(screen.getByTestId('liked-by-extra-count')).toHaveTextContent('+1');
  });

  it('does not show a +N bubble when there are 3 or fewer likers', async () => {
    mockFetchLikers.mockResolvedValueOnce(likers.slice(0, 2));

    render(<LikedByAvatars articleId="a1" likeCount={2} />);

    await waitFor(() =>
      expect(screen.getAllByTestId('liked-by-avatar')).toHaveLength(2)
    );
    expect(screen.queryByTestId('liked-by-extra-count')).not.toBeInTheDocument();
  });

  it('opens a popover listing every liker by name on click', async () => {
    mockFetchLikers.mockResolvedValue(likers);
    const user = userEvent.setup();

    render(<LikedByAvatars articleId="a1" likeCount={4} />);
    await waitFor(() => expect(mockFetchLikers).toHaveBeenCalledTimes(1));

    await user.click(screen.getByTestId('liked-by-trigger'));

    expect(await screen.findByTestId('liked-by-popover')).toBeInTheDocument();
    expect(screen.getAllByTestId('liked-by-row')).toHaveLength(4);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Dave')).toBeInTheDocument();
    expect(mockFetchLikers).toHaveBeenCalledTimes(2);
  });

  it('closes the popover when clicking outside', async () => {
    mockFetchLikers.mockResolvedValue(likers);
    const user = userEvent.setup();

    render(
      <div>
        <LikedByAvatars articleId="a1" likeCount={4} />
        <div data-testid="outside">outside</div>
      </div>
    );
    await waitFor(() => expect(mockFetchLikers).toHaveBeenCalledTimes(1));

    await user.click(screen.getByTestId('liked-by-trigger'));
    expect(await screen.findByTestId('liked-by-popover')).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));
    await waitFor(() =>
      expect(screen.queryByTestId('liked-by-popover')).not.toBeInTheDocument()
    );
  });
});
