import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockLikeArticle = jest.fn();
const mockUnlikeArticle = jest.fn();

jest.mock('@/lib/api/likes', () => ({
  likeArticle: (...args: unknown[]) => mockLikeArticle(...args),
  unlikeArticle: (...args: unknown[]) => mockUnlikeArticle(...args),
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

import { LikeButton } from '@/components/article-detail/LikeButton';

describe('LikeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the initial not-liked state', () => {
    render(<LikeButton articleId="a1" initialLikeCount={42} initialLikedByMe={false} />);

    const button = screen.getByTestId('like-button');
    expect(button).toHaveTextContent('42');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('aria-label', 'Like article');
  });

  it('renders the initial liked state', () => {
    render(<LikeButton articleId="a1" initialLikeCount={43} initialLikedByMe={true} />);

    const button = screen.getByTestId('like-button');
    expect(button).toHaveTextContent('43');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('aria-label', 'Unlike article');
  });

  it('likes the article and increments the count', async () => {
    mockLikeArticle.mockResolvedValueOnce({ liked: true });
    const user = userEvent.setup();

    render(<LikeButton articleId="a1" initialLikeCount={42} initialLikedByMe={false} />);
    await user.click(screen.getByTestId('like-button'));

    expect(mockLikeArticle).toHaveBeenCalledWith('a1');
    await waitFor(() => expect(screen.getByTestId('like-button')).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByTestId('like-button')).toHaveTextContent('43');
  });

  it('unlikes the article and decrements the count', async () => {
    mockUnlikeArticle.mockResolvedValueOnce({ liked: false });
    const user = userEvent.setup();

    render(<LikeButton articleId="a1" initialLikeCount={43} initialLikedByMe={true} />);
    await user.click(screen.getByTestId('like-button'));

    expect(mockUnlikeArticle).toHaveBeenCalledWith('a1');
    await waitFor(() => expect(screen.getByTestId('like-button')).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByTestId('like-button')).toHaveTextContent('42');
  });

  it('ignores additional clicks while a request is in flight', async () => {
    mockLikeArticle.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    render(<LikeButton articleId="a1" initialLikeCount={42} initialLikedByMe={false} />);
    const button = screen.getByTestId('like-button');
    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(mockLikeArticle).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });

  it('reverts state and shows an error toast when liking fails', async () => {
    mockLikeArticle.mockRejectedValueOnce(new Error('Article is not currently published'));
    const user = userEvent.setup();

    render(<LikeButton articleId="a1" initialLikeCount={42} initialLikedByMe={false} />);
    await user.click(screen.getByTestId('like-button'));

    expect(await screen.findByTestId('error-toast')).toHaveTextContent(
      'Article is not currently published'
    );
    const button = screen.getByTestId('like-button');
    expect(button).toHaveTextContent('42');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).not.toBeDisabled();
  });

  it('reverts state and shows an error toast when unliking fails', async () => {
    mockUnlikeArticle.mockRejectedValueOnce(new Error('Article not found'));
    const user = userEvent.setup();

    render(<LikeButton articleId="a1" initialLikeCount={43} initialLikedByMe={true} />);
    await user.click(screen.getByTestId('like-button'));

    expect(await screen.findByTestId('error-toast')).toHaveTextContent('Article not found');
    const button = screen.getByTestId('like-button');
    expect(button).toHaveTextContent('43');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).not.toBeDisabled();
  });
});
