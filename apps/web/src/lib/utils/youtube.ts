/**
 * Checks whether a value matches YouTube's 11-character video ID format.
 */
export function isValidYoutubeVideoId(value: string | null): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(value);
}
