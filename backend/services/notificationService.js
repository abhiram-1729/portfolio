import prisma from '../utils/prisma.js';
import { getIO } from './socketService.js';

/**
 * Send notification to specific users, roles, or vehicles.
 * @param {Object} params - Notification parameters
 * @param {string[]} params.userIds - List of User IDs
 * @param {string[]} params.roles - List of roles (ADMIN, SUPERVISOR, SALES_AGENT, etc.)
 * @param {string[]} params.vehicleIds - List of vehicle IDs
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message body
 * @param {string} params.type - Category (sales, inventory, cash, route, performance, system)
 * @param {string} params.priority - low | medium | high
 * @param {Object} params.metadata - Extra data
 * @param {boolean} params.isBroadcast - If true, sends to all users
 */
export const sendNotification = async ({
    userIds = [],
    roles = [],
    vehicleIds = [],
    title,
    message,
    type,
    priority = 'low',
    metadata = {},
    isBroadcast = false
}) => {
    try {
        let io;
        try {
          io = getIO();
        } catch (e) {
          console.warn('Socket.IO not initialized, skipping real-time emission');
        }

        // Define target user IDs
        let targetUserIds = new Set(userIds);
        
        // If roles/vehicles are specified, find corresponding users
        if (roles.length > 0 || vehicleIds.length > 0) {
            const users = await prisma.user.findMany({
                where: {
                    OR: [
                        { role: { in: roles } },
                        { assignedVehicleId: { in: vehicleIds } }
                    ]
                },
                select: { id: true }
            });
            users.forEach(u => targetUserIds.add(u.id));
        }

        // If it's a broadcast to all users
        if (isBroadcast) {
            const allUsers = await prisma.user.findMany({ select: { id: true } });
            allUsers.forEach(u => targetUserIds.add(u.id));
        }

        const targetArray = Array.from(targetUserIds);
        console.log(`[NotificationService] Sending "${title}" to ${targetArray.length} users. IDs: ${targetArray}`);
        
        if (targetArray.length === 0 && !isBroadcast) {
          console.log('No target users found for notification');
          return [];
        }

        // Prepare data for DB
        const notificationData = targetArray.map(targetId => ({
            userId: targetId,
            title,
            message,
            type,
            priority,
            metadata: metadata ? metadata : undefined
        }));

        // 1. Save to DB
        // Prisma doesn't return the IDs with createMany in all DBs (it does in Postgres)
        // For simplicity and immediate access to ID for socket emit, we might do it in a loop or use a transaction.
        // Given VSMS scale, a simple loop or Promise.all is fine for immediate feedback.
        
        const createdNotifications = await Promise.all(
          notificationData.map(data => prisma.notification.create({ data }))
        );

        // 2. Emit real-time events via socket
        if (io) {
            createdNotifications.forEach(notif => {
                io.to(`user:${notif.userId}`).emit('notification', {
                    id: notif.id,
                    title: notif.title,
                    message: notif.message,
                    type: notif.type,
                    priority: notif.priority,
                    metadata: notif.metadata,
                    createdAt: notif.createdAt,
                    isRead: notif.isRead
                });
            });

            // Additionally emit to role and vehicle rooms for blanket updates (optional)
            roles.forEach(role => io.to(`role:${role}`).emit('role_notification', { title, message, type }));
            vehicleIds.forEach(vId => io.to(`vehicle:${vId}`).emit('vehicle_notification', { title, message, type }));
        }

        // 3. TODO: Push Notification (FCM) Fallback
        // This would involve fetching FCM tokens and sending via firebase-admin

        return createdNotifications;
    } catch (error) {
        console.error('Error sending notification:', error);
        // Don't throw if it's not critical, but here we might want to know
        return [];
    }
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (notificationId) => {
    return await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
    });
};

/**
 * Mark all user notifications as read
 */
export const markAllAsRead = async (userId) => {
    return await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
    });
};

/**
 * Get user notifications with infinite scroll support
 */
export const getUserNotifications = async (userId, limit = 20, page = 1) => {
    const skip = (page - 1) * limit;
    return await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip
    });
};
