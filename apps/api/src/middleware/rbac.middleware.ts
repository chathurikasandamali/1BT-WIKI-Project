// apps/api/src/middleware/rbac.middleware.ts

import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@/types/userTypes.js';
import { errorResponse } from '@/types/userTypes.js';

// ---------------------------------------------------------------------------
// RBAC middleware factory
// ---------------------------------------------------------------------------

/**
 * Middleware factory that restricts access to users whose role is in the
 * provided list. Must be placed AFTER the `authenticate` middleware in the
 * middleware chain (authenticate populates req.user first).
 *
 * Usage:
 *   router.get('/admin/users', authenticate, requireRole('Admin'), controller.method);
 *   router.get('/review',      authenticate, requireRole('Reviewer', 'Admin'), controller.method);
 *
 * Response on failure:
 *   403 { success: false, error: 'Insufficient permissions' }
 */
export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole as UserRole)) {
      res.status(403).json(errorResponse('Insufficient permissions'));
      return;
    }

    next();
  };
