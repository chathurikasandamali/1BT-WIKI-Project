/**
 * Plain-text extraction from a TipTap JSON content document.
 *
 * Re-exports the canonical `extractTextFromTipTap` from `@repo/shared` so the
 * article validation and the AI quiz generator share a single implementation
 * with the frontend. Consumers keep importing from here to keep the public
 * name stable.
 */

import {
  extractTextFromTipTap as sharedExtractTextFromTipTap,
  type TipTapJsonContent,
} from '@repo/shared';
import type { JSONContent } from '@models/article.types.js';

/**
 * Flattens a TipTap document into whitespace-normalized plain text
 * suitable for validation and for feeding to an LLM prompt.
 */
export const extractTextFromTipTap = (
  body: JSONContent
): string => sharedExtractTextFromTipTap(body as TipTapJsonContent);
