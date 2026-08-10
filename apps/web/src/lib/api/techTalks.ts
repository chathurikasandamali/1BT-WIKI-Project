import { apiFetch } from '@/lib/api/client';

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

export async function getTechTalkById(
    id: string
): Promise<TechTalkDetail> {
    const result = await apiFetch<TechTalkDetail>(`/techTalks/${id}`);

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load Tech Talk');
    }

    return result.data;
}