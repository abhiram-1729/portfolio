import express from 'express';
import { getTodayReport, getDateReport } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/today', protect, getTodayReport);
router.get('/date', protect, getDateReport);

export default router;
