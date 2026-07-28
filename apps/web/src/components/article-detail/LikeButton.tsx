'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { HeartIcon } from '@/components/shared/icons/HeartIcon';
import { likeArticle, unlikeArticle } from '@/lib/api/likes';
import { Toast } from '@/components/shared/Toast';

interface LikeButtonProps {
  initialLikeCount: number;
  initialLikedByMe: boolean;
  articleId: string;
}

export function LikeButton({ initialLikeCount, initialLikedByMe, articleId }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLikedByMe);
  const [count, setCount] = useState(initialLikeCount);
  const [pending, setPending] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState<string | null>(null);

  const showErrorToast = (message: string) => {
    setErrorToastMessage(message);
    setTimeout(() => setErrorToastMessage(null), 2500);
  };

  const toggleLike = async () => {
    if (pending) return;

    const nextLiked = !liked;
    const prevLiked = liked;
    const prevCount = count;

    setLiked(nextLiked);
    setCount(prev => (nextLiked ? prev + 1 : prev - 1));
    setPending(true);

    try {
      if (nextLiked) {
        await likeArticle(articleId);
      } else {
        await unlikeArticle(articleId);
      }
    } catch (err) {
      setLiked(prevLiked);
      setCount(prevCount);
      showErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleLike}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? 'Unlike article' : 'Like article'}
        data-testid="like-button"
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full border transition-colors font-medium',
          'disabled:opacity-70 disabled:cursor-not-allowed',
          liked
            ? 'bg-brand-red/10 border-brand-red text-brand-red'
            : 'bg-brand-surface border-brand-border text-brand-text-secondary hover:bg-brand-hover hover:text-brand-dark'
        )}
      >
        <HeartIcon
          fill={liked ? 'currentColor' : 'none'}
          className={cn(liked ? 'text-brand-red' : '')}
        />
        {count}
      </button>

      <Toast
        visible={!!errorToastMessage}
        message={errorToastMessage || ''}
        type="error"
      />
    </>
  );
}
