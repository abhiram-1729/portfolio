import express from 'express';
import { 
    getMyNotifications, 
    markRead, 
    markAllRead, 
    broadcastNotification, 
    updateFCMToken 
} from '../controllers/notificationController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getMyNotifications);

router.route('/read-all')
    .put(protect, markAllRead);

router.route('/:id/read')
    .put(protect, markRead);

router.route('/broadcast')
    .post(protect, admin, broadcastNotification);

router.route('/fcm-token')
    .post(protect, updateFCMToken);

export default router;
