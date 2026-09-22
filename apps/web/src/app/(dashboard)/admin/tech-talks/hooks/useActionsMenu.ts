'use client';

import { useEffect, useState } from 'react';
import { menuPanelId, menuTriggerId } from '../constants/constants';

export interface ActionsMenuController {
  /** Id of the row whose menu is currently open, or null when all are closed. */
  activeId: string | null;
  toggle: (techTalkId: string) => void;
  close: () => void;
}

/**
 * Tracks which row's actions menu is open and dismisses it on outside click
 * or Escape. Only one menu can be open at a time, so a single document-level
 * listener serves every row.
 */
export function useActionsMenu(): ActionsMenuController {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId) return;

    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      const panel = document.getElementById(menuPanelId(activeId));
      const trigger = document.getElementById(menuTriggerId(activeId));

      if (!panel?.contains(target) && !trigger?.contains(target)) {
        setActiveId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setActiveId(null);
      document.getElementById(menuTriggerId(activeId))?.focus();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeId]);

  return {
    activeId,
    toggle: (techTalkId) =>
      setActiveId((current) => (current === techTalkId ? null : techTalkId)),
    close: () => setActiveId(null),
  };
}
