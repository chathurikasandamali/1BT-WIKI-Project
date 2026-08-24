import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotifications } from '../useNotifications';
import { getPusherClient } from '@/lib/pusher';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
} from '@/lib/api/notifications';

jest.mock('@/lib/pusher', () => ({
  getPusherClient: jest.fn(),
}));

jest.mock('@/lib/api/notifications', () => ({
  getNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markNotificationAsRead: jest.fn(),
}));

const mockGetNotifications = getNotifications as jest.Mock;
const mockGetUnreadCount = getUnreadCount as jest.Mock;
const mockMarkNotificationAsRead = markNotificationAsRead as jest.Mock;
const mockGetPusherClient = getPusherClient as jest.Mock;

describe('useNotifications', () => {
  let mockChannel: { bind: jest.Mock; unbind_all: jest.Mock };
  let mockPusherClient: { subscribe: jest.Mock; unsubscribe: jest.Mock; connection: { bind: jest.Mock } };
  let channelBindCallbacks: Record<string, (...args: unknown[]) => void>;
  let connectionBindCallbacks: Record<string, (...args: unknown[]) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    channelBindCallbacks = {};
    connectionBindCallbacks = {};

    mockChannel = {
      bind: jest.fn((event, callback) => {
        channelBindCallbacks[event] = callback;
      }),
      unbind_all: jest.fn(),
    };

    mockPusherClient = {
      subscribe: jest.fn(() => mockChannel),
      unsubscribe: jest.fn(),
      connection: {
        bind: jest.fn((event, callback) => {
          connectionBindCallbacks[event] = callback;
        }),
      },
    };

    mockGetPusherClient.mockReturnValue(mockPusherClient);
  });

  it('loads initial data correctly when userId is provided', async () => {
    mockGetNotifications.mockResolvedValue([
      { id: 'notif-1', isRead: false, message: 'Test Notification' }
    ]);
    mockGetUnreadCount.mockResolvedValue(1);

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
    expect(mockGetNotifications).toHaveBeenCalledTimes(1);
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
    expect(mockPusherClient.subscribe).toHaveBeenCalledWith('private-user-user-1');
  });

  it('does not load data or subscribe if userId is null', async () => {
    const { result } = renderHook(() => useNotifications({ userId: null }));

    expect(result.current.loading).toBe(true); // Since it doesn't run the effect that clears loading
    // Actually wait, let's see: `if (!userId) return;` so loading stays true or maybe false if initialized? 
    // initialized as true, so stays true.
    expect(mockGetNotifications).not.toHaveBeenCalled();
    expect(mockPusherClient.subscribe).not.toHaveBeenCalled();
  });

  it('handles pusher real-time notifications', async () => {
    mockGetNotifications.mockResolvedValue([]);
    mockGetUnreadCount.mockResolvedValue(0);

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate pusher event
    act(() => {
      channelBindCallbacks['notification:new']!({
        id: 'new-notif-1',
        title: 'New Notification',
        message: 'This is new',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]!.id).toBe('new-notif-1');
    expect(result.current.unreadCount).toBe(1);

    // Deduplication test
    act(() => {
      channelBindCallbacks['notification:new']!({
        id: 'new-notif-1', // same ID
        title: 'New Notification',
        message: 'This is new',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    // Both the list and unread count should ignore duplicate events.
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it('reconciles unread count on pusher reconnect', async () => {
    mockGetNotifications.mockResolvedValue([]);
    mockGetUnreadCount.mockResolvedValue(0);

    renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
    });

    // Simulate reconnect
    mockGetUnreadCount.mockResolvedValue(5);
    
    await act(async () => {
      await connectionBindCallbacks['connected']!();
    });

    expect(mockGetUnreadCount).toHaveBeenCalledTimes(2);
  });

  it('marks notification as read', async () => {
    mockGetNotifications.mockResolvedValue([
      { id: 'notif-1', isRead: false, message: 'Test' }
    ]);
    mockGetUnreadCount.mockResolvedValue(1);
    mockMarkNotificationAsRead.mockResolvedValue({});

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead('notif-1');
    });

    expect(mockMarkNotificationAsRead).toHaveBeenCalledWith('notif-1');
    expect(result.current.notifications[0]!.isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('handles markAsRead error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockGetNotifications.mockResolvedValue([
      { id: 'notif-1', isRead: false, message: 'Test' }
    ]);
    mockGetUnreadCount.mockResolvedValue(1);
    mockMarkNotificationAsRead.mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.markAsRead('notif-1')).rejects.toThrow('Failed');
    
    consoleSpy.mockRestore();
  });

  it('cleans up pusher subscriptions on unmount', async () => {
    mockGetNotifications.mockResolvedValue([]);
    mockGetUnreadCount.mockResolvedValue(0);

    const { unmount } = renderHook(() => useNotifications({ userId: 'user-1' }));

    unmount();

    expect(mockChannel.unbind_all).toHaveBeenCalled();
    expect(mockPusherClient.unsubscribe).toHaveBeenCalledWith('private-user-user-1');
  });

  it('handles initial data load failure gracefully', async () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockGetNotifications.mockRejectedValue(new Error('Failed to load'));
    mockGetUnreadCount.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    
    consoleSpy.mockRestore();
  });
  
  it('handles reconcile error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockGetNotifications.mockResolvedValue([]);
    mockGetUnreadCount.mockResolvedValue(0);

    renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
    });

    mockGetUnreadCount.mockRejectedValue(new Error('Reconcile failed'));
    
    await act(async () => {
      await connectionBindCallbacks['connected']!();
    });

    expect(mockGetUnreadCount).toHaveBeenCalledTimes(2); // Should still call it
    
    consoleSpy.mockRestore();
  });
});
