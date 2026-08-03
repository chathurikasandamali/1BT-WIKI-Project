import { Router } from 'express';
import userRoutes from './userRoutes.js';
import adminRoutes from './adminRoutes.js';
import articlesRoutes from './articlesRoutes.js';
import notificationsRoutes from './notificationsRoutes.js';
import reviewerRoutes from './reviewerRoutes.js';
import pusherRoutes from './pusherRoutes.js';
import e2eRoutes from './e2eRoutes.js';

const router = Router();
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/articles', articlesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reviewer', reviewerRoutes);
router.use('/pusher', pusherRoutes);

if (
  process.env.NODE_ENV === 'test' &&
  process.env.E2E_TEST_MODE === 'true' &&
  process.env.E2E_DATABASE_CONFIRMED === 'true'
) {
  router.use('/e2e', e2eRoutes);
}

export default router;
