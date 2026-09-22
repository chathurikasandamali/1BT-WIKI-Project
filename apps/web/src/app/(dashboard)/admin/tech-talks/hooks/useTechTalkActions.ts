'use client';

import { useState } from 'react';
import { TechTalkStatus } from '@repo/shared';
import {
  deleteTechTalk,
  publishTechTalk,
  unpublishTechTalk,
} from '@/lib/api/techTalks';
import { useToast } from '@/lib/hooks/useToast';
import type { ToastType } from '@/components/shared/Toast';
import type { TechTalkModalAction } from '../constants/types';

interface ActionCopy {
  title: string;
  message: string;
  confirmText: string;
  successMessage: string;
  run: (techTalkId: string) => Promise<unknown>;
}

const ACTIONS: Record<TechTalkModalAction, ActionCopy> = {
  [TechTalkStatus.published]: {
    title: 'Publish Tech Talk?',
    message: 'Are you sure you want to publish this Tech Talk?',
    confirmText: 'Publish',
    successMessage: 'Tech Talk published successfully',
    run: publishTechTalk,
  },
  [TechTalkStatus.unpublished]: {
    title: 'Unpublish Tech Talk?',
    message: 'Are you sure you want to unpublish this Tech Talk?',
    confirmText: 'Unpublish',
    successMessage: 'Tech Talk unpublished successfully',
    run: unpublishTechTalk,
  },
  [TechTalkStatus.deleted]: {
    title: 'Delete Tech Talk?',
    message:
      'Are you sure you want to delete this Tech Talk? This action cannot be undone.',
    confirmText: 'Delete',
    successMessage: 'Tech Talk deleted successfully',
    run: deleteTechTalk,
  },
};

/** Props shaped for <ConfirmationModal>. */
interface ActionModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  isConfirming: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export interface TechTalkActions {
  /** True while a confirmed action is in flight; disables the menu items. */
  isMutating: boolean;
  toast: { visible: boolean; message: string; type: ToastType };
  requestPublish: (techTalkId: string) => void;
  requestUnpublish: (techTalkId: string) => void;
  requestDelete: (techTalkId: string) => void;
  modal: ActionModalProps;
}

/**
 * Drives the publish / unpublish / delete flow: each request opens the shared
 * confirmation modal, and confirming runs the API call, reports the result via
 * toast, and calls `onCompleted` so the caller can refresh its data.
 */
export function useTechTalkActions(
  onCompleted: () => Promise<void>
): TechTalkActions {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [action, setAction] = useState<TechTalkModalAction | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const { toast, showToast } = useToast();

  const closeModal = (): void => {
    setTargetId(null);
    setAction(null);
  };

  const request =
    (next: TechTalkModalAction) =>
    (techTalkId: string): void => {
      setTargetId(techTalkId);
      setAction(next);
    };

  const onConfirm = async (): Promise<void> => {
    if (!targetId || !action || isMutating) return;

    setIsMutating(true);
    try {
      const { run, successMessage } = ACTIONS[action];
      await run(targetId);
      showToast(successMessage, 'success');
      closeModal();
      await onCompleted();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      showToast(message, 'error');
      closeModal();
    } finally {
      setIsMutating(false);
    }
  };

  const copy = action ? ACTIONS[action] : null;

  return {
    isMutating,
    toast,
    requestPublish: request(TechTalkStatus.published),
    requestUnpublish: request(TechTalkStatus.unpublished),
    requestDelete: request(TechTalkStatus.deleted),
    modal: {
      isOpen: action !== null,
      title: copy?.title ?? '',
      message: copy?.message ?? '',
      confirmText: copy?.confirmText ?? 'Confirm',
      isConfirming: isMutating,
      onConfirm,
      onCancel: () => {
        if (isMutating) return;
        closeModal();
      },
    },
  };
}
