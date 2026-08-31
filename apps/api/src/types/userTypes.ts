/**
 * User domain types for 1BT WIKI.
 * Matches the exact neon_auth.user table schema.
 */

// ---------------------------------------------------------------------------
// Domain enums / unions
// ---------------------------------------------------------------------------

export type UserRole = 'Admin' | 'Reviewer' | 'User';

export const UserRoleValue = {
  Admin: 'Admin',
  Reviewer: 'Reviewer',
  User: 'User',
} as const satisfies Record<UserRole, UserRole>;

/**
 * Normalize a raw DB role string to the app's capitalized UserRole convention.
 * Falls back to 'User' if the input is null/undefined/empty.
 */
export function capitalizeRole(raw: string | null | undefined): UserRole {
  const safe = raw || 'user';
  return (safe.charAt(0).toUpperCase() + safe.slice(1)) as UserRole;
}

// ---------------------------------------------------------------------------
// Entity interfaces — mirrors neon_auth.user columns exactly
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string | null;
  isActive: boolean;
  createdAt: Date;
}

/** Full user row as stored in neon_auth.user */
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
}

// ---------------------------------------------------------------------------
// Profile — outward-facing safe shape returned by GET /api/v1/users/me
// ---------------------------------------------------------------------------

/**
 * Safe profile object returned to the authenticated user.
 * Derived from neon_auth.user — no sensitive internal fields exposed.
 *
 * Field mappings from DB columns:
 *   image   → avatarUrl   (domain alias)
 *   !banned → isActive    (inverted; null banned treated as active)
 */
export interface UserProfile {
  id: string;
  name: string;
  /** Read-only — managed by Google / Neon Auth; never editable */
  email: string;
  avatarUrl: string | null;
  role: string | null;
  isActive: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Auth — shape of req.user populated by Lahiru's authenticate middleware
// ---------------------------------------------------------------------------

/** Payload attached to req.user by src/middleware/auth.middleware.ts */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Input / payload interfaces
// ---------------------------------------------------------------------------

/**
 * Body expected by PATCH /api/v1/users/me.
 * Contains optional fields that a user can update.
 */
export interface ProfileUpdateInput {
  name?: string;
  avatarUrl?: string | null;
  contactDetails?: string;
}

/**
 * Body expected by POST /api/v1/admin/users.
 * Only the fields an admin can set when onboarding a new user.
 */
export interface CreateUserInput {
  /** Display name */
  name: string;
  /** Unique login email */
  email: string;
  /**
   * Role to assign. Defaults to 'User' in the service layer.
   * Accepted values: 'Admin' | 'Reviewer' | 'User'
   */
  role?: UserRole;
  /** Optional profile picture URL */
  image?: string;
}

export interface UpdateUserRoleInput {
  role: UserRole;
}

export interface UpdateUserBanInput {
  /** Set to true to deactivate the account, false to reactivate */
  banned: boolean;
  /** Required when banning a user, optional when reactivating */
  banReason?: string | null;
}

// ---------------------------------------------------------------------------
// Standard API response envelope (re-usable across controllers)
// ---------------------------------------------------------------------------

export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** Build a successful response envelope. */
export const successResponse = <T>(
  data: T,
  message?: string
): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

/** Build an error response envelope. */
export const errorResponse = (error: string): ApiResponse => ({
  success: false,
  error,
});
