import type { TechTalk } from '@models/techTalk.types.js';

type TechTalkFixtureOverrides = Partial<
  Omit<TechTalk, 'eventDate' | 'createdAt' | 'updatedAt'>
> & {
  eventDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function createTechTalk(
  overrides: TechTalkFixtureOverrides = {}
): TechTalk {
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
  } as TechTalk;
}
