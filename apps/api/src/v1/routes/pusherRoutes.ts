// apps/api/src/v1/routes/pusherRoutes.ts
//
// Mounted at: /api/v1/pusher  (see v1/routes/index.ts)

import { Router } from 'express';
import PusherController from '@controllers/pusherController.js';
import { authenticate } from '@/middleware/auth.middleware.js';

const router = Router();

const { auth } = PusherController;

// POST /api/v1/pusher/auth — private channel authentication
// pusher-js calls this endpoint when subscribing to a private-user-{id} channel.
router.post('/auth', authenticate, auth);

export default router;
