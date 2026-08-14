export interface PaginationParams {
  page?: number;
  limit?: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;

export const MAX_TECH_TALK_SLIDES_SIZE_BYTES = 20 * 1024 * 1024;
