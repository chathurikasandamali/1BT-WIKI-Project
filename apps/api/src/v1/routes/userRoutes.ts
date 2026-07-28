// apps/api/src/routes/userRoutes.ts
//
// Mounted at: /api/v1/users  (see app.ts)

import { Router } from 'express';
import UserController from '@controllers/userController.js';
import ProfileController from '@controllers/profileController.js';
// authenticate is Lahiru's middleware (src/middleware/auth.middleware.ts).
// A stub exists at that path until his PR lands — do NOT modify that file.
import { authenticate } from '@/middleware/auth.middleware.js';

const router = Router();

// GET /api/v1/users/me — authenticated user's own profile (UP-01)
router.get('/me', authenticate, ProfileController.getOwnProfile);

// PATCH /api/v1/users/me — update authenticated user's own profile (UP-02)
router.patch('/me', authenticate, ProfileController.updateOwnProfile);

export default router;
