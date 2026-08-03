import { Router } from 'express';
import { E2eController } from '../controllers/e2eController.js';
import { authenticate } from '@/middleware/auth.middleware.js';

const router = Router();
const e2eController = new E2eController();

// DELETE /api/v1/e2e/articles/:id
router.delete('/articles/:id', authenticate, e2eController.deleteArticle);

export default router;
