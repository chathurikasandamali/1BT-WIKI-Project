import type { Request, Response, NextFunction } from 'express';
import UserService from '@services/userService.js';
import { successResponse } from '@/types/userTypes.js';
import type { UserRole } from '@/types/userTypes.js';

const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role } = req.body as { role: unknown };

    const updatedUser = await UserService.updateUserRole(
      userId,
      role as UserRole
    );
    res
      .status(200)
      .json(successResponse(updatedUser, 'User role updated successfully'));
  } catch (error) {
    next(error);
  }
};

const updateUserBanStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { banned, banReason } = req.body as {
      banned: unknown;
      banReason: unknown;
    };

    const updatedUser = await UserService.updateUserBanStatus(userId, {
      banned: Boolean(banned),
      banReason: banReason != null ? String(banReason) : undefined,
    });

    const message = banned
      ? 'User deactivated successfully'
      : 'User reactivated successfully';
    res.status(200).json(successResponse(updatedUser, message));
  } catch (error) {
    next(error);
  }
};

export default { updateUserRole, updateUserBanStatus };
