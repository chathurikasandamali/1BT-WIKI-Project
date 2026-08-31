import type { TechTalkStatus } from '@repo/db';
import type { PaginationParams } from '@repo/shared';

export const TECH_TALK_SORT_FIELDS = ['title', 'eventDate'] as const;

export interface TechTalkListItem {
  id: string;
  title: string;
  description: string | null;
  presenters: string[];
  tags: string[];
  eventDate: Date;
  slidesUrl: string | null;
  youtubeVideoId: string | null;
  status: TechTalkStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechTalk {
  id: string;
  title: string;
  description: string | null;
  presenters: string[];
  tags: string[];
  eventDate: Date;
  slidesUrl: string | null;
  youtubeVideoId: string | null;
  status: TechTalkStatus;
  createdBy: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTechTalkInput {
  title: string;
  description?: string;
  presenters: string[];
  tags?: string[];
  eventDate: string; // ISO date string from request body
  youtubeVideoId?: string;
  publishImmediately?: boolean;
}

export interface UpdateTechTalkInput {
  title?: string;
  description?: string;
  presenters?: string[];
  tags?: string[];
  eventDate?: string; // ISO date string
  youtubeVideoId?: string;
}

export interface TechTalkListQuery extends PaginationParams {
  search?: string;
  sort?: string;
  order?: string;
  status?: TechTalkStatus;
}

export interface PaginationMeta extends Required<PaginationParams> {
  total: number;
}