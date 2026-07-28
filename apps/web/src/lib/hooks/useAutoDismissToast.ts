import { useState, useCallback, useRef, useEffect } from 'react';

const AUTO_DISMISS_DURATION_MS = 2500;
export const DRAFT_SAVED_MESSAGE = 'Draft saved';

export function useAutoDismissToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((newMessage: string) => {
    setMessage(newMessage);
    setIsVisible(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, AUTO_DISMISS_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { isVisible, message, showToast };
}
