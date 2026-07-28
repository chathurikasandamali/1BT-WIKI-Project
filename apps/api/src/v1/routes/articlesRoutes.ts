import { Router } from 'express';
import multer from 'multer';
import ArticleController from '@controllers/articleController.js';
import LikeController from '@controllers/likeController.js';
import commentsRoutes from './commentsRoutes.js';
import { authenticate } from '@/middleware/auth.middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const articleController = new ArticleController();
const {
  create,
  listPublished,
  getById,
  update,
  submitForReview,
  remove,
  listMine,
} = articleController;

// POST /api/v1/articles — Create a new article as Draft
router.post('/', authenticate, upload.array('images'), create);

// GET /api/v1/articles — List published articles
router.get('/', authenticate, listPublished);

// GET /api/v1/articles/mine — List the authenticated user's own articles across all statuses
router.get('/mine', authenticate, listMine);

// GET /api/v1/articles/:id — View a single published article
router.get('/:id', authenticate, getById);

// PATCH /api/v1/articles/:id — Update an existing article
router.patch('/:id', authenticate, upload.array('images'), update);

// POST /api/v1/articles/:id/submit — Submit article for review (Draft -> Pending)
router.post('/:id/submit', authenticate, submitForReview);

// POST /api/v1/articles/:id/like — Like a published article (idempotent)
router.post('/:id/like', authenticate, LikeController.like);

// DELETE /api/v1/articles/:id/like — Unlike a previously liked article (idempotent)
router.delete('/:id/like', authenticate, LikeController.unlike);

// /api/v1/articles/:id/comments — Comments on an article
router.use('/:id/comments', commentsRoutes);

// DELETE /api/v1/articles/:id — Soft or hard delete an article
router.delete('/:id', authenticate, remove);

export default router;
