import express from 'express';
import {
    getTodayPlan,
    getTomorrowPlan,
    markCoverage,
    getCoverageStatus,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from '../controllers/routeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/today-plan', protect, getTodayPlan);
router.get('/tomorrow-plan', protect, getTomorrowPlan);
router.get('/coverage-status', protect, getCoverageStatus);
router.post('/mark-coverage', protect, markCoverage);

// Notifications
router.get('/notifications', protect, getNotifications);
router.post('/notifications/read-all', protect, markAllNotificationsRead);
router.post('/notifications/:id/read', protect, markNotificationRead);

export default router;
