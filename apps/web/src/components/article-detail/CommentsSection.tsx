/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import {
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

  const [toastVisible, setToastVisible] = useState(false);
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

      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2000);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : String(err));
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await deleteComment(articleId, id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const handleEditComment = async (id: string, body: string) => {
    const updated = await updateComment(articleId, id, body);
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, body: updated.body, updatedAt: updated.updatedAt }
          : c
      )
    );
  };

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

      {!loading && error && (
        <p
          data-testid="comments-error"
          className="text-brand-red text-center py-8"
        >
          {error}
        </p>
      )}

      {!loading && !error && (
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

      <Toast visible={toastVisible} message="Comment posted" type="success" />
      <Toast
        visible={!!errorToastMessage}
        message={errorToastMessage || ''}
        type="error"
      />
    </div>
  );
}
