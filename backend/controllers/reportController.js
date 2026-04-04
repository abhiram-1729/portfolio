import prisma from '../utils/prisma.js';

// @desc    Get today's sales report for the agent
// @route   GET /api/reports/today
// @access  Private
export const getTodayReport = async (req, res, next) => {
    try {
        const agentId = req.query.agentId || req?.user?.id;
        if (!agentId) {
            res.status(400);
            throw new Error('Agent ID is required');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const agent = await prisma.user.findUnique({
            where: { id: agentId },
            select: { dailyTarget: true },
        });

        const orders = await prisma.order.findMany({
            where: {
                agentId: agentId,
                status: 'COMPLETED',
                createdAt: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            include: {
                items: true,
            },
        });

        const totalOrders = orders.length;
        const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        const cashSales = orders.filter(o => o.paymentMode === 'CASH').reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        const upiSales = orders.filter(o => o.paymentMode === 'UPI').reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        const cardSales = orders.filter(o => o.paymentMode === 'CARD').reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

        const totalProfit = orders.reduce((sum, order) => {
            const orderProfit = order.items.reduce((itemSum, item) => {
                return itemSum + ((Number(item.price || 0) - Number(item.landingPrice || 0)) * (item.quantity || 0));
            }, 0);
            return sum + orderProfit;
        }, 0);

        res.json({
            date: today.toISOString().split('T')[0],
            totalOrders,
            totalSales,
            totalProfit,
            dailyTarget: agent?.dailyTarget || 10000,
            paymentBreakdown: {
                cash: cashSales,
                upi: upiSales,
                card: cardSales,
            },
        });
    } catch (error) {
        console.error('[TodayReport] CRASH:', error);
        next(error);
    }
};

// @desc    Get report for a specific date
// @route   GET /api/reports/date
// @access  Private
export const getDateReport = async (req, res, next) => {
    try {
        const { date } = req.query;
        const agentId = req.query.agentId || req.user.id;

        if (!date) {
            res.status(400);
            throw new Error('Date query parameter is required (YYYY-MM-DD)');
        }

        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        const agent = await prisma.user.findUnique({
            where: { id: agentId },
            select: { dailyTarget: true },
        });

        const orders = await prisma.order.findMany({
            where: {
                agentId: agentId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            include: {
                items: true,
            },
        });

        const totalOrders = orders.length;
        const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        const cashSales = orders.filter(o => o.paymentMode === 'CASH').reduce((sum, o) => sum + o.totalAmount, 0);
        const upiSales = orders.filter(o => o.paymentMode === 'UPI').reduce((sum, o) => sum + o.totalAmount, 0);
        const cardSales = orders.filter(o => o.paymentMode === 'CARD').reduce((sum, o) => sum + o.totalAmount, 0);

        const totalProfit = orders.reduce((sum, order) => {
            const orderProfit = order.items.reduce((itemSum, item) => {
                return itemSum + ((item.price - (item.landingPrice || 0)) * item.quantity);
            }, 0);
            return sum + orderProfit;
        }, 0);

        res.json({
            date: date,
            totalOrders,
            totalSales,
            totalProfit,
            dailyTarget: agent?.dailyTarget || 10000,
            paymentBreakdown: {
                cash: cashSales,
                upi: upiSales,
                card: cardSales,
            },
        });
    } catch (error) {
        next(error);
    }
};
