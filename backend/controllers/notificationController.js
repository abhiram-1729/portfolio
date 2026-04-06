import prisma from '../utils/prisma.js';
import { sendNotification } from '../services/notificationService.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req, res, next) => {
    try {
        console.log(`[DEBUG] Fetching notifications for user: ${req.user?.id}`);
        const limit = Number(req.query.limit) || 20;
        const page = Number(req.query.page) || 1;
        const skip = Math.max(0, (page - 1) * limit);



        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: skip

        });

        const total = await prisma.notification.count({
            where: { userId: req.user.id }
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: req.user.id, isRead: false }
        });

        res.json({
            notifications,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            },
            unreadCount
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markRead = async (req, res, next) => {
    try {
        const notification = await prisma.notification.findUnique({
            where: { id: req.params.id }
        });

        if (!notification) {
            res.status(404);
            throw new Error('Notification not found');
        }

        if (notification.userId !== req.user.id) {
            res.status(403);
            throw new Error('Not authorized to mark this notification as read');
        }

        const updated = await prisma.notification.update({
            where: { id: req.params.id },
            data: { isRead: true }
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllRead = async (req, res, next) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        next(error);
    }
};

// @desc    Send broadcast notification
// @route   POST /api/notifications/broadcast
// @access  Private/Admin
export const broadcastNotification = async (req, res, next) => {
    try {
        const { title, message, type, priority, roles, vehicleIds, isBroadcast } = req.body;

        const results = await sendNotification({
            title,
            message,
            type: type || 'system',
            priority: priority || 'medium',
            roles,
            vehicleIds,
            isBroadcast: isBroadcast || false,
            metadata: { sender: req.user.id, senderName: req.user.name }
        });

        res.status(201).json({
            message: 'Broadcast sent successfully',
            count: results.length
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update FCM Token
// @route   POST /api/notifications/fcm-token
// @access  Private
export const updateFCMToken = async (req, res, next) => {
    try {
        const { token } = req.body;
        
        await prisma.user.update({
            where: { id: req.user.id },
            data: { fcmToken: token }
        });

        res.json({ message: 'FCM token updated successfully' });
    } catch (error) {
        next(error);
    }
};
