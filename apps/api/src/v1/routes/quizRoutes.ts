import { Router } from 'express';
import quizController from '@controllers/quizController.js';
import { authenticate } from '@/middleware/auth.middleware.js';

const router = Router({ mergeParams: true });
const { generate } = quizController;

// POST /api/v1/articles/:id/quiz/generate — Generate an AI quiz for a published article
router.post('/generate', authenticate, generate);

export default router;
