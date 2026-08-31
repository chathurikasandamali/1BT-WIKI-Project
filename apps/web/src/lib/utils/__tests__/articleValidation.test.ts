import { MIN_ARTICLE_CONTENT_LENGTH } from '@repo/shared';
import {
  validateArticleTitle,
  validateArticleContent,
} from '@/lib/utils/articleValidation';

describe('validateArticleTitle', () => {
  it('returns an error for an empty title', () => {
    expect(validateArticleTitle('')).toBe('Title is required.');
  });

  it('returns an error for a whitespace-only title', () => {
    expect(validateArticleTitle('   ')).toBe('Title is required.');
  });

  it('returns null for a valid title', () => {
    expect(validateArticleTitle('My Article')).toBeNull();
  });
});

describe('validateArticleContent', () => {
  it('returns an error for null body', () => {
    expect(validateArticleContent(null).error).toBe(
      'Article content is required.'
    );
  });

  it('returns an error for an undefined body', () => {
    expect(validateArticleContent(undefined).error).toBe(
      'Article content is required.'
    );
  });

  it('returns an error for an empty TipTap document', () => {
    const result = validateArticleContent({ type: 'doc', content: [] });
    expect(result.error).toBe('Article content is required.');
    expect(result.textLength).toBe(0);
  });

  it('returns an error for whitespace-only content', () => {
    const result = validateArticleContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '   ' }],
        },
      ],
    });
    expect(result.error).toBe('Article content is required.');
    expect(result.textLength).toBe(0);
  });

  it('returns an error for content below the minimum length', () => {
    const result = validateArticleContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'short content' }],
        },
      ],
    });
    expect(result.error).toBe(
      `Article content must be at least ${MIN_ARTICLE_CONTENT_LENGTH} characters.`
    );
    expect(result.textLength).toBe(13);
  });

  it('accepts content exactly at the minimum length', () => {
    const text = 'x'.repeat(MIN_ARTICLE_CONTENT_LENGTH);
    const result = validateArticleContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text }],
        },
      ],
    });
    expect(result.error).toBeNull();
    expect(result.textLength).toBe(MIN_ARTICLE_CONTENT_LENGTH);
  });

  it('counts only meaningful text and ignores markup', () => {
    const result = validateArticleContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'text',
              marks: [{ type: 'bold' }],
              text: 'world with enough characters to pass validation',
            },
          ],
        },
      ],
    });
    expect(result.error).toBeNull();
    expect(result.textLength).toBe(
      'Hello world with enough characters to pass validation'.length
    );
  });
});
