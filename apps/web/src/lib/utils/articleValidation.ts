import {
  MIN_ARTICLE_CONTENT_LENGTH,
  MAX_ARTICLE_TITLE_LENGTH,
  extractTextFromTipTap,
  type TipTapJsonContent,
} from '@repo/shared';

/**
 * Validates the article title, returning a user-facing error message or null
 * when the title is valid. The title must be provided and cannot consist only
 * of whitespace.
 */
export function validateArticleTitle(title: string): string | null {
  if (title.trim() === '') {
    return 'Title is required.';
  }
  if (title.length > MAX_ARTICLE_TITLE_LENGTH) {
    return `Title cannot exceed ${MAX_ARTICLE_TITLE_LENGTH} characters.`;
  }
  return null;
}

export interface ArticleContentValidation {
  error: string | null;
  textLength: number;
}

/**
 * Validates the TipTap article body based on its extracted meaningful plain
 * text (never raw HTML/JSON markup). Returns a user-facing error and the
 * meaningful text length.
 */
export function validateArticleContent(
  body: TipTapJsonContent | null | undefined
): ArticleContentValidation {
  const text = extractTextFromTipTap(body);
  const textLength = text.length;

  if (textLength === 0) {
    return { error: 'Article content is required.', textLength };
  }

  if (textLength < MIN_ARTICLE_CONTENT_LENGTH) {
    return {
      error: `Article content must be at least ${MIN_ARTICLE_CONTENT_LENGTH} characters.`,
      textLength,
    };
  }

  return { error: null, textLength };
}
