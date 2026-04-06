import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getMyPerformance,
  getMyHistory,
  getMyMonthlySummary,
  getLeaderboardHandler,
  getAllPerformance,
  getAgentPerformance,
  getMonthlyReport,
  getConfig,
  updateConfig,
  forceRecalculate,
  triggerEndOfDay,
  triggerMonthlySummary,
} from '../controllers/vgeController.js';

const router = express.Router();

// ─── Agent Routes ────────────────────────────
router.get('/my-performance', protect, getMyPerformance);
router.get('/my-history', protect, getMyHistory);
router.get('/my-monthly', protect, getMyMonthlySummary);
router.get('/leaderboard', protect, getLeaderboardHandler);

// ─── Admin Routes ────────────────────────────
router.get('/admin/all-performance', protect, admin, getAllPerformance);
router.get('/admin/agent/:userId', protect, admin, getAgentPerformance);
router.get('/admin/monthly-report', protect, admin, getMonthlyReport);
router.get('/admin/config', protect, admin, getConfig);
router.put('/admin/config', protect, admin, updateConfig);
router.post('/admin/recalculate', protect, admin, forceRecalculate);
router.post('/admin/end-of-day', protect, admin, triggerEndOfDay);
router.post('/admin/generate-monthly', protect, admin, triggerMonthlySummary);

export default router;
