'use client';

import React from 'react';
import { type ReviewComment } from '@/lib/api/reviewer.api';
import { cn } from '@/lib/utils';
import { Check, Undo2 } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { ReviewCommentStatus } from '@repo/shared';

interface ReviewCommentsListProps {
  comments: ReviewComment[];
  activeCommentId?: string | null;
  onClickComment?: (commentId: string) => void;
  onUpdateCommentStatus?: (commentId: string, status: ReviewCommentStatus) => void;
}

export function ReviewCommentsList({
  comments,
  activeCommentId,
  onClickComment,
  onUpdateCommentStatus,
}: ReviewCommentsListProps) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="review-comments-sidebar"
      className="flex flex-col h-full border border-brand-border bg-white rounded-xl overflow-hidden shadow-sm"
    >
      <div className="px-5 py-4 border-b border-brand-border bg-brand-bg">
        <h2 className="text-base font-bold text-brand-text-primary font-display flex items-center justify-between">
          <span>Review Comments</span>
          <span className="text-xs bg-brand-red/10 text-brand-red px-2 py-0.5 rounded-full font-sans">
            {comments.length}
          </span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {comments.map((comment) => {
          const isActive = activeCommentId === comment.id;
          const isResolved = comment.status === 'Resolved';

          return (
            <div
              key={comment.id}
              data-testid={`comment-item-${comment.id}`}
              onClick={() => onClickComment?.(comment.id)}
              className={cn(
                'p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5',
                isActive
                  ? 'border-amber-500 bg-amber-50/50 shadow-md ring-1 ring-amber-500'
                  : 'border-brand-border hover:border-gray-400 bg-white hover:bg-gray-50/30',
                isResolved && 'opacity-70 bg-gray-50/50 border-dashed'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">
                  {formatDate(comment.createdAt)}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider border',
                    isResolved
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  )}
                  data-testid={`comment-status-${comment.id}`}
                >
                  {comment.status}
                </span>
              </div>

              {comment.selectedText && (
                <blockquote className="border-l-2 border-brand-border pl-2.5 py-1 text-xs text-brand-text-secondary bg-brand-bg italic rounded-r line-clamp-3">
                  &ldquo;{comment.selectedText}&rdquo;
                </blockquote>
              )}

              <p className="text-sm text-brand-text-primary whitespace-pre-wrap">
                {comment.comment}
              </p>

              <div className="flex justify-end pt-2 border-t border-brand-border/60">
                {isResolved ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateCommentStatus?.(comment.id, 'Open');
                    }}
                    data-testid={`reopen-comment-${comment.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors py-1 px-2 hover:bg-amber-50 rounded"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Reopen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateCommentStatus?.(comment.id, 'Resolved');
                    }}
                    data-testid={`resolve-comment-${comment.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 transition-colors py-1 px-2 hover:bg-green-50 rounded"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
