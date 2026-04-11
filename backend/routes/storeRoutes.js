import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getStores,
  createStore,
  updateStore,
  deleteStore
} from '../controllers/tenant/storeController.js';

const router = express.Router();

// Only TENANT_OWNER and SUPER_ADMIN should manage stores
router.use(protect);
router.use(admin);

router.route('/')
  .get(getStores)
  .post(createStore);

router.route('/:id')
  .put(updateStore)
  .delete(deleteStore);

export default router;
