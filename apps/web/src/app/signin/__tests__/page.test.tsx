import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = jest.fn();
const mockSignInSocial = jest.fn();
let mockErrorParam: string | null = null;

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

  it('calls authClient.signIn.social with Google provider and correct callback config', async () => {
    mockSignInSocial.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(
      screen.getByRole('button', { name: /sign in with google/i })
    );

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/signin/callback',
      errorCallbackURL: '/signin',
      disableRedirect: false,
    });
  });

  it('redirects to home on successful sign-in', async () => {
    mockSignInSocial.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(
      screen.getByRole('button', { name: /sign in with google/i })
    );

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('does not redirect when signIn.social returns an error', async () => {
    mockSignInSocial.mockResolvedValueOnce({
      error: { message: 'domain not allowed' },
    });
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(
      screen.getByRole('button', { name: /sign in with google/i })
    );

    await waitFor(() => expect(mockSignInSocial).toHaveBeenCalledTimes(1));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows a loading state on the button while the sign-in call is in flight', async () => {
    let resolveSignIn: (value: { error: null }) => void = () => {};
    mockSignInSocial.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      })
    );
    const user = userEvent.setup();

    render(<SignInPage />);
    const button = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(button);

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

    resolveSignIn({ error: null });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('does not redirect and does not crash when signIn.social itself throws', async () => {
    mockSignInSocial.mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();

    render(<SignInPage />);
    await user.click(
      screen.getByRole('button', { name: /sign in with google/i })
    );

    await waitFor(() => expect(mockSignInSocial).toHaveBeenCalledTimes(1));
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /sign in with google/i })
    ).toBeEnabled();
  });

  it('does not show the Access Denied banner when no error query param is present', () => {
    mockErrorParam = null;
    render(<SignInPage />);

    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it('shows the Access Denied banner with the domain-check message when an error query param is present', () => {
    mockErrorParam = 'domain_not_allowed';
    render(<SignInPage />);

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /please sign in using your verified 1bt company email address/i
      )
    ).toBeInTheDocument();
  });
});
