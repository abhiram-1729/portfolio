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

// @desc    Admin: Submit opening cash for any vehicle/agent
// @route   POST /api/cash/admin/opening
// @access  Admin
export const adminSubmitOpeningCash = async (req, res, next) => {
    try {
        const { vehicleId, denominations, totalOpeningCash, userId } = req.body;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (!vehicleId || !userId || totalOpeningCash === undefined) {
            res.status(400);
            throw new Error('Vehicle ID, User ID, and total are required');
        }

        const openingCash = await prisma.openingCash.upsert({
            where: {
                vehicleId_date: {
                    vehicleId,
                    date: dateString,
                },
            },
            update: {
                denominations: denominations || {},
                totalOpeningCash,
                userId,
            },
            create: {
                vehicleId,
                userId,
                date: dateString,
                denominations: denominations || {},
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
                expectedCash: totalOpeningCash,
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

// @desc    Admin: Update/Edit reconciliation for a vehicle
// @route   PUT /api/cash/admin/reconciliation
// @access  Admin
export const adminUpdateReconciliation = async (req, res, next) => {
    try {
        const { vehicleId, date, actualCash, denominations, remark } = req.body;

        if (!vehicleId || !date || actualCash === undefined) {
            res.status(400);
            throw new Error('Vehicle ID, Date, and Actual Cash are required');
        }

        // 1. Get current summary to calculate status/difference
        const summary = await prisma.dailyCashSummary.findUnique({
            where: {
                vehicleId_date: { vehicleId, date }
            }
        });

        if (!summary) {
            res.status(404);
            throw new Error('Summary not found for this date/vehicle');
        }

        const difference = actualCash - summary.expectedCash;
        const status = difference === 0 ? 'MATCHED' : 'MISMATCHED';

        // 2. Update DailyCashSummary
        const updatedSummary = await prisma.dailyCashSummary.update({
            where: {
                vehicleId_date: { vehicleId, date }
            },
            data: {
                actualCash,
                difference,
                status
            },
            include: {
                vehicle: {
                    select: {
                        vehicleNumber: true,
                        vehicleName: true,
                    }
                }
            }
        });

        // 3. Update or create ClosingCash record for audit trial
        await prisma.closingCash.upsert({
            where: {
                vehicleId_date: { vehicleId, date }
            },
            update: {
                actualCash,
                difference,
                denominations: denominations || {},
                remark: remark || 'Updated by admin',
                status
            },
            create: {
                vehicleId,
                date,
                userId: req.user.id,
                openingCash: summary.openingCash,
                cashSales: summary.cashSales,
                expectedCash: summary.expectedCash,
                actualCash,
                difference,
                denominations: denominations || {},
                remark: remark || 'Manually created by admin',
                status
            }
        });

        res.json(updatedSummary);
    } catch (error) {
        next(error);
    }
};
