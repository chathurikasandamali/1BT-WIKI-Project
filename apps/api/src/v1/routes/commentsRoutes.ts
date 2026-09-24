import { Router } from 'express';
import commentController from '@controllers/commentController.js';
import { authenticate } from '@/middleware/auth.middleware.js';

const router = Router({ mergeParams: true });
const { create, list, update, remove } = commentController;

// POST /api/v1/articles/:id/comments — Add a comment to a published article
router.post('/', authenticate, create);

// GET /api/v1/articles/:id/comments — List comments on a published article (or, for its own author, a non-Published article)
router.get('/', authenticate, list);

// PATCH /api/v1/articles/:id/comments/:commentId — Edit own comment
router.patch('/:commentId', authenticate, update);

// DELETE /api/v1/articles/:id/comments/:commentId — Delete own comment
router.delete('/:commentId', authenticate, remove);

export default router;
