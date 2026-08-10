import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '@/middleware/auth.middleware.js';
import { requireRole } from '@middleware/rbac.middleware.js';
import { TechTalkController } from '@controllers/techTalkController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const techTalkController = new TechTalkController();
const { create, publish, update, listPublished, getById, deleteTechTalk } = techTalkController;

router.get('/', authenticate, listPublished);
router.get('/:id', authenticate, getById);

router.post(
  '/',
  authenticate,
  requireRole('Admin'),
  upload.array('slides'),
  create
);

router.post('/:id/publish', authenticate, requireRole('Admin'), publish);

router.patch('/:id', authenticate, requireRole('Admin'), upload.single('slides'), update);

router.delete('/:id', authenticate, requireRole('Admin'), deleteTechTalk);

export default router;
