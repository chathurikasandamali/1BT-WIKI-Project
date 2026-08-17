export type PreviewKind = 'article' | 'tech-talk';

export interface PreviewItem {
  id: string;
  kind: PreviewKind;
  label: string;
  title: string;
  excerpt: string;
  panelTitle: string;
  panelDescription: string;
  tags: string[];
  meta: string;
}

export const PREVIEW_ITEMS: PreviewItem[] = [
  {
    id: 'article-reliable-apis',
    kind: 'article',
    label: 'ARTICLE',
    title: 'Building reliable APIs',
    excerpt:
      'Practical patterns for services that are easier to grow and maintain.',
    panelTitle: 'Practical knowledge, written by the people building it',
    panelDescription:
      'Explore engineering guides, development practices and lessons shared by the 1BT community.',
    tags: ['Engineering', 'APIs', 'Best practices'],
    meta: 'Practical guide',
  },
  {
    id: 'tech-talk-cloud-lessons',
    kind: 'tech-talk',
    label: 'TECH TALK',
    title: 'Lessons from the cloud',
    excerpt:
      'Team experiences and technical decisions, explained by the people behind them.',
    panelTitle: 'Learn from the people doing the work',
    panelDescription:
      'Discover technical sessions, team experiences and knowledge-sharing talks presented by the 1BT community.',
    tags: ['Cloud', 'Architecture', 'Team stories'],
    meta: 'Community session',
  },
  {
    id: 'article-clean-frontend',
    kind: 'article',
    label: 'ARTICLE',
    title: 'Cleaner frontend systems',
    excerpt:
      'Approachable notes on components, accessibility and resilient interfaces.',
    panelTitle: 'Practical knowledge, written by the people building it',
    panelDescription:
      'Explore engineering guides, development practices and lessons shared by the 1BT community.',
    tags: ['Frontend', 'Accessibility', 'Design systems'],
    meta: 'Engineering notes',
  },
  {
    id: 'tech-talk-data-decisions',
    kind: 'tech-talk',
    label: 'TECH TALK',
    title: 'Better decisions with data',
    excerpt:
      'Short sessions that turn real project experience into shared understanding.',
    panelTitle: 'Learn from the people doing the work',
    panelDescription:
      'Discover technical sessions, team experiences and knowledge-sharing talks presented by the 1BT community.',
    tags: ['Data', 'Delivery', 'Knowledge sharing'],
    meta: 'Recorded talk',
  },
];

const firstPreviewByKind = new Map<PreviewKind, PreviewItem>();
for (const item of PREVIEW_ITEMS) {
  if (!firstPreviewByKind.has(item.kind)) {
    firstPreviewByKind.set(item.kind, item);
  }
}

export function findFirstPreview(kind: PreviewKind): PreviewItem {
  const fallbackPreview = PREVIEW_ITEMS[0];

  if (!fallbackPreview) {
    throw new Error('At least one landing preview is required.');
  }

  return firstPreviewByKind.get(kind) ?? fallbackPreview;
}
