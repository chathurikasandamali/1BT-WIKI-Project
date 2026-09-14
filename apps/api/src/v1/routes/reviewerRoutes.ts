import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware.js';
import { requireRole } from '@middleware/rbac.middleware.js';
import { ReviewerController } from '@controllers/reviewerController.js';
import { UserRoleValue } from '@/types/userTypes.js';

const router = Router();
const reviewerController = new ReviewerController();
const {
  listPending,
  approveArticle,
  rejectArticle,
  getArticleForReview,
  createComment,
  updateCommentStatus,
} = reviewerController;

router.get(
  '/articles/pending',
  authenticate,
  requireRole(UserRoleValue.Reviewer),
  listPending
);
router.get(
  '/articles/:id',
  authenticate,
  requireRole(UserRoleValue.Reviewer),
  getArticleForReview
);
router.get(
  '/approvals/:id',
  authenticate,
  requireRole(UserRoleValue.Reviewer),
  getArticleForReview
);
router.patch(
  '/articles/:id/approve',
  authenticate,
  requireRole(UserRoleValue.Reviewer),
  approveArticle
);
router.patch(
  '/articles/:id/reject',
  authenticate,
  requireRole(UserRoleValue.Reviewer),
  rejectArticle
);
router.post(
  '/approvals/:articleId/comments',
  authenticate,
  requireRole(UserRoleValue.Reviewer),
  createComment
);
router.patch(
  '/approvals/:articleId/comments/:commentId',
  authenticate,
  requireRole(UserRoleValue.Reviewer),
  updateCommentStatus
);

export default router;
