import { authClient } from '@/lib/auth/client';

/**
 * ⚠️ ARCHITECTURE FLAG (Malindu/Lahiru)
 * This file belongs to the frontend consumer domain (e.g., admin dashboard, articles).
 * It integrates with the shared Auth infrastructure, but note that the core
 * `lib/auth/client.ts` is strictly untouched here.
 *
 * JWT cache is stored exclusively in-memory (module scope) per the project's
 * security requirements (NO localStorage/sessionStorage is used).
 */

const API_BASE_URL = `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000'}/api/v1`;

// In-memory cache for the JWT and its decoded expiration timestamp.
// We use module scope instead of React Context because it is much simpler,
// keeps the token out of the React tree entirely, and allows `apiFetch`
// to be easily imported and used in non-React utility functions if needed.
let cachedToken: string | null = null;
let cachedTokenExpiry: number | null = null;

/**
 * Decodes the JWT payload to extract the `exp` claim.
 * We ONLY extract `exp` (in seconds). We strictly do NOT trust or read
 * `role` or `email` from the JWT here — the backend resolves roles via its own DB lookup.
 */
function decodeJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64Url decode the payload (parts[1] is guaranteed by the length check above)
    const payloadBase64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(payloadBase64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload) as { exp?: number };
    return payload.exp ?? null;
  } catch (error) {
    console.error('[API Client] Failed to decode JWT expiry:', error);
    return null;
  }
}

/**
 * Checks whether a string looks like a JWT (exactly 3 non-empty dot-separated parts).
 */
function isJwtShaped(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

/**
 * Fetches a valid JWT token.
 * Uses an in-memory cache, ensuring we have a safety buffer (60s) before expiry
 * to avoid returning a token that is just about to expire, AND specifically
 * to step around the @neondatabase/auth 60s session cache window.
 *
 * On cold page loads the SDK's 60s session cache may cause authClient.token()
 * to return non-JWT data (e.g. an opaque session token from a getSession() call
 * made by another component like UserAvatar). We defend against this by
 * validating JWT shape and retrying up to 3 times with a short backoff.
 */
export async function getValidToken(forceRefresh = false): Promise<string> {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const BUFFER_SECONDS = 60; // Deliberately >= SDK's 60s session cache window

  if (!forceRefresh && cachedToken && cachedTokenExpiry) {
    const secondsUntilExpiry = cachedTokenExpiry - nowInSeconds;
    if (secondsUntilExpiry > BUFFER_SECONDS) {
      return cachedToken;
    }
  }

  // Cache is missing, stale, or forced to refresh. Fetch a new token.
  // Retry up to MAX_ATTEMPTS times with backoff to handle SDK session-cache collisions.
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAYS_MS = [400, 800]; // delays before attempt 2 and 3

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await authClient.token();

    if (result.error) {
      throw new Error(
        `Failed to fetch auth token: ${result.error.message || JSON.stringify(result.error)}`
      );
    }

    const tokenStr = result.data?.token;

    if (tokenStr && isJwtShaped(tokenStr)) {
      const expiry = decodeJwtExpiry(tokenStr);

      if (!expiry) {
        throw new Error('Failed to parse expiry from the retrieved JWT');
      }

      // Update in-memory cache
      cachedToken = tokenStr;
      cachedTokenExpiry = expiry;
      return cachedToken;
    }

    // Token missing or not JWT-shaped — retry if attempts remain
    if (attempt < MAX_ATTEMPTS) {
      const delay = RETRY_DELAYS_MS[attempt - 1];
      console.warn(
        `[API Client] Token fetch returned non-JWT data, retrying (attempt ${attempt + 1}/${MAX_ATTEMPTS} in ${delay}ms)...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All attempts exhausted
  throw new Error(
    'No valid JWT returned from auth client after ' +
      MAX_ATTEMPTS +
      ' attempts (SDK session-cache collision likely — try again in ~60s)'
  );
}

/**
 * Common response envelope from the Express backend.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * A fetch wrapper that automatically attaches the JWT and handles 401 retries.
 *
 * When the request body is FormData, the Content-Type header is NOT set —
 * the browser must set it automatically with the correct multipart boundary.
 * For all other request bodies, Content-Type defaults to application/json
 * if not already set by the caller.
 *
 * @param path The API path (e.g. '/users/me'). Should start with a slash.
 * @param options Standard fetch options.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Normalize path format
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  // FormData guard: let the browser set Content-Type with boundary for multipart
  const isFormData = options.body instanceof FormData;

  // 1. Initial attempt
  let token = await getValidToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, { ...options, headers });

  // 2. Handle 401 Unauthorized -> Retry exactly once
  if (response.status === 401) {
    console.warn(
      '[API Client] 401 Unauthorized encountered. Forcing token refresh and retrying once.'
    );

    // Clear cache and force a fresh fetch from the auth client
    cachedToken = null;
    cachedTokenExpiry = null;
    token = await getValidToken(true);

    const retryHeaders = new Headers(options.headers);
    retryHeaders.set('Authorization', `Bearer ${token}`);
    if (!isFormData && !retryHeaders.has('Content-Type')) {
      retryHeaders.set('Content-Type', 'application/json');
    }

    response = await fetch(url, { ...options, headers: retryHeaders });

    if (response.status === 401) {
      throw new Error('Authentication failed (401) even after token refresh.');
    }
  }

  // 3. Parse JSON envelope
  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new Error(`Failed to parse JSON response from ${normalizedPath}`);
  }

  // 4. Surface explicit backend errors if the envelope says success: false
  if (!json.success && json.error) {
    throw new Error(json.error);
  }

  return json;
}
