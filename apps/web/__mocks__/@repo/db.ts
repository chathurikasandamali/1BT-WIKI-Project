export const TechTalkStatus = {
  draft: 'draft',
  published: 'published',
  unpublished: 'unpublished',
} as const;

export type TechTalkStatus = (typeof TechTalkStatus)[keyof typeof TechTalkStatus];

export const prisma = {};
export default prisma;
