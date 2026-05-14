import prisma from '../../utils/prisma.js';

// @desc    Get all activity logs with filtering
// @route   GET /api/admin/activities
// @access  Admin
export const getActivityLogs = async (req, res, next) => {
    try {
        const { userId, action, startDate, endDate, storeId, limit = 100, skip = 0 } = req.query;

        const where = {
            tenantId: req.user.tenantId,
            ...(userId && { userId }),
            ...(action && { action }),
            ...(storeId && storeId !== 'null' && storeId !== 'undefined' && { storeId }),
            ...(startDate || endDate ? {
                createdAt: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) })
                }
            } : {})
        };

        // If user has a store assigned and is not a tenant owner, restrict to their store
        if (req.user.storeId) {
            const isGlobal = 
                ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
                req.user.customRole?.portalType === 'ADMIN';
                
            if (!isGlobal) {
                where.storeId = req.user.storeId;
            }
        }

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, role: true } },
                    store: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(skip)
            }),
            prisma.activityLog.count({ where })
        ]);

        res.json({
            logs,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    } catch (error) {
        next(error);
    }
};
