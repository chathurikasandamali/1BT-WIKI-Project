import { render, waitFor } from '@testing-library/react';

const mockGetSession = jest.fn();

jest.mock('@/lib/auth/client', () => ({
  authClient: {
    getSession: (...args: unknown[]) => mockGetSession(...args),
  },
}));

import SignInCallbackPageImpl from '@/app/signin/callback/page';

// SignInCallbackPage has no return statement (implicit `void`) since it never
// renders anything of its own — it only redirects via a side effect. Cast it
// to a valid component type so it can be rendered in tests.
const SignInCallbackPage =
  SignInCallbackPageImpl as unknown as () => React.JSX.Element;

describe('SignInCallbackPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.assign('http://localhost/signin/callback');
  });

  it('redirects to "/" when a session with a user is returned', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { user: { id: 'u1' } } });

    render(<SignInCallbackPage />);

    await waitFor(() => expect(window.location.href).toBe('http://localhost/'));
  });

  it('redirects to "/signin" when no session/user is returned', async () => {
    mockGetSession.mockResolvedValueOnce({ data: null });

    render(<SignInCallbackPage />);

    await waitFor(() =>
      expect(window.location.href).toBe('http://localhost/signin')
    );
  });

  it('redirects to "/signin" when session data has no user', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { user: null } });

    render(<SignInCallbackPage />);

    await waitFor(() =>
      expect(window.location.href).toBe('http://localhost/signin')
    );
  });

  it('calls getSession exactly once on mount', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { user: { id: 'u1' } } });

    render(<SignInCallbackPage />);

    await waitFor(() => expect(mockGetSession).toHaveBeenCalledTimes(1));
  });
});
