import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '@/middleware/auth.middleware.js';
import { requireRole } from '@middleware/rbac.middleware.js';
import { TechTalkController } from '@controllers/techTalkController.js';
import { UserRoleValue } from '@/types/userTypes.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const techTalkController = new TechTalkController();
const { create, publish, unpublish, update, listPublished, listAll, getById, deleteTechTalk } = techTalkController;

router.get('/', authenticate, listPublished);
router.get('/listAll', authenticate, requireRole(UserRoleValue.Admin), listAll);
router.get('/:id', authenticate, getById);

router.post(
  '/',
  authenticate,
  requireRole(UserRoleValue.Admin),
  upload.array('slides'),
  create
);

router.post('/:id/publish', authenticate, requireRole(UserRoleValue.Admin), publish);

router.post('/:id/unpublish', authenticate, requireRole(UserRoleValue.Admin), unpublish);

router.patch('/:id', authenticate, requireRole(UserRoleValue.Admin), upload.single('slides'), update);

router.delete('/:id', authenticate, requireRole(UserRoleValue.Admin), deleteTechTalk);

export default router;
