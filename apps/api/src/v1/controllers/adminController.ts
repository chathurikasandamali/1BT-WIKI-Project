import type { Request, Response, NextFunction } from 'express';
import adminService from '@services/adminService.js';
import { successResponse } from '@/types/userTypes.js';
import type { UserRole } from '@/types/userTypes.js';

// ---------------------------------------------------------------------------
// GET /api/v1/users
// ---------------------------------------------------------------------------

/** List all users in the system. */
const getAllUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await adminService.getAllUsers();
    res.status(200).json(successResponse(users));
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/admin/users  (Admin only)
// ---------------------------------------------------------------------------

/**
 * Admin: onboard a new user into the system.
 *
 * Expected body:
 * {
 *   "name":  "string"             — required
 *   "email": "string"             — required
 *   "role":  "Admin|Reviewer|User" — optional, defaults to "User"
 *   "image": "string (URL)"       — optional
 * }
 */
const adminCreateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, role, image } = req.body as {
      name: unknown;
      email: unknown;
      role: unknown;
      image: unknown;
    };

    const newUser = await adminService.adminCreateUser({
      name: String(name ?? ''),
      email: String(email ?? ''),
      role: role ? (String(role) as UserRole) : undefined,
      image: image ? String(image) : undefined,
    });

    res.status(201).json(successResponse(newUser, 'User created successfully'));
  } catch (error) {
    next(error);
  }
};

export default { getAllUsers, adminCreateUser };
