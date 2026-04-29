import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { logRefill, getMyRefillHistory } from '../controllers/refillController.js';

const router = express.Router();

router.use(protect);

router.post('/log', logRefill);
router.get('/my-history', getMyRefillHistory);

export default router;
