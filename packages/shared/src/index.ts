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
