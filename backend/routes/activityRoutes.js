import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

// @desc    Get current user's activity logs
// @route   GET /api/activities/my
// @access  Private
router.get('/my', protect, async (req, res, next) => {
    try {
        const { limit = 50, skip = 0 } = req.query;

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: {
                    OR: [
                        { userId: req.user.id },
                        { targetUserId: req.user.id }
                    ],
                    tenantId: req.user.tenantId
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(skip)
            }),
            prisma.activityLog.count({
                where: {
                    OR: [
                        { userId: req.user.id },
                        { targetUserId: req.user.id }
                    ],
                    tenantId: req.user.tenantId
                }
            })
        ]);

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    } catch (error) {
        console.error('[ActivityRoutes Error]', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error fetching activity logs',
          error: error.message 
        });
    }
});

export default router;
