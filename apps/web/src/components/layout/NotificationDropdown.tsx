'use client';

import React from 'react';
import { useNotificationContext } from '@/components/providers/NotificationProvider';

interface NotificationDropdownProps {
  id?: string;
  onClose: () => void;
}

export function NotificationDropdown({ id, onClose }: NotificationDropdownProps) {
  const { notifications, loading, markAsRead } = useNotificationContext();

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId).catch(console.error);
    }
    onClose();
  };

  const isInitialLoading = loading && notifications.length === 0;

  return (
    <div
      id={id}
      role="dialog"
      aria-label="Notifications"
      className="w-80 max-h-[400px] overflow-y-auto bg-white border border-brand-border rounded-lg shadow-lg flex flex-col"
    >
      <div className="p-4 border-b border-brand-border font-semibold text-brand-text-primary sticky top-0 bg-white z-10 flex justify-between items-center">
        <span>Notifications</span>
      </div>

      {isInitialLoading ? (
        <div className="p-4 text-sm text-brand-text-secondary text-center">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="p-4 text-sm text-brand-text-secondary text-center">No notifications</div>
      ) : (
        <div className="flex flex-col">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification.id, notification.isRead)}
              className={`text-left p-4 border-b border-brand-border last:border-0 hover:bg-brand-hover transition-colors ${
                !notification.isRead ? 'bg-brand-red/5' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <span
                  className={`text-sm ${
                    !notification.isRead
                      ? 'font-semibold text-brand-text-primary'
                      : 'font-medium text-brand-text-secondary'
                  }`}
                >
                  {notification.notificationTitle}
                </span>
                {!notification.isRead && (
                  <span className="w-2 h-2 rounded-full bg-brand-red flex-shrink-0 mt-1" />
                )}
              </div>
              <p className="text-xs text-brand-text-secondary mb-2 line-clamp-2">
                {notification.message}
              </p>
              <span className="text-[10px] text-brand-text-secondary">
                {new Date(notification.createdAt).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
