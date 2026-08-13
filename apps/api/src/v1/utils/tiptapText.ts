/**
 * Plain-text extraction from TipTap JSONContent.
 *
 * NOTE: TipTap parsing belongs to content-authoring-engineer; this minimal
 * extractor exists because no shared `extractTextFromTipTap` utility does yet.
 * Flagged for their review — if they ship one, delete this and import theirs.
 */

import type { JSONContent } from '@models/article.types.js';

const BLOCK_NODE_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'listItem',
  'tableRow',
]);

const collectText = (node: JSONContent, parts: string[]): void => {
  if (typeof node.text === 'string') {
    parts.push(node.text);
  }

  const content = node.content;
  if (Array.isArray(content)) {
    for (const child of content) {
      if (typeof child === 'object' && child !== null) {
        collectText(child as JSONContent, parts);
      }
    }
  }

  if (typeof node.type === 'string' && BLOCK_NODE_TYPES.has(node.type)) {
    parts.push('\n');
  }
};

/**
 * Flattens a TipTap document into whitespace-normalized plain text
 * suitable for feeding to an LLM prompt.
 */
export const extractTextFromTipTap = (body: JSONContent): string => {
  const parts: string[] = [];
  collectText(body, parts);

  return parts
    .join(' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
};
