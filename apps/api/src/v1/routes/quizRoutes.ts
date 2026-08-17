import { Router } from 'express';
import quizController from '@controllers/quizController.js';
import { authenticate } from '@/middleware/auth.middleware.js';

const router = Router({ mergeParams: true });
const { generate, setFocusAspects, getFocusAspects, saveAsFallback, submit } = quizController;

// POST /api/v1/articles/:id/quiz/generate — Generate an AI quiz for a published article
router.post('/generate', authenticate, generate);

// GET /api/v1/articles/:id/quiz/focus-aspects — Author reads the saved quiz focus hint
router.get('/focus-aspects', authenticate, getFocusAspects);

// PUT /api/v1/articles/:id/quiz/focus-aspects — Author sets the reusable quiz focus hint
router.put('/focus-aspects', authenticate, setFocusAspects);

// POST /api/v1/articles/:id/quiz/:quizId/fallback — Author saves a reviewed quiz as the fallback
router.post('/:quizId/fallback', authenticate, saveAsFallback);

// POST /api/v1/articles/:id/quiz/:quizId/submit — Reader submits answers and gets graded results
router.post('/:quizId/submit', authenticate, submit);

export default router;
