export type TechTalkStatus = 'draft' | 'published' | 'unpublished';

export const TechTalkStatusValue = {
  Draft: 'draft',
  Published: 'published',
  Unpublished: 'unpublished',
} as const satisfies Record<'Draft' | 'Published' | 'Unpublished', TechTalkStatus>;

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
