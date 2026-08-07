export type TechTalkStatus = 'draft' | 'published' | 'unpublished';

export const TechTalkStatusValue = {
  Draft: 'draft',
  Published: 'published',
  Unpublished: 'unpublished',
} as const satisfies Record<'Draft' | 'Published' | 'Unpublished', TechTalkStatus>;

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
