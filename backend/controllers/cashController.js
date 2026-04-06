import prisma from '../utils/prisma.js';
import { format } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';


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

        sendNotification({
            roles: ['ADMIN'],
            title: 'Opening Cash Submitted',
            message: `Opening cash of ₹${totalOpeningCash} submitted for ${vehicleId}.`,
            type: 'cash',
            priority: 'low',
            metadata: { vehicleId, amount: totalOpeningCash }
        });
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
                expectedCash: {
                    increment: 0 // Placeholder to keep logic consistent
                }
            },
            create: {
                vehicleId,
                date: dateString,
                openingCash: totalOpeningCash,
                expectedCash: totalOpeningCash,
                cashSales: 0
            },
        });

        // Re-fetch and accurately update expectedCash if it was an update
        const finalSummary = await prisma.dailyCashSummary.findUnique({
            where: { vehicleId_date: { vehicleId, date: dateString } }
        });
        
        const newExpected = totalOpeningCash + (finalSummary.cashSales || 0);
        const newDiff = (finalSummary.actualCash || 0) - newExpected;

        await prisma.dailyCashSummary.update({
            where: { vehicleId_date: { vehicleId, date: dateString } },
            data: {
                expectedCash: newExpected,
                difference: newDiff,
                status: finalSummary.actualCash > 0 ? (newDiff === 0 ? 'MATCHED' : 'MISMATCHED') : 'PENDING'
            }
        });

        res.status(201).json(openingCash);

        sendNotification({
            userIds: [userId],
            roles: ['ADMIN'],
            title: 'Opening Cash Entry Submitted',
            message: `Opening cash of ₹${totalOpeningCash} has been registered by admin for your vehicle.`,
            type: 'cash',
            priority: 'medium',
            metadata: { vehicleId, amount: totalOpeningCash }
        });
    } catch (error) {
        next(error);
    }
};

// ... existing code ...

// @desc    Admin: Delete reconciliation and associated records
// @route   DELETE /api/cash/admin/reconciliation/:vehicleId/:date
// @access  Admin
export const deleteReconciliation = async (req, res, next) => {
    try {
        const { vehicleId, date } = req.params;

        await prisma.$transaction([
            prisma.openingCash.deleteMany({ where: { vehicleId, date } }),
            prisma.closingCash.deleteMany({ where: { vehicleId, date } }),
            prisma.dailyCashSummary.deleteMany({ where: { vehicleId, date } }),
        ]);

        res.json({ message: 'Reconciliation data removed' });

        sendNotification({
            vehicleIds: [vehicleId],
            roles: ['ADMIN'],
            title: 'Reconciliation Deleted',
            message: `Cash reconciliation records for ${date} have been removed for vehicle ${vehicleId}.`,
            type: 'cash',
            priority: 'high',
            metadata: { vehicleId, date, action: 'DELETE' }
        });
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

        if (difference !== 0) {
            sendNotification({
                userIds: [userId], // Notify the Agent too!
                roles: ['ADMIN', 'SUPERVISOR'],
                title: Math.abs(difference) >= 1000 ? 'CRITICAL: Large Cash Mismatch' : 'Cash Mismatch Detected',
                message: `Closing cash mismatch of ₹${difference} detected. Please review your entries.`,
                type: 'cash',
                priority: Math.abs(difference) >= 1000 ? 'high' : 'medium',
                metadata: { vehicleId, difference, actualCash, expectedCash }
            });
        }
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

        // Attach opening denominations from OpeningCash records
        const enriched = await Promise.all(
            summaries.map(async (s) => {
                const opening = await prisma.openingCash.findUnique({
                    where: { vehicleId_date: { vehicleId: s.vehicleId, date: s.date } },
                    select: { denominations: true },
                });
                return { ...s, openingDenominations: opening?.denominations || {} };
            })
        );

        res.json(enriched);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Update opening cash for a vehicle (recalculates expected, difference, status)
// @route   PUT /api/cash/admin/reconciliation
// @access  Admin
export const adminUpdateReconciliation = async (req, res, next) => {
    try {
        const { vehicleId, date, openingCash, denominations, remark } = req.body;

        if (!vehicleId || !date || openingCash === undefined) {
            res.status(400);
            throw new Error('Vehicle ID, Date, and Opening Cash are required');
        }

        // 1. Get current summary to access existing cashSales and actualCash
        const summary = await prisma.dailyCashSummary.findUnique({
            where: { vehicleId_date: { vehicleId, date } }
        });

        if (!summary) {
            res.status(404);
            throw new Error('Summary not found for this date/vehicle');
        }

        // 2. Update the OpeningCash record
        await prisma.openingCash.upsert({
            where: { vehicleId_date: { vehicleId, date } },
            update: {
                totalOpeningCash: openingCash,
                denominations: denominations || {},
            },
            create: {
                vehicleId,
                date,
                userId: req.user.id,
                totalOpeningCash: openingCash,
                denominations: denominations || {},
            },
        });

        // 3. Recalculate expectedCash, difference, and status based on new opening cash
        const cashSales = summary.cashSales || 0;
        const newExpectedCash = openingCash + cashSales;
        const actualCash = summary.actualCash || 0;
        const newDifference = actualCash - newExpectedCash;
        const newStatus = actualCash > 0
            ? (newDifference === 0 ? 'MATCHED' : 'MISMATCHED')
            : 'PENDING';

        // 4. Update DailyCashSummary with recalculated values
        const updatedSummary = await prisma.dailyCashSummary.update({
            where: { vehicleId_date: { vehicleId, date } },
            data: {
                openingCash,
                expectedCash: newExpectedCash,
                difference: newDifference,
                status: newStatus,
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

        res.json(updatedSummary);

        sendNotification({
            userIds: [summary.userId],
            roles: ['ADMIN'],
            title: 'Cash Summary Updated',
            message: `Admin has updated the cash summary for ${date}. Status: ${newStatus}. Difference: ₹${newDifference}.`,
            type: 'cash',
            priority: 'medium',
            metadata: { vehicleId, date, difference: newDifference, status: newStatus }
        });
    } catch (error) {
        next(error);
    }
};
