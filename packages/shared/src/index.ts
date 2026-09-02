// ---------------------------------------------------------------------------
// TechTalkStatus — mirrors the Prisma enum of the same name.
// Defined here (not in @repo/db) so that client-side code in apps/web can
// import it without bundling the Prisma client into the browser.
// ---------------------------------------------------------------------------

/** Runtime object matching the Prisma TechTalkStatus enum values. */
export const TechTalkStatus = {
  draft: 'draft',
  published: 'published',
  unpublished: 'unpublished',
} as const;

/** TypeScript type derived from the TechTalkStatus const. */
export type TechTalkStatus = (typeof TechTalkStatus)[keyof typeof TechTalkStatus];

export const ReviewCommentStatus = {
  open: 'Open',
  resolved: 'Resolved',
} as const;

export type ReviewCommentStatus = (typeof ReviewCommentStatus)[keyof typeof ReviewCommentStatus];

export const ArticleStatus = {
  Draft: 'Draft',
  Pending: 'Pending',
  Approved: 'Approved',
  Published: 'Published',
  Unpublished: 'Unpublished',
}

export type ArticleStatus = (typeof ArticleStatus)[keyof typeof ArticleStatus];

export const ArticleReviewStatus = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
}

export type ArticleReviewStatus = (typeof ArticleReviewStatus)[keyof typeof ArticleReviewStatus];

// ---------------------------------------------------------------------------

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;

export const MAX_TECH_TALK_SLIDES_SIZE_BYTES = 20 * 1024 * 1024;

export type TechTalkFixtureStatus = 'draft' | 'published' | 'unpublished';

/**
 * Shared test fixture shape for a Tech Talk.
 *
 * Date fields are typed as `Date | string` so the fixture can be reused by
 * both the API tests (which work with `Date` objects) and the Web tests
 * (which work with ISO date strings). Consumers cast to their own domain
 * type where needed.
 */
export interface TechTalkFixture {
  id: string;
  title: string;
  description: string | null;
  presenters: string[];
  tags: string[];
  eventDate: Date | string;
  slidesUrl: string | null;
  youtubeVideoId: string | null;
  status: TechTalkFixtureStatus;
  createdBy: string;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Creates a Tech Talk test fixture with sensible defaults, overriding any
 * provided fields. Reused by both the API and Web test suites.
 */
export function createTechTalk(overrides: Partial<TechTalkFixture> = {}): TechTalkFixture {
  return {
    id: 'tt-default-id',
    title: 'Default Talk',
    description: null,
    presenters: ['Default Presenter'],
    tags: ['General'],
    eventDate: new Date('2026-09-01T10:00:00.000Z'),
    slidesUrl: null,
    youtubeVideoId: null,
    status: 'published',
    createdBy: 'admin-1',
    deletedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Article authoring validation — single source of truth shared by the
// backend (apps/api) and frontend (apps/web) so the same business rules are
// always applied on both sides.
// ---------------------------------------------------------------------------

/**
 * Minimum meaningful plain-text length for the TipTap article body.
 *
 * Calculated from the extracted plain text, NOT from HTML/JSON/markup length,
 * node count, or formatting characters. This constant is intentionally shared
 * between the frontend and backend so the rules can never drift apart.
 */
export const MIN_ARTICLE_CONTENT_LENGTH = 50;

/**
 * Maximum length for an article title (matches the backend check).
 */
export const MAX_ARTICLE_TITLE_LENGTH = 500;

/**
 * Loose structural shape of a TipTap JSON content node. The backend stores
 * article bodies as TipTap JSON, so validation must walk this structure to
 * find real text rather than measuring raw markup.
 */
export interface TipTapJsonContent {
  type?: string;
  text?: string;
  content?: TipTapJsonContent[];
  [key: string]: unknown;
}

/**
 * Extracts meaningful plain text from a TipTap JSON document.
 *
 * Walks the tree, collecting every leaf `text` value, and separates block
 * nodes with newlines. Whitespace is normalised and trimmed so that markup
 * (e.g. `<strong>`, links) and empty/whitespace-only paragraphs never count
 * toward the article's content length.
 *
 * Shared by the backend service validation and the frontend editor so both
 * calculate content length identically.
 */
export function extractTextFromTipTap(
  body: TipTapJsonContent | null | undefined
): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return '';
  }

  const BLOCK_NODE_TYPES = new Set([
    'paragraph',
    'heading',
    'blockquote',
    'codeBlock',
    'listItem',
    'tableRow',
  ]);

  const collectText = (node: TipTapJsonContent, parts: string[]): void => {
    if (typeof node.text === 'string') {
      parts.push(node.text);
    }

    const content = node.content;
    if (Array.isArray(content)) {
      for (const child of content) {
        if (typeof child === 'object' && child !== null) {
          collectText(child as TipTapJsonContent, parts);
        }
      }
    }

    if (typeof node.type === 'string' && BLOCK_NODE_TYPES.has(node.type)) {
      parts.push('\n');
    }
  };

  const parts: string[] = [];
  collectText(body, parts);

  return parts
    .join(' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * Returns the meaningful plain-text length of a TipTap JSON article body,
 * normalised by leading/trailing whitespace.
 */
export function getArticleContentLength(
  body: TipTapJsonContent | null | undefined
): number {
  return extractTextFromTipTap(body).length;
}
