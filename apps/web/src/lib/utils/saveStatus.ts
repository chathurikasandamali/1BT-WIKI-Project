import type { SaveStatus } from '@/components/editor/EditorDraftContext';

export type { SaveStatus };

export const getStatusDotColor = (status: SaveStatus): string => {
  switch (status) {
    case 'saving':
      return 'bg-yellow-500';
    case 'saved':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

export const getStatusText = (
  status: SaveStatus,
  lastSavedAt: Date | null
): string => {
  switch (status) {
    case 'saving':
      return 'Saving...';
    case 'saved': {
      if (lastSavedAt) {
        return `Draft saved at ${lastSavedAt.toLocaleTimeString()}`;
      }
      return 'Draft saved';
    }
    case 'error':
      return 'Save failed';
    default:
      return 'Unsaved';
  }
};
