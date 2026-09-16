import { renderHook, act } from '@testing-library/react';
import { useRoleChangeLogout } from '../useRoleChangeLogout';
import { getPusherClient } from '@/lib/pusher';
import { authClient } from '@/lib/auth/client';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/pusher', () => ({
  getPusherClient: jest.fn(),
}));

jest.mock('@/lib/auth/client', () => ({
  authClient: { signOut: jest.fn().mockResolvedValue(undefined) },
}));

const mockGetPusherClient = getPusherClient as jest.Mock;
const mockSignOut = authClient.signOut as jest.Mock;

describe('useRoleChangeLogout', () => {
  let mockChannel: {
    bind: jest.Mock;
    unbind: jest.Mock;
    unbind_all: jest.Mock;
  };
  let mockPusherClient: { subscribe: jest.Mock; unsubscribe: jest.Mock };
  let boundHandlers: Array<{ event: string; handler: (...args: unknown[]) => void }>;

  const bindRoleChangeHandler = (): void => {
    const bound = boundHandlers.find((h) => h.event === 'role-changed');
    if (!bound) throw new Error('role-changed handler was not subscribed');
    bound.handler({ role: 'Reviewer' });
  };

  const roleChangeHandlerCount = (): number =>
    boundHandlers.filter((h) => h.event === 'role-changed').length;

  beforeEach(() => {
    jest.clearAllMocks();

    boundHandlers = [];

    mockChannel = {
      bind: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
        boundHandlers.push({ event, handler });
      }),
      unbind: jest.fn(
        (event: string, handler: (...args: unknown[]) => void) => {
          const index = boundHandlers.findIndex(
            (h) => h.event === event && h.handler === handler
          );
          if (index !== -1) boundHandlers.splice(index, 1);
        }
      ),
      unbind_all: jest.fn(() => {
        boundHandlers.length = 0;
      }),
    };

    mockPusherClient = {
      subscribe: jest.fn(() => mockChannel),
      unsubscribe: jest.fn(),
    };

    mockGetPusherClient.mockReturnValue(mockPusherClient);
    mockSignOut.mockResolvedValue(undefined);
  });

  it('subscribes to the user private channel and listens for role-changed', () => {
    renderHook(() => useRoleChangeLogout('user-1'));

    expect(mockPusherClient.subscribe).toHaveBeenCalledWith(
      'private-user-user-1'
    );
    expect(roleChangeHandlerCount()).toBe(1);
  });

  it('does not subscribe when userId is null', () => {
    renderHook(() => useRoleChangeLogout(null));

    expect(mockPusherClient.subscribe).not.toHaveBeenCalled();
  });

  it('signs out and redirects to /signin when role-changed is received', async () => {
    renderHook(() => useRoleChangeLogout('user-1'));

    await act(async () => {
      bindRoleChangeHandler();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith('/signin');
  });

  it('does not call signOut twice for rapid duplicate events', async () => {
    renderHook(() => useRoleChangeLogout('user-1'));

    await act(async () => {
      bindRoleChangeHandler();
      bindRoleChangeHandler();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('logs the error and does not redirect when signOut fails', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockSignOut.mockRejectedValue(new Error('Sign out failed'));

    renderHook(() => useRoleChangeLogout('user-1'));

    await act(async () => {
      bindRoleChangeHandler();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useRoleChangeLogout] Failed to sign out after role change:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('removes its handler and releases the channel on unmount', () => {
    const { unmount } = renderHook(() => useRoleChangeLogout('user-1'));

    expect(roleChangeHandlerCount()).toBe(1);

    unmount();

    expect(roleChangeHandlerCount()).toBe(0);
    expect(mockChannel.unbind_all).toHaveBeenCalled();
    expect(mockPusherClient.unsubscribe).toHaveBeenCalledWith(
      'private-user-user-1'
    );
  });

  it('does not accumulate duplicate handlers across remounts (StrictMode-safe)', () => {
    const first = renderHook(() => useRoleChangeLogout('user-1'));
    expect(roleChangeHandlerCount()).toBe(1);

    first.unmount();
    expect(roleChangeHandlerCount()).toBe(0);

    renderHook(() => useRoleChangeLogout('user-1'));
    expect(roleChangeHandlerCount()).toBe(1);
  });
});