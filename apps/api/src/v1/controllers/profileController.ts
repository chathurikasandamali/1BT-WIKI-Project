// apps/api/src/controllers/profileController.ts

import type { Request, Response, NextFunction } from 'express';
import ProfileService from '@services/profileService.js';
import { successResponse } from '@/types/userTypes.js';

// ---------------------------------------------------------------------------
// GET /api/v1/users/me
// ---------------------------------------------------------------------------

/**
 * Return the authenticated user's own profile.
 *
 * Requires: `authenticate` middleware upstream (sets req.user).
 *
 * Response: 200 { success: true, data: UserProfile }
 */
const getOwnProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.user is guaranteed to exist — authenticate middleware runs first
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.userId;

    const profile = await ProfileService.getProfile(userId);

    res.status(200).json(successResponse(profile));
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/me
// ---------------------------------------------------------------------------

/**
 * Update the authenticated user's own profile.
 *
 * Requires: `authenticate` middleware upstream (sets req.user).
 *
 * Response: 200 { success: true, data: UserProfile }
 */
const updateOwnProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.userId;

    const profile = await ProfileService.updateProfile(userId, req.body);

    res.status(200).json(successResponse(profile));
  } catch (error) {
    next(error);
  }
};

export default { getOwnProfile, updateOwnProfile };
