import prisma from '../utils/prisma.js';
import { format } from 'date-fns';

// @desc    Submit opening cash for a vehicle
// @route   POST /api/cash/opening
// @access  Private
export const submitOpeningCash = async (req, res, next) => {
    try {
        const { vehicleId, denominations, totalOpeningCash } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (!vehicleId || !denominations || totalOpeningCash === undefined) {
            res.status(400);
            throw new Error('Vehicle ID, denominations, and total are required');
        }

        const openingCash = await prisma.openingCash.upsert({
            where: {
                vehicleId_date: {
                    vehicleId,
                    date: dateString,
                },
            },
            update: {
                denominations,
                totalOpeningCash,
                userId,
            },
            create: {
                vehicleId,
                userId,
                date: dateString,
                denominations,
                totalOpeningCash,
            },
        });

        // Also update or create daily summary
        await prisma.dailyCashSummary.upsert({
            where: {
                vehicleId_date: {
                    vehicleId,
                    date: dateString,
                },
            },
            update: {
                openingCash: totalOpeningCash,
                expectedCash: totalOpeningCash, // Initial expected is just opening
            },
            create: {
                vehicleId,
                date: dateString,
                openingCash: totalOpeningCash,
                expectedCash: totalOpeningCash,
            },
        });

        res.status(201).json(openingCash);
    } catch (error) {
        next(error);
    }
};

// @desc    Submit closing cash for a vehicle
// @route   POST /api/cash/closing
// @access  Private
export const submitClosingCash = async (req, res, next) => {
    try {
        const { vehicleId, actualCash, denominations, remark } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        // 1. Get Opening Cash and calculate Cash Sales
        const summary = await prisma.dailyCashSummary.findUnique({
            where: {
                vehicleId_date: {
                    vehicleId,
                    date: dateString,
                },
            },
        });

        if (!summary) {
            res.status(400);
            throw new Error('Opening cash must be submitted first');
        }

        // Calculate Cash Sales for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const cashSalesResult = await prisma.order.aggregate({
            _sum: {
                totalAmount: true,
            },
            where: {
                vehicleId,
                paymentMode: 'CASH',
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        const cashSales = cashSalesResult._sum.totalAmount || 0;
        const expectedCash = summary.openingCash + cashSales;
        const difference = actualCash - expectedCash;

        if (difference !== 0 && !remark) {
            res.status(400);
            throw new Error('Remark is required if there is a difference');
        }

        const closingCash = await prisma.closingCash.upsert({
            where: {
                vehicleId_date: {
                    vehicleId,
                    date: dateString,
                },
            },
            update: {
                openingCash: summary.openingCash,
                cashSales,
                expectedCash,
                actualCash,
                difference,
                denominations,
                remark,
                userId,
            },
            create: {
                vehicleId,
                userId,
                date: dateString,
                openingCash: summary.openingCash,
                cashSales,
                expectedCash,
                actualCash,
                difference,
                denominations,
                remark,
            },
        });

        // Update Daily Summary
        await prisma.dailyCashSummary.update({
            where: {
                vehicleId_date: {
                    vehicleId,
                    date: dateString,
                },
            },
            data: {
                cashSales,
                expectedCash,
                actualCash,
                difference,
                status: difference === 0 ? 'MATCHED' : 'MISMATCHED',
            },
        });

        res.status(201).json(closingCash);
    } catch (error) {
        next(error);
    }
};

// @desc    Get current cash status for the logged-in agent's vehicle
// @route   GET /api/cash/status
// @access  Private
export const getCashStatus = async (req, res, next) => {
    try {
        const vehicleId = req.user.assignedVehicleId;
        if (!vehicleId) {
            return res.json({ vehicleAssigned: false });
        }

        const dateString = format(new Date(), 'yyyy-MM-dd');

        const opening = await prisma.openingCash.findUnique({
            where: {
                vehicleId_date: {
                    vehicleId,
                    date: dateString,
                },
            },
        });

        const closing = await prisma.closingCash.findUnique({
            where: {
                vehicleId_date: {
                    vehicleId,
                    date: dateString,
                },
            },
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const cashSalesResult = await prisma.order.aggregate({
            _sum: {
                totalAmount: true,
            },
            where: {
                vehicleId,
                paymentMode: 'CASH',
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        res.json({
            vehicleAssigned: true,
            openingSubmitted: !!opening,
            closingSubmitted: !!closing,
            openingCash: opening?.totalOpeningCash || 0,
            openingDenominations: opening?.denominations || null,
            closingDenominations: closing?.denominations || null,
            cashSales: cashSalesResult._sum.totalAmount || 0,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all daily cash summaries for admin reconciliation
// @route   GET /api/cash/admin/reconciliation
// @access  Admin
export const getAdminCashSummary = async (req, res, next) => {
    try {
        const { date } = req.query;
        const dateString = date || format(new Date(), 'yyyy-MM-dd');

        const summaries = await prisma.dailyCashSummary.findMany({
            where: {
                date: dateString,
            },
            include: {
                vehicle: {
                    select: {
                        vehicleNumber: true,
                        vehicleName: true,
                    },
                },
            },
        });

        res.json(summaries);
    } catch (error) {
        next(error);
    }
};
