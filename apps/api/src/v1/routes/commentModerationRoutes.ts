/**
 * commentModerationRoutes.ts — Admin moderation of pending comments.
 *
 * Mounted at: /api/v1/admin/comments  (see routes/index.ts)
 *
 * All routes require:
 *   1. authenticate       — valid session
 *   2. requireRole('Admin') — caller must hold the Admin role
 *
 * Kept as its own top-level route file (mirroring reviewerRoutes.ts) rather
 * than folded into adminRoutes.ts, since comments are owned by the
 * engagement-engineer role while admin/dashboard is owned by
 * analytics-dashboard-engineer.
 */

import { Router } from 'express';
import commentController from '@controllers/commentController.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import { requireRole } from '@/middleware/rbac.middleware.js';

const router = Router();
const { listPending, approve, reject } = commentController;

// GET /api/v1/admin/comments/pending — List comments awaiting approval
router.get('/pending', authenticate, requireRole('Admin'), listPending);

// PATCH /api/v1/admin/comments/:commentId/approve — Approve a pending comment
router.patch('/:commentId/approve', authenticate, requireRole('Admin'), approve);

// PATCH /api/v1/admin/comments/:commentId/reject — Reject a pending comment
router.patch('/:commentId/reject', authenticate, requireRole('Admin'), reject);

export default router;
