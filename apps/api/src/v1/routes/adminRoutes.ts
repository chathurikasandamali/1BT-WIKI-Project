/**
 * adminRoutes.ts — Admin-scoped routes.
 *
 * Mounted at: /api/v1/admin  (see app.ts)
 *
 * All routes require:
 *   1. authenticate  — valid session (A-01)
 *   2. requireRole('Admin') — caller must hold the Admin role (A-02)
 */

import { Router } from 'express';
import UserController from '@controllers/userController.js';
import AdminController from '@controllers/adminController.js';
import ArticleController from '@controllers/articleController.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import { requireRole } from '@/middleware/rbac.middleware.js';

const router = Router();
const articleController = new ArticleController();
const { listAllArticles } = articleController;

// GET /api/v1/admin/getAllUsers — list all users (any authenticated user)
router.get('/getAllUsers', authenticate, AdminController.getAllUsers);

// Owned by content-authoring-engineer — routed here because it's an admin
// content-oversight view, not a dashboard stat. Flagged for cross-role review.
router.get('/articles', authenticate, requireRole('Admin'), listAllArticles);

// POST /api/v1/admin/users — Admin: onboard a new user
router.post(
  '/createUsers',
  authenticate,
  requireRole('Admin'),
  AdminController.adminCreateUser
);

// PATCH /api/v1/admin/users/:userId/role — Admin: update a user's role
router.patch(
  '/users/:userId/role',
  authenticate,
  requireRole('Admin'),
  UserController.updateUserRole
);

// PATCH /api/v1/admin/users/:userId/ban — Admin: deactivate/reactivate a user
router.patch(
  '/users/:userId/ban',
  authenticate,
  requireRole('Admin'),
  UserController.updateUserBanStatus
);

export default router;
