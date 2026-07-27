import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { requireRole } from '@middleware/rbac.middleware.js';
import { ReviewerController } from '@controllers/reviewerController.js';

const router = Router();
const reviewerController = new ReviewerController();
const { listPending, approveArticle, rejectArticle, getArticleForReview } = reviewerController;

router.get(
  '/articles/pending',
  authenticate,
  requireRole('Reviewer', 'Admin'),
  listPending
);
router.get(
  '/articles/:id',
  authenticate,
  requireRole('Reviewer', 'Admin'),
  getArticleForReview
);
router.patch(
  '/articles/:id/approve',
  authenticate,
  requireRole('Reviewer', 'Admin'),
  approveArticle
);
router.patch(
  '/articles/:id/reject',
  authenticate,
  requireRole('Reviewer', 'Admin'),
  rejectArticle
);

export default router;
