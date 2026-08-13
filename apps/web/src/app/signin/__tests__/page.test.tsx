import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = jest.fn();
const mockSignInSocial = jest.fn();
let mockErrorParam: string | null = null;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'error' ? mockErrorParam : null),
  }),
}));

jest.mock('@/lib/auth/client', () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => mockSignInSocial(...args),
    },
  },
}));

import SignInPage from '@/app/signin/page';

describe('SignInPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockErrorParam = null;
  });

  it('renders the before-login landing experience without fetching protected content', () => {
    const fetchMock = jest.fn();
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: fetchMock,
    });

    render(<SignInPage />);

    expect(
      screen.getByRole('heading', {
        name: /knowledge grows when we share it/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /explore articles/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /browse tech talks/i })
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls the existing Google sign-in flow from the login action', async () => {
    mockSignInSocial.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(
      screen.getByRole('button', { name: /log in with google/i })
    );

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/signin/callback',
      errorCallbackURL: '/signin',
      disableRedirect: false,
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('does not redirect when Google sign-in returns an error', async () => {
    mockSignInSocial.mockResolvedValueOnce({
      error: { message: 'domain not allowed' },
    });
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(
      screen.getByRole('button', { name: /log in with google/i })
    );

    await waitFor(() => expect(mockSignInSocial).toHaveBeenCalledTimes(1));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows a loading state while sign-in is in flight', async () => {
    let resolveSignIn: (value: { error: null }) => void = () => {};
    mockSignInSocial.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      })
    );
    const user = userEvent.setup();

    render(<SignInPage />);
    const loginButton = screen.getByRole('button', {
      name: /log in with google/i,
    });
    await user.click(loginButton);

    expect(loginButton).toBeDisabled();
    expect(loginButton).toHaveAccessibleName(/signing in/i);

    resolveSignIn({ error: null });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('recovers when the sign-in request throws', async () => {
    mockSignInSocial.mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(
      screen.getByRole('button', { name: /log in with google/i })
    );

    await waitFor(() => expect(mockSignInSocial).toHaveBeenCalledTimes(1));
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /log in with google/i })
    ).toBeEnabled();
  });

  it('shows the access-denied message only when the error query is present', () => {
    const { rerender } = render(<SignInPage />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    mockErrorParam = 'domain_not_allowed';
    rerender(<SignInPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(/access denied/i);
    expect(screen.getByRole('alert')).toHaveTextContent(
      /verified 1bt company email address/i
    );
  });

  it('opens and closes the article description experience with the keyboard-accessible controls', async () => {
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(screen.getByRole('button', { name: /explore articles/i }));

    const backButton = await screen.findByRole('button', {
      name: /back to all previews/i,
    });
    expect(
      screen.getByText(
        /explore engineering guides, development practices and lessons/i
      )
    ).toBeInTheDocument();

    await user.click(backButton);

    await waitFor(() => {
      expect(
        screen.queryByText(
          /explore engineering guides, development practices and lessons/i
        )
      ).not.toBeInTheDocument();
    });
  });

  it('activates the tech-talk experience from the navigation', async () => {
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(screen.getByRole('button', { name: 'Tech Talks' }));

    expect(
      await screen.findByText(
        /discover technical sessions, team experiences and knowledge-sharing talks/i
      )
    ).toBeInTheDocument();
  });

  it('switches between clickable background cards while the panel stays open', async () => {
    const user = userEvent.setup();

    render(<SignInPage />);

    const firstTechTalk = screen.getByRole('button', {
      name: /preview tech talk: lessons from the cloud/i,
    });
    const firstArticle = screen.getByRole('button', {
      name: /preview article: building reliable apis/i,
    });
    const secondTechTalk = screen.getByRole('button', {
      name: /preview tech talk: better decisions with data/i,
    });
    const secondArticle = screen.getByRole('button', {
      name: /preview article: cleaner frontend systems/i,
    });

    await user.click(firstTechTalk);
    expect(
      await screen.findByText(
        /discover technical sessions, team experiences and knowledge-sharing talks/i
      )
    ).toBeInTheDocument();
    expect(firstArticle).toBeEnabled();

    await user.click(firstArticle);

    await waitFor(() => {
      expect(firstArticle).toHaveAttribute('aria-pressed', 'true');
      expect(firstTechTalk).toHaveAttribute('aria-pressed', 'false');
    });
    expect(
      screen.getByRole('heading', {
        name: /practical knowledge, written by the people building it/i,
      })
    ).toBeInTheDocument();

    secondArticle.focus();
    await user.keyboard(' ');

    await waitFor(() => {
      expect(secondArticle).toHaveAttribute('aria-pressed', 'true');
      expect(firstArticle).toHaveAttribute('aria-pressed', 'false');
    });

    secondTechTalk.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(secondTechTalk).toHaveAttribute('aria-pressed', 'true');
      expect(firstArticle).toHaveAttribute('aria-pressed', 'false');
    });
    expect(
      screen.getByRole('heading', {
        name: /learn from the people doing the work/i,
      })
    ).toBeInTheDocument();

    firstTechTalk.focus();
    await user.keyboard(' ');

    await waitFor(() => {
      expect(firstTechTalk).toHaveAttribute('aria-pressed', 'true');
      expect(secondTechTalk).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('keeps the final card and panel aligned after rapid selections', async () => {
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(screen.getByRole('button', { name: /explore articles/i }));

    const firstTechTalk = screen.getByRole('button', {
      name: /preview tech talk: lessons from the cloud/i,
    });
    const secondArticle = screen.getByRole('button', {
      name: /preview article: cleaner frontend systems/i,
    });
    const secondTechTalk = screen.getByRole('button', {
      name: /preview tech talk: better decisions with data/i,
    });

    fireEvent.click(firstTechTalk);
    fireEvent.click(secondArticle);
    fireEvent.click(secondTechTalk);

    await waitFor(() => {
      expect(secondTechTalk).toHaveAttribute('aria-pressed', 'true');
    });
    expect(firstTechTalk).toHaveAttribute('aria-pressed', 'false');
    expect(secondArticle).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('heading', {
        name: /learn from the people doing the work/i,
      })
    ).toBeInTheDocument();
  });
});
