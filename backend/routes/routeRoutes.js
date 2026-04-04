import express from 'express';
import { getTodayPlan, getTomorrowPlan } from '../controllers/routeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/today-plan', protect, getTodayPlan);
router.get('/tomorrow-plan', protect, getTomorrowPlan);

export default router;
