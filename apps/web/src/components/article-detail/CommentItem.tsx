/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import { CommentWithAuthor } from '@/lib/api/comments';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { TrashIcon } from '@/components/shared/icons/TrashIcon';
import { Pencil } from 'lucide-react';

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUserId: string | undefined;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, body: string) => Promise<void>;
}

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?u=default';

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${Math.max(0, seconds)} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function getLockReason(comment: CommentWithAuthor): string | null {
  if (comment.status === 'Pending') {
    return 'Awaiting approval — cannot be edited or deleted';
  }
  if (comment.status === 'Rejected') {
    return 'Rejected comments cannot be edited or deleted';
  }
  if (comment.pendingChange === 'Edit') {
    return 'Your edit is awaiting approval';
  }
  if (comment.pendingChange === 'Delete') {
    return 'Your deletion request is awaiting approval';
  }
  return null;
}

function getModerationLabel(comment: CommentWithAuthor): string | null {
  if (comment.status === 'Pending') return 'Pending approval';
  if (comment.status === 'Rejected') return 'Not approved';
  if (comment.pendingChange === 'Edit') return 'Edit pending approval';
  if (comment.pendingChange === 'Delete') return 'Deletion pending approval';
  return null;
}

export function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onEdit,
}: CommentItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(comment.body);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isMine = comment.createdBy === currentUserId;
  const isEdited = comment.updatedAt !== comment.createdAt;
  const showActions = isMine && !isEditing;
  // Mirrors the API rule: only an Approved comment with no outstanding
  // edit/delete request may be changed, so moderators decide on a stable version.
  const lockReason = getLockReason(comment);
  const isLocked = lockReason !== null;
  const moderationLabel = getModerationLabel(comment);
  const moderationBadgeClass =
    comment.status === 'Rejected'
      ? 'bg-brand-red/10 text-brand-red border-brand-red/20'
      : 'bg-amber-50 text-amber-700 border-amber-200';
  const proposedBody =
    comment.pendingChange === 'Edit' ? comment.pendingBody : null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(comment.id);
      setIsModalOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditing = () => {
    setDraftBody(comment.body);
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftBody(comment.body);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    const trimmed = draftBody.trim();
    if (!trimmed) return;

    setIsSaving(true);
    setEditError(null);
    try {
      await onEdit(comment.id, trimmed);
      setIsEditing(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      data-testid="comment-item"
      className="flex gap-4 py-6 border-b border-brand-border last:border-0"
    >
      <img
        src={comment.authorImage || DEFAULT_AVATAR}
        alt={comment.authorName}
        className="w-10 h-10 rounded-full bg-brand-border object-cover"
      />
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-semibold text-brand-dark">
              {comment.authorName}
            </span>
            <span className="ml-2 text-sm text-brand-text-secondary">
              {timeAgo(comment.createdAt)}
            </span>
            {isEdited && (
              <span className="ml-2 text-xs text-brand-text-secondary">
                (edited)
              </span>
            )}
            {moderationLabel && (
              <span
                data-testid="comment-status-badge"
                className={`ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${moderationBadgeClass}`}
              >
                {moderationLabel}
              </span>
            )}
          </div>
          {showActions && (
            // Tooltip lives on the wrapper because disabled buttons don't
            // reliably show their own title on hover.
            <div
              className="flex items-center gap-1"
              title={lockReason ?? undefined}
              data-testid="comment-actions"
            >
              <button
                onClick={startEditing}
                disabled={isLocked}
                data-testid="edit-comment-btn"
                className="text-brand-text-secondary hover:text-brand-dark transition-colors p-1 rounded hover:bg-brand-dark/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-brand-text-secondary"
                title={isLocked ? undefined : 'Edit comment'}
                aria-label={lockReason ?? 'Edit comment'}
              >
                <Pencil width="16" height="16" />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={isLocked}
                data-testid="delete-comment-btn"
                className="text-brand-text-secondary hover:text-brand-red transition-colors p-1 rounded hover:bg-brand-red/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-brand-text-secondary"
                title={isLocked ? undefined : 'Delete comment'}
                aria-label={lockReason ?? 'Delete comment'}
              >
                <TrashIcon width="16" height="16" />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              data-testid="edit-comment-input"
              className="w-full bg-brand-bg border border-brand-border rounded-lg p-3 text-brand-text-primary focus:outline-none focus:border-brand-red resize-none min-h-[80px] transition-colors"
            />
            {editError && (
              <p
                data-testid="edit-comment-error"
                className="text-sm text-brand-red"
              >
                {editError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                data-testid="cancel-edit-comment-btn"
                className="px-4 py-1.5 text-sm font-medium text-brand-text-secondary rounded-lg hover:bg-brand-border disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={
                  isSaving ||
                  !draftBody.trim() ||
                  draftBody.trim() === comment.body
                }
                data-testid="save-edit-comment-btn"
                className="px-4 py-1.5 text-sm font-medium bg-brand-dark text-brand-surface rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-red transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-brand-text-primary whitespace-pre-wrap">
              {comment.body}
            </p>
            {proposedBody !== null && (
              <div
                data-testid="comment-proposed-edit"
                className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3"
              >
                <p className="text-xs font-medium text-amber-700">
                  Your proposed edit (only visible to you until approved):
                </p>
                <p className="mt-1 text-sm text-brand-text-primary whitespace-pre-wrap">
                  {proposedBody}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        title="Delete this comment?"
        message={
          deleteError ||
          'Your deletion request will be sent for approval. The comment stays visible until an admin approves it.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsModalOpen(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
