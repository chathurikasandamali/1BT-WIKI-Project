import { apiFetch } from '@/lib/api/client';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, type PaginationParams } from '@repo/shared';

export type TechTalkStatus = 'draft' | 'published' | 'unpublished';

export interface TechTalkDetail {
    id: string;
    title: string;
    description: string | null;
    presenters: string[];
    tags: string[];
    eventDate: string;
    slidesUrl: string | null;
    youtubeVideoId: string | null;
    status: TechTalkStatus;
    createdBy: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TechTalkListItem {
    id: string;
    title: string;
    description: string | null;
    presenters: string[];
    tags: string[];
    eventDate: string;
    slidesUrl: string | null;
    youtubeVideoId: string | null;
    status: TechTalkStatus;
    createdAt: string;
    updatedAt: string;
}

export interface PublishedTechTalkListResult {
    techTalks: TechTalkListItem[];
    total: number;
    page: number;
    limit: number;
}

// ── Admin list types ───────────────────────────────────────────────────────────

export interface AdminTechTalkListQuery {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: string;
    status?: TechTalkStatus;
}

export interface AdminTechTalkListResult {
    techTalks: TechTalkListItem[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateTechTalkData {
    title: string;
    description?: string;
    presenters: string[];
    tags?: string[];
    eventDate: string;
    youtubeVideoId?: string;
    publishImmediately?: boolean;
}

export interface UpdateTechTalkData {
    title?: string;
    description?: string;
    presenters?: string[];
    tags?: string[];
    eventDate?: string;
    youtubeVideoId?: string;
}

export async function createTechTalk(
    data: CreateTechTalkData,
    slidesFile?: File
): Promise<TechTalkDetail> {
    const formData = new FormData();

    formData.append('data', JSON.stringify(data));

    if (slidesFile) {
        formData.append('slides', slidesFile);
    }

    const result = await apiFetch<TechTalkDetail>('/techTalks', {
        method: 'POST',
        body: formData,
    });

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create Tech Talk');
    }

    return result.data;
}

export async function updateTechTalk(
    id: string,
    data: UpdateTechTalkData,
    slidesFile?: File
): Promise<TechTalkDetail> {
    const formData = new FormData();

    formData.append('data', JSON.stringify(data));

    if (slidesFile) {
        formData.append('slides', slidesFile);
    }

    const result = await apiFetch<TechTalkDetail>(`/techTalks/${id}`, {
        method: 'PATCH',
        body: formData,
    });

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update Tech Talk');
    }

    return result.data;
}

/**
 * Admin-only: list all Tech Talks across every status with optional
 * status/search/sort/paginate filters (`GET /techTalks/listAll`).
 *
 * NOTE: the backend route is `/techTalks/listAll`, not `/admin/tech-talks`.
 */
export async function listAll(
    query: AdminTechTalkListQuery = {}
): Promise<AdminTechTalkListResult> {
    const params = new URLSearchParams();

    if (query.page !== undefined) params.set('page', String(query.page));
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    if (query.status !== undefined) params.set('status', query.status);
    if (query.search) params.set('search', query.search);
    if (query.sort !== undefined) params.set('sort', query.sort);
    if (query.order !== undefined) params.set('order', query.order);

    const qs = params.toString();
    const result = await apiFetch<AdminTechTalkListResult>(
        `/techTalks/listAll${qs ? `?${qs}` : ''}`
    );

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load Tech Talks');
    }

    return result.data;
}

export async function publishTechTalk(
    id: string
): Promise<TechTalkDetail> {
    const result = await apiFetch<TechTalkDetail>(
        `/techTalks/${id}/publish`,
        {
            method: 'POST',
        }
    );

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to publish Tech Talk');
    }

    return result.data;
}

/**
 * Admin-only: unpublish a Tech Talk (`POST /techTalks/:id/unpublish`).
 * Transitions: published → unpublished.
 */
export async function unpublishTechTalk(
    id: string
): Promise<TechTalkDetail> {
    const result = await apiFetch<TechTalkDetail>(
        `/techTalks/${id}/unpublish`,
        {
            method: 'POST',
        }
    );

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to unpublish Tech Talk');
    }

    return result.data;
}

/**
 * Admin-only: soft-delete a Tech Talk (`DELETE /techTalks/:id`).
 */
export async function deleteTechTalk(id: string): Promise<void> {
    const result = await apiFetch(`/techTalks/${id}`, { method: 'DELETE' });

    if (!result.success) {
        throw new Error(result.error || 'Failed to delete Tech Talk');
    }
}

export async function getTechTalkById(
    id: string,
    options?: RequestInit
): Promise<TechTalkDetail> {
    const result = await apiFetch<TechTalkDetail>(
        `/techTalks/${id}`,
        options
    );

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load Tech Talk');
    }

    return result.data;
}

export type FetchPublishedTechTalksOptions = PaginationParams & RequestInit & {
    search?: string;
    sort?: string;
    order?: string;
};

export async function fetchPublishedTechTalks({
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    search,
    sort,
    order,
    ...init
}: FetchPublishedTechTalksOptions = {}): Promise<PublishedTechTalkListResult> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (search) {
        params.append('search', search);
    }
    if (sort) {
        params.append('sort', sort);
    }
    if (order) {
        params.append('order', order);
    }

    const result = await apiFetch<PublishedTechTalkListResult>(
        `/techTalks?${params.toString()}`,
        init
    );

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load published Tech Talks');
    }

    return result.data;
}