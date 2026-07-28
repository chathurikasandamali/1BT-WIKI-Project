import { JSONContent } from '@tiptap/react';

export interface User {
  name: string;
  avatarUrl: string;
}

export interface Article {
  id: string;
  title: string;
  author: User;
  publishedAt: string;
  tags: string[];
  body: JSONContent;
  likeCount: number;
  likedByMe: boolean;
}

export const mockUser: User = {
  name: 'Jane Doe',
  avatarUrl: 'https://i.pravatar.cc/150?u=jane',
};

export const mockArticles: Record<string, Article> = {
  '1': {
    id: '1',
    title: 'The Future of Web Development',
    author: mockUser,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    tags: ['React', 'Next.js', 'Frontend'],
    body: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'The Future of Web Development' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Web development is constantly evolving. In this article, we explore the latest trends and practices...',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'A New Era' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'With the advent of Next.js App Router, the way we build React applications has fundamentally changed.',
            },
          ],
        },
      ],
    },
    likeCount: 42,
    likedByMe: false,
  },
};
