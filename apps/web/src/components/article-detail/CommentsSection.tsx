/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import {
  Comment,
  CommentWithAuthor,
  fetchComments,
  postComment,
  updateComment,
  deleteComment,
} from '@/lib/api/comments';
import { useUser } from '@/lib/hooks/useUser';
import { CommentItem } from './CommentItem';
import { Toast } from '@/components/shared/Toast';

interface CommentsSectionProps {
  articleId: string;
}

export function CommentsSection({ articleId }: CommentsSectionProps) {
  const { user } = useUser();

  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [successToastMessage, setSuccessToastMessage] = useState<
    string | null
  >(null);
  const [errorToastMessage, setErrorToastMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchComments(articleId);
        if (!cancelled) {
          setComments(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const showErrorToast = (message: string) => {
    setErrorToastMessage(message);
    setTimeout(() => setErrorToastMessage(null), 2500);
  };

  const showSuccessToast = (message: string) => {
    setSuccessToastMessage(message);
    setTimeout(() => setSuccessToastMessage(null), 2000);
  };

  // Edit/delete are moderated requests: the comment stays in the list with
  // its live body, and only the moderation fields change.
  const applyModerationUpdate = (updated: Comment) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === updated.id
          ? {
              ...c,
              body: updated.body,
              status: updated.status,
              pendingChange: updated.pendingChange,
              pendingBody: updated.pendingBody,
              updatedAt: updated.updatedAt,
            }
          : c
      )
    );
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || !user) return;

    setPosting(true);
    setPostError(null);
    try {
      const created = await postComment(articleId, trimmed);
      const comment: CommentWithAuthor = {
        ...created,
        authorName: user.name,
        authorImage: user.avatarUrl,
      };

      setComments([comment, ...comments]);
      setNewComment('');

      showSuccessToast('Comment posted — pending approval');
    } catch (err) {
      setPostError(err instanceof Error ? err.message : String(err));
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      const updated = await deleteComment(articleId, id);
      applyModerationUpdate(updated);
      showSuccessToast('Deletion request submitted — pending approval');
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const handleEditComment = async (id: string, body: string) => {
    const updated = await updateComment(articleId, id, body);
    applyModerationUpdate(updated);
    showSuccessToast('Edit submitted — pending approval');
  };

  const showError = !loading && !!error;
  const showComments = !loading && !error;

  return (
    <div className="mt-12 bg-brand-surface rounded-xl shadow-sm border border-brand-border p-6 md:p-8">
      <h3 className="text-xl font-display font-bold text-brand-dark mb-6">
        Comments ({comments.length})
      </h3>

      {user && (
        <form onSubmit={handlePostComment} className="mb-8 flex gap-4">
          <img
            src={user.avatarUrl || 'https://i.pravatar.cc/150?u=default'}
            alt={user.name}
            className="w-10 h-10 rounded-full bg-brand-border hidden sm:block object-cover"
          />
          <div className="flex-1 flex flex-col items-end gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-brand-bg border border-brand-border rounded-lg p-4 text-brand-text-primary
              placeholder:text-brand-text-secondary focus:outline-none focus:border-brand-red resize-none min-h-[100px] transition-colors"
            />
            {postError && (
              <p
                data-testid="post-comment-error"
                className="text-sm text-brand-red self-start"
              >
                {postError}
              </p>
            )}
            <button
              type="submit"
              disabled={!newComment.trim() || posting}
              className="px-6 py-2.5 bg-brand-dark text-brand-surface font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
              hover:bg-brand-red transition-colors"
            >
              {posting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}

      {loading && (
        <p
          data-testid="comments-loading"
          className="text-brand-text-secondary text-center py-8"
        >
          Loading comments...
        </p>
      )}

      {showError && (
        <p
          data-testid="comments-error"
          className="text-brand-red text-center py-8"
        >
          {error}
        </p>
      )}

      {showComments && (
        <div data-testid="comments-list" className="flex flex-col">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onDelete={handleDeleteComment}
              onEdit={handleEditComment}
            />
          ))}
          {comments.length === 0 && (
            <p
              data-testid="comments-empty"
              className="text-brand-text-secondary text-center py-8"
            >
              No comments yet. Be the first to share your thoughts!
            </p>
          )}
        </div>
      )}

      <Toast
        visible={!!successToastMessage}
        message={successToastMessage || ''}
        type="success"
      />
      <Toast
        visible={!!errorToastMessage}
        message={errorToastMessage || ''}
        type="error"
      />
    </div>
  );
}
