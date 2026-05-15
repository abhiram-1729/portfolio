import prisma from '../utils/prisma.js';
import { format } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';
import { logActivity } from '../utils/activityLogger.js';
import { getEffectiveStoreId } from '../utils/storeResolution.js';

// getEffectiveStoreId is now imported from ../utils/storeResolution.js

// @desc    Submit opening cash for a vehicle (agent — kept for backward compat but agents are blocked on frontend)
// @route   POST /api/cash/opening
// @access  Private
export const submitOpeningCash = async (req, res, next) => {
    try {
        const { vehicleId, denominations, totalOpeningCash, shift = 1 } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (!vehicleId || !denominations || totalOpeningCash === undefined) {
            res.status(400);
            throw new Error('Vehicle ID, denominations, and total are required');
        }

        const openingCash = await prisma.openingCash.upsert({
            where: {
                vehicleId_date_shift: {
                    vehicleId,
                    date: dateString,
                    shift,
                },
            },
            update: {
                denominations,
                totalOpeningCash,
                userId,
            },
            create: {
                tenantId: req.user.tenantId,
                storeId: getEffectiveStoreId(req),
                vehicleId,
                userId,
                date: dateString,
                shift,
                denominations,
                totalOpeningCash,
            },
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: getEffectiveStoreId(req),
            action: 'OPENING_CASH_SUBMITTED',
            details: `Submitted opening cash of ₹${totalOpeningCash} for Shift ${shift}`,
            metadata: { vehicleId, amount: totalOpeningCash, shift, date: dateString }
        });

        // Recalculate daily summary
        await recalculateDailySummary(vehicleId, dateString, req.user.tenantId, getEffectiveStoreId(req));

        res.status(201).json(openingCash);

        sendNotification({
            roles: ['ADMIN'],
            title: 'Opening Cash Submitted',
            message: `Opening cash of ₹${totalOpeningCash} submitted for Shift ${shift}.`,
            type: 'cash',
            priority: 'low',
            metadata: { vehicleId, amount: totalOpeningCash, shift }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Submit opening cash for any vehicle/agent (for a specific shift)
// @route   POST /api/cash/admin/opening
// @access  Admin
export const adminSubmitOpeningCash = async (req, res, next) => {
    try {
        const { vehicleId, denominations, totalOpeningCash, userId, shift = 1, isNoService = false, date } = req.body;
        const dateString = date || format(new Date(), 'yyyy-MM-dd');

        if (!vehicleId || !userId || (totalOpeningCash === undefined && !isNoService)) {
            res.status(400);
            throw new Error('Vehicle ID, User ID, and total are required');
        }

        // Validation: Prevent Shift 2 assignment if Shift 1 is not closed
        if (shift === 2) {
            const shift1Closing = await prisma.closingCash.findUnique({
                where: {
                    vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 }
                }
            });
            if (!shift1Closing) {
                res.status(400);
                throw new Error('Cannot assign Shift 2 until Shift 1 has been closed by the agent.');
            }
        }

        // Admin: Allow upserting (updating) an assignment if it already exists, 
        // which prevents "Duplicate assignment" errors on retries or corrections.

        const openingCash = await prisma.openingCash.upsert({
            where: { vehicleId_date_shift: { vehicleId, date: dateString, shift } },
            update: {
                denominations: isNoService ? {} : (denominations || {}),
                totalOpeningCash: isNoService ? 0 : totalOpeningCash,
                userId,
                isNoService
            },
            create: {
                tenantId: req.user.tenantId,
                storeId: getEffectiveStoreId(req),
                vehicleId,
                userId,
                date: dateString,
                shift,
                denominations: isNoService ? {} : (denominations || {}),
                totalOpeningCash: isNoService ? 0 : totalOpeningCash,
                isNoService
            },
        });

        // If it's No Service, automatically create a finalized closing record
        if (isNoService) {
            await prisma.closingCash.upsert({
                where: { vehicleId_date_shift: { vehicleId, date: dateString, shift } },
                update: {
                    userId,
                    openingCash: 0,
                    cashSales: 0,
                    expenses: 0,
                    expectedCash: 0,
                    actualCash: 0,
                    difference: 0,
                    denominations: {},
                    status: 'SUBMITTED',
                    isNoService: true,
                    remark: 'Marked as No Service by Admin'
                },
                create: {
                    tenantId: req.user.tenantId,
                    storeId: getEffectiveStoreId(req),
                    vehicleId,
                    userId,
                    date: dateString,
                    shift,
                    openingCash: 0,
                    cashSales: 0,
                    expenses: 0,
                    expectedCash: 0,
                    actualCash: 0,
                    difference: 0,
                    denominations: {},
                    status: 'SUBMITTED',
                    isNoService: true,
                    remark: 'Marked as No Service by Admin'
                }
            });
        }

        // Recalculate daily summary
        await recalculateDailySummary(vehicleId, dateString, req.user.tenantId, getEffectiveStoreId(req));

        res.status(201).json(openingCash);

        sendNotification({
            userIds: [userId],
            roles: ['ADMIN'],
            title: isNoService ? `Shift ${shift} - No Service` : `Shift ${shift} Float Assigned`,
            message: isNoService ? `Shift ${shift} marked as No Service for today.` : `₹${totalOpeningCash} opening cash assigned for Shift ${shift}.`,
            type: 'cash',
            priority: 'medium',
            metadata: { vehicleId, amount: isNoService ? 0 : totalOpeningCash, shift }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Delete reconciliation and associated records
// @route   DELETE /api/cash/admin/reconciliation/:vehicleId/:date
// @access  Admin
export const deleteReconciliation = async (req, res, next) => {
    try {
        const { vehicleId, date } = req.params;

        await prisma.$transaction([
            prisma.openingCash.deleteMany({ where: { vehicleId, date, tenantId: req.user.tenantId } }),
            prisma.closingCash.deleteMany({ where: { vehicleId, date, tenantId: req.user.tenantId } }),
            prisma.dailyCashSummary.deleteMany({ where: { vehicleId, date, tenantId: req.user.tenantId } }),
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

// @desc    Submit closing cash for a vehicle (agent submits for a specific shift)
// @route   POST /api/cash/closing
// @access  Private
export const submitClosingCash = async (req, res, next) => {
    console.log('[DEBUG] submitClosingCash Request Body:', req.body);
    try {
        const { vehicleId, actualCash, denominations, remark, shift = 1, isNoService = false } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (![1, 2].includes(shift)) {
            res.status(400);
            throw new Error('Shift must be 1 (Morning) or 2 (Afternoon)');
        }

        // Get the opening cash for THIS shift only
        console.log(`[DEBUG] Querying shiftOpening: vehicleId=${vehicleId}, date=${dateString}, shift=${shift}`);
        const shiftOpening = await prisma.openingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift }
            }
        });

        if (!shiftOpening && !isNoService) {
            console.error('[DEBUG] shiftOpening NOT FOUND for this vehicle/date/shift');
            res.status(400);
            throw new Error(`Shift ${shift} must have an opening float assigned before closing.`);
        }

        // Calculate Shift-specific Sales (from opening until now)
        const orderSalesRes = await prisma.order.groupBy({
            by: ['paymentMode'],
            _sum: {
                totalAmount: true,
                cashAmount: true,
                upiAmount: true
            },
            where: {
                tenantId: req.user.tenantId,
                vehicleId,
                status: 'COMPLETED',
                createdAt: { gte: shiftOpening.createdAt },
            },
        });

        const pureCash = orderSalesRes.find(o => o.paymentMode === 'CASH')?._sum.totalAmount || 0;
        const splitCash = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.cashAmount || 0;
        const shiftCashSales = pureCash + splitCash;

        const pureUpi = orderSalesRes.find(o => o.paymentMode === 'UPI')?._sum.totalAmount || 0;
        const splitUpi = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.upiAmount || 0;
        const shiftUpiSales = pureUpi + splitUpi;

        const shiftCardSales = orderSalesRes.find(o => o.paymentMode === 'CARD')?._sum.totalAmount || 0;

        // Calculate Shift-specific Expenses (claimed only, since shift start)
        const expensesResult = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                tenantId: req.user.tenantId,
                vehicleId,
                date: dateString,
                paymentMode: 'CASH',
                status: { in: ['APPROVED', 'PAID'] },
                createdAt: { gte: shiftOpening.createdAt }
            }
        });
        const shiftExpenses = expensesResult._sum.amount || 0;

        const openingAmount = shiftOpening?.totalOpeningCash || 0;
        const finalExpected = isNoService ? openingAmount : (openingAmount + shiftCashSales - shiftExpenses);
        const finalActual = isNoService ? openingAmount : (actualCash || 0);
        const finalSales = isNoService ? 0 : shiftCashSales;
        const finalUpi = isNoService ? 0 : shiftUpiSales;
        const finalCard = isNoService ? 0 : shiftCardSales;
        const finalExpenses = isNoService ? 0 : shiftExpenses;
        const difference = finalActual - finalExpected;
        console.log(`[DEBUG] Reconciliation: Actual=${finalActual}, Expected=${finalExpected}, Difference=${difference}`);

        // Use a small epsilon to handle floating point precision
        if (Math.abs(difference) > 0.01 && !remark && !isNoService) {
            res.status(400);
            throw new Error('Remark is required if there is a difference');
        }

        const closingCash = await prisma.closingCash.upsert({
            where: { vehicleId_date_shift: { vehicleId, date: dateString, shift } },
            update: {
                openingCash: openingAmount,
                cashSales: finalSales,
                upiSales: finalUpi,
                cardSales: finalCard,
                expenses: finalExpenses,
                expectedCash: finalExpected,
                actualCash: finalActual,
                difference,
                denominations: denominations || {},
                remark: isNoService ? `No Service: ${remark}` : remark,
                userId,
                isNoService,
                status: 'PENDING' // Changed to PENDING for admin review
            },
            create: {
                tenantId: req.user.tenantId,
                storeId: getEffectiveStoreId(req),
                vehicleId,
                userId,
                date: dateString,
                shift,
                openingCash: openingAmount,
                cashSales: finalSales,
                upiSales: finalUpi,
                cardSales: finalCard,
                expenses: finalExpenses,
                expectedCash: finalExpected,
                actualCash: finalActual,
                difference,
                denominations: denominations || {},
                remark: isNoService ? `No Service: ${remark}` : remark,
                isNoService,
                status: 'PENDING' // Changed to PENDING for admin review
            },
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: getEffectiveStoreId(req),
            action: 'CLOSING_CASH_SUBMITTED',
            details: isNoService ? `Reported No Service for Shift ${shift}` : `Submitted closing cash for Shift ${shift}. Difference: ₹${difference}`,
            metadata: {
                vehicleId,
                shift,
                actualCash: finalActual,
                expectedCash: finalExpected,
                difference,
                isNoService
            }
        });

        // Recalculate daily summary
        await recalculateDailySummary(vehicleId, dateString, req.user.tenantId, getEffectiveStoreId(req));

        res.status(201).json(closingCash);

        sendNotification({
            userIds: [],
            roles: ['ADMIN', 'SUPERVISOR'],
            title: isNoService ? `Shift ${shift} - No Service Reported` : `Shift ${shift} Closed`,
            message: isNoService
                ? `Agent reported No Service for Shift ${shift}. Reason: ${remark}`
                : `Shift ${shift} closing submitted by ${req.user.name}.`,
            type: 'cash',
            priority: isNoService ? 'high' : 'medium',
            metadata: { vehicleId, shift, isNoService }
        });

        if (difference !== 0) {
            sendNotification({
                userIds: [userId],
                roles: ['ADMIN', 'SUPERVISOR'],
                title: Math.abs(difference) >= 1000 ? 'CRITICAL: Large Cash Mismatch' : 'Cash Mismatch Detected',
                message: `Shift ${shift} closing mismatch of ₹${difference}.`,
                type: 'cash',
                priority: Math.abs(difference) >= 1000 ? 'high' : 'medium',
                metadata: { vehicleId, difference, actualCash: finalActual, expectedCash: finalExpected, shift }
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get current cash status for the logged-in agent's vehicle (both shifts)
// @route   GET /api/cash/status
// @access  Private
export const getCashStatus = async (req, res, next) => {
    try {
        const vehicleId = req.user.assignedVehicleId;
        if (!vehicleId) {
            return res.json({ vehicleAssigned: false });
        }

        const dateString = format(new Date(), 'yyyy-MM-dd');

        // Fetch both shifts
        const opening1 = await prisma.openingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 }
            },
        });
        const opening2 = await prisma.openingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift: 2 }
            },
        });
        const closing1 = await prisma.closingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 }
            },
        });
        const closing2 = await prisma.closingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift: 2 }
            },
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const orderSalesRes = await prisma.order.groupBy({
            by: ['paymentMode'],
            _sum: {
                totalAmount: true,
                cashAmount: true,
                upiAmount: true
            },
            where: {
                tenantId: req.user.tenantId,
                vehicleId,
                status: 'COMPLETED',
                createdAt: { gte: startOfDay, lte: endOfDay },
            },
        });

        const pureCash = orderSalesRes.find(o => o.paymentMode === 'CASH')?._sum.totalAmount || 0;
        const splitCash = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.cashAmount || 0;
        const totalCashSales = pureCash + splitCash;

        const pureUpi = orderSalesRes.find(o => o.paymentMode === 'UPI')?._sum.totalAmount || 0;
        const splitUpi = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.upiAmount || 0;
        const totalUpiSales = pureUpi + splitUpi;

        const totalCardSales = orderSalesRes.find(o => o.paymentMode === 'CARD')?._sum.totalAmount || 0;

        const vehicleExpenses = await prisma.expense.findMany({
            where: {
                tenantId: req.user.tenantId,
                vehicleId,
                date: dateString,
                paymentMode: 'CASH',
                status: { in: ['PENDING', 'APPROVED', 'PAID'] }
            },
            select: { amount: true, description: true }
        });

        let totalExpenses = 0;
        vehicleExpenses.forEach(exp => {
            const payMatch = exp.description?.match(/\[PAYMENT:.*?Paid: ₹([\d.]+)\]/);
            if (payMatch && payMatch[1]) {
                totalExpenses += parseFloat(payMatch[1]);
            } else {
                totalExpenses += exp.amount;
            }
        });

        // Per-shift sales/expenses split
        const s1CashSales = opening1 ? (closing1?.cashSales || totalCashSales) : 0;
        const s1UpiSales = opening1 ? (closing1?.upiSales || totalUpiSales) : 0;
        const s1CardSales = opening1 ? (closing1?.cardSales || totalCardSales) : 0;
        const s1Expenses = opening1 ? (closing1?.expenses || totalExpenses) : 0;

        const s2CashSales = opening2 ? (closing2?.cashSales || (closing1 ? Math.max(0, totalCashSales - closing1.cashSales) : 0)) : 0;
        const s2UpiSales = opening2 ? (closing2?.upiSales || (closing1 ? Math.max(0, totalUpiSales - closing1.upiSales) : 0)) : 0;
        const s2CardSales = opening2 ? (closing2?.cardSales || (closing1 ? Math.max(0, totalCardSales - closing1.cardSales) : 0)) : 0;
        const s2Expenses = opening2 ? (closing2?.expenses || (closing1 ? Math.max(0, totalExpenses - closing1.expenses) : 0)) : 0;

        const totalOpening = (opening1?.totalOpeningCash || 0) + (opening2?.totalOpeningCash || 0);

        res.json({
            vehicleAssigned: true,
            // Aggregated values (backward compat)
            openingSubmitted: !!opening1,
            closingSubmitted: !!closing2 || !!closing1,
            openingCash: totalOpening,
            cashSales: totalCashSales,
            upiSales: totalUpiSales,
            cardSales: totalCardSales,
            expenses: totalExpenses,
            // Per-shift detail
            shifts: {
                shift1: {
                    openingAssigned: !!opening1,
                    openingCash: opening1?.totalOpeningCash || 0,
                    openingDenominations: opening1?.denominations || null,
                    closingSubmitted: !!closing1,
                    reviewStatus: closing1?.status || null,
                    closingDenominations: closing1?.denominations || null,
                    closingActual: closing1?.actualCash || 0,
                    closingDifference: closing1?.difference || 0,
                    cashSales: s1CashSales,
                    upiSales: s1UpiSales,
                    cardSales: s1CardSales,
                    expenses: s1Expenses,
                },
                shift2: {
                    openingAssigned: !!opening2,
                    openingCash: opening2?.totalOpeningCash || 0,
                    openingDenominations: opening2?.denominations || null,
                    closingSubmitted: !!closing2,
                    reviewStatus: closing2?.status || null,
                    closingDenominations: closing2?.denominations || null,
                    closingActual: closing2?.actualCash || 0,
                    closingDifference: closing2?.difference || 0,
                    cashSales: s2CashSales,
                    upiSales: s2UpiSales,
                    cardSales: s2CardSales,
                    expenses: s2Expenses,
                },
            },
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

        const storeId = getEffectiveStoreId(req);
        const vehicleFilter = { tenantId: req.user.tenantId, status: true };
        if (storeId) {
            vehicleFilter.storeId = storeId;
        }

        const vehicles = await prisma.vehicle.findMany({
            where: vehicleFilter,
            include: {
                assignedUsers: {
                    select: { id: true, name: true, role: true }
                }
            }
        });

        const summaries = await prisma.dailyCashSummary.findMany({
            where: {
                date: dateString,
                tenantId: req.user.tenantId,
                vehicleId: { in: vehicles.map(v => v.id) }
            }
        });

        // BULK FETCH: Get all related data in one go to prevent connection pool exhaustion
        const openingCashRecords = await prisma.openingCash.findMany({
            where: { date: dateString, tenantId: req.user.tenantId, vehicleId: { in: vehicles.map(v => v.id) } }
        });
        const closingCashRecords = await prisma.closingCash.findMany({
            where: { date: dateString, tenantId: req.user.tenantId, vehicleId: { in: vehicles.map(v => v.id) } }
        });

        const routeAssignments = await prisma.routeAssignment.findMany({
            where: {
                tenantId: req.user.tenantId,
                vehicleId: { in: vehicles.map(v => v.id) },
                status: true
            },
            include: {
                route: {
                    include: { cycles: true }
                }
            }
        });

        const dayName = format(new Date(dateString), 'EEEE').toUpperCase(); // e.g., 'MONDAY'

        const startOfDayDate = new Date(dateString);
        startOfDayDate.setHours(0, 0, 0, 0);
        const endOfDayDate = new Date(dateString);
        endOfDayDate.setHours(23, 59, 59, 999);

        const orderAggregates = await prisma.order.groupBy({
            by: ['vehicleId', 'paymentMode'],
            _sum: { totalAmount: true, cashAmount: true, upiAmount: true },
            where: {
                tenantId: req.user.tenantId,
                vehicleId: { in: vehicles.map(v => v.id) },
                status: 'COMPLETED',
                createdAt: { gte: startOfDayDate, lte: endOfDayDate }
            }
        });

        const expenseAggregates = await prisma.expense.groupBy({
            by: ['vehicleId'],
            _sum: { amount: true },
            where: {
                tenantId: req.user.tenantId,
                vehicleId: { in: vehicles.map(v => v.id) },
                date: dateString,
                paymentMode: 'CASH',
                status: { in: ['APPROVED', 'PAID'] }
            }
        });

        const results = vehicles.map((v) => {
            const s = summaries.find(sum => sum.vehicleId === v.id);
            const openings = openingCashRecords.filter(o => o.vehicleId === v.id);
            const closings = closingCashRecords.filter(c => c.vehicleId === v.id);
            const orders = orderAggregates.filter(o => o.vehicleId === v.id);
            const expenses = expenseAggregates.filter(e => e.vehicleId === v.id);
            const ra = routeAssignments.find(ra => ra.vehicleId === v.id);
            const todayCycle = ra?.route?.cycles?.find(c => c.dayOfWeek === dayName);
            const villageName = todayCycle?.villageName || ra?.route?.routeName || 'Unspecified';

            const totalRealtimeCashSales = orders.reduce((sum, o) => {
                if (o.paymentMode === 'CASH') return sum + (o._sum.totalAmount || 0);
                if (o.paymentMode === 'CASH_UPI') return sum + (o._sum.cashAmount || 0);
                return sum;
            }, 0);

            const totalRealtimeUpiSales = orders.reduce((sum, o) => {
                if (o.paymentMode === 'UPI') return sum + (o._sum.totalAmount || 0);
                if (o.paymentMode === 'CASH_UPI') return sum + (o._sum.upiAmount || 0);
                return sum;
            }, 0);

            const totalRealtimeCardSales = orders.filter(o => o.paymentMode === 'CARD').reduce((sum, o) => sum + (o._sum.totalAmount || 0), 0);
            const totalRealtimeExpenses = expenses.reduce((sum, e) => sum + (e._sum.amount || 0), 0);

            const o1 = openings.find(o => o.shift === 1);
            const o2 = openings.find(o => o.shift === 2);
            const c1 = closings.find(c => c.shift === 1);
            const c2 = closings.find(c => c.shift === 2);

            let s1Live = { cashSales: 0, upiSales: 0, cardSales: 0, expenses: 0, expected: 0 };
            let s2Live = { cashSales: 0, upiSales: 0, cardSales: 0, expenses: 0, expected: 0 };

            // Shift 1: If closed, we keep the expectation that was stored in c1.expectedCash
            // Note: Currently we don't have totalRealtimeSplit, so we rely on c1's records for expectations
            if (c1) {
                s1Live.cashSales = c1.cashSales;
                s1Live.upiSales = c1.upiSales;
                s1Live.cardSales = c1.cardSales;
                s1Live.expenses = c1.expenses;
                s1Live.expected = c1.expectedCash;
                // We add a specific field for original system expectations if we had them
            } else {
                s1Live.cashSales = totalRealtimeCashSales;
                s1Live.upiSales = totalRealtimeUpiSales;
                s1Live.cardSales = totalRealtimeCardSales;
                s1Live.expenses = totalRealtimeExpenses;
                s1Live.expected = o1 ? (o1.totalOpeningCash + s1Live.cashSales - s1Live.expenses) : 0;
            }

            // Shift 2: 
            if (c2) {
                s2Live.cashSales = c2.cashSales;
                s2Live.upiSales = c2.upiSales;
                s2Live.cardSales = c2.cardSales;
                s2Live.expenses = c2.expenses;
                s2Live.expected = c2.expectedCash;
            } else if (o2) {
                const s1AccountedSales = c1?.cashSales || 0;
                const s1AccountedUpi = c1?.upiSales || 0;
                const s1AccountedCard = c1?.cardSales || 0;
                const s1AccountedExpenses = c1?.expenses || 0;

                s2Live.cashSales = Math.max(0, totalRealtimeCashSales - s1AccountedSales);
                s2Live.upiSales = Math.max(0, totalRealtimeUpiSales - s1AccountedUpi);
                s2Live.cardSales = Math.max(0, totalRealtimeCardSales - s1AccountedCard);
                s2Live.expenses = Math.max(0, totalRealtimeExpenses - s1AccountedExpenses);
                s2Live.expected = o2.totalOpeningCash + s2Live.cashSales - s2Live.expenses;
            }

            return {
                id: s ? s.id : `temp-${v.id}`,
                vehicleId: v.id,
                date: dateString,
                tenantId: req.user.tenantId,
                storeId: v.storeId,
                villageName: villageName,
                openingCash: s ? s.openingCash : 0,
                cashSales: s ? s.cashSales : 0,
                upiSales: s ? s.upiSales : 0,
                cardSales: s ? s.cardSales : 0,
                expenses: s ? s.expenses : 0,
                expectedCash: s ? s.expectedCash : 0,
                actualCash: s ? s.actualCash : 0,
                difference: s ? s.difference : 0,
                status: s ? s.status : 'PENDING',
                vehicle: v,
                dailySales: {
                    totalCash: totalRealtimeCashSales,
                    totalUpi: totalRealtimeUpiSales,
                    totalCard: totalRealtimeCardSales,
                    grandTotal: totalRealtimeCashSales + totalRealtimeUpiSales + totalRealtimeCardSales
                },
                openingDenominations: o1?.denominations || {},
                shiftDetails: {
                    shift1: { opening: o1 || null, closing: c1 || null, live: s1Live },
                    shift2: { opening: o2 || null, closing: c2 || null, live: s2Live }
                }
            };
        });

        // Filter: ONLY show vehicles that have been assigned a float today
        const assignedResults = results.filter(r =>
            r.shiftDetails.shift1.opening !== null ||
            r.shiftDetails.shift2.opening !== null
        );

        res.json(assignedResults);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Update opening cash for a vehicle (recalculates expected, difference, status)
// @route   PUT /api/cash/admin/reconciliation
// @access  Admin
export const adminUpdateReconciliation = async (req, res, next) => {
    try {
        const { vehicleId, date, openingCash, denominations, remark, shift = 1, isNoService = false } = req.body;

        if (!vehicleId || !date || (!isNoService && openingCash === undefined)) {
            res.status(400);
            throw new Error('Vehicle ID, Date, and Opening Cash are required');
        }

        if (!isNoService) {
            // Validate against Store Safe
            const storeId = getEffectiveStoreId(req);
            if (!storeId) {
                res.status(400);
                throw new Error('Admin must belong to a Store to manage cash.');
            }

            const storeRegister = await prisma.storeCashRegister.findUnique({
                where: { storeId_date: { storeId, date } }
            });

            if (!storeRegister) {
                res.status(400);
                throw new Error('Please initialize the Store Cash Safe for today before assigning floats.');
            }

            // Calculate live available
            const allOpening = await prisma.openingCash.aggregate({
                where: { storeId, date },
                _sum: { totalOpeningCash: true }
            });

            const allDeposits = await prisma.storeDeposit.aggregate({
                where: { storeId, date },
                _sum: { amount: true }
            });

            const assignedOut = allOpening._sum.totalOpeningCash || 0;
            const receivedIn = allDeposits._sum.amount || 0;
            const liveAvailable = storeRegister.openingCash - assignedOut + receivedIn;

            // Existing float for this shift
            const existing = await prisma.openingCash.findUnique({
                where: { vehicleId_date_shift: { vehicleId, date, shift } }
            });
            const existingFloat = existing ? existing.totalOpeningCash : 0;
            const additionalNeeded = openingCash - existingFloat;

            if (additionalNeeded > liveAvailable) {
                res.status(400);
                throw new Error(`Insufficient Store Cash. Available: ₹${liveAvailable.toFixed(2)}`);
            }
        }

        // Update the specific shift's OpeningCash record
        await prisma.openingCash.upsert({
            where: {
                vehicleId_date_shift: { vehicleId, date, shift }
            },
            update: {
                totalOpeningCash: isNoService ? 0 : openingCash,
                denominations: isNoService ? {} : (denominations || {}),
                isNoService
            },
            create: {
                tenantId: req.user.tenantId,
                storeId: getEffectiveStoreId(req),
                vehicleId,
                date,
                shift,
                userId: req.user.id,
                totalOpeningCash: isNoService ? 0 : openingCash,
                denominations: isNoService ? {} : (denominations || {}),
                isNoService
            },
        });

        if (isNoService) {
            // Also need to set or update closing cash?
            // If it's No Service, automatically create a finalized closing record
            await prisma.closingCash.upsert({
                where: { vehicleId_date_shift: { vehicleId, date, shift } },
                update: {
                    userId: req.user.id,
                    openingCash: 0,
                    cashSales: 0,
                    expenses: 0,
                    expectedCash: 0,
                    actualCash: 0,
                    difference: 0,
                    denominations: {},
                    status: 'SUBMITTED',
                    isNoService: true,
                    remark: 'Marked as No Service by Admin'
                },
                create: {
                    tenantId: req.user.tenantId,
                    storeId: getEffectiveStoreId(req),
                    vehicleId,
                    userId: req.user.id,
                    date,
                    shift,
                    openingCash: 0,
                    cashSales: 0,
                    expenses: 0,
                    expectedCash: 0,
                    actualCash: 0,
                    difference: 0,
                    denominations: {},
                    status: 'SUBMITTED',
                    isNoService: true,
                    remark: 'Marked as No Service by Admin'
                }
            });
        } else {
            // If it was changed from No Service -> Regular, delete the auto-generated ClosingCash if it was No Service.
            const existingClosing = await prisma.closingCash.findUnique({
                where: { vehicleId_date_shift: { vehicleId, date, shift } }
            });
            if (existingClosing && existingClosing.isNoService) {
                await prisma.closingCash.delete({
                    where: { vehicleId_date_shift: { vehicleId, date, shift } }
                });
            }
        }

        // Recalculate daily summary
        const updatedSummary = await recalculateDailySummary(vehicleId, date, req.user.tenantId, getEffectiveStoreId(req));

        // SYNC: Update the Store Deposit if it already exists for this shift
        const storeId = getEffectiveStoreId(req);
        const deposit = await prisma.storeDeposit.findUnique({
            where: { storeId_date_shift: { storeId, date, shift: parseInt(shift) } }
        });

        if (deposit) {
            const allClosings = await prisma.closingCash.findMany({
                where: {
                    date,
                    shift: parseInt(shift),
                    vehicle: { storeId: storeId }
                }
            });

            const totalAmount = allClosings.reduce((sum, c) => sum + (c.actualCash || 0), 0);
            const totalDenominations = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };

            allClosings.forEach(c => {
                if (c.denominations) {
                    Object.entries(c.denominations).forEach(([denom, count]) => {
                        totalDenominations[denom] = (totalDenominations[denom] || 0) + (parseInt(count) || 0);
                    });
                }
            });

            await prisma.storeDeposit.update({
                where: { storeId_date_shift: { storeId, date, shift: parseInt(shift) } },
                data: {
                    amount: totalAmount,
                    denominations: totalDenominations,
                    description: `Auto-synced: Consolidated Deposit for Shift ${shift} (${allClosings.length} Agents)`
                }
            });
        }

        const finalSummary = await prisma.dailyCashSummary.findUnique({
            where: {
                vehicleId_date: { vehicleId, date }
            },
            include: {
                vehicle: {
                    select: { vehicleNumber: true, vehicleName: true }
                }
            }
        });

        res.json(finalSummary);

        sendNotification({
            userIds: [finalSummary?.userId],
            roles: ['ADMIN'],
            title: `Shift ${shift} Cash Updated`,
            message: `Admin updated Shift ${shift} opening cash for ${date}.`,
            type: 'cash',
            priority: 'medium',
            metadata: { vehicleId, date, shift, openingCash }
        });
    } catch (error) {
        next(error);
    }
};

// Shared utility to recalculate daily summary (aggregates BOTH shifts)
export async function recalculateDailySummary(vehicleId, date, tenantId, storeId) {
    console.log('[DEBUG] recalculateDailySummary:', { vehicleId, date, tenantId, storeId });
    if (!vehicleId || !date || !tenantId) return;
    try {

        // 1. Get Opening Cash from BOTH shifts
        const openings = await prisma.openingCash.findMany({
            where: { vehicleId, date, tenantId }
        });
        const totalOpeningCash = openings.reduce((sum, o) => sum + o.totalOpeningCash, 0);
        const primaryUserId = openings[0]?.userId || 'SYSTEM';

        // Fallback storeId from vehicle if not provided
        let effectiveStoreId = storeId;
        if (!effectiveStoreId) {
            const vehicle = await prisma.vehicle.findUnique({
                where: { id: vehicleId },
                select: { storeId: true }
            });
            effectiveStoreId = vehicle?.storeId;
        }

        // 2. Calculate Cash Sales from Orders
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const orderSalesRes = await prisma.order.groupBy({
            by: ['paymentMode'],
            _sum: {
                totalAmount: true,
                cashAmount: true,
                upiAmount: true
            },
            where: {
                tenantId,
                vehicleId,
                status: 'COMPLETED',
                createdAt: { gte: startOfDay, lte: endOfDay }
            }
        });

        // Calculate Cash Sales: Sum of pure CASH orders + cash portions of split orders
        const pureCash = orderSalesRes.find(o => o.paymentMode === 'CASH')?._sum.totalAmount || 0;
        const splitCash = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.cashAmount || 0;
        const cashSales = pureCash + splitCash;

        // Calculate UPI Sales: Sum of pure UPI orders + UPI portions of split orders
        const pureUpi = orderSalesRes.find(o => o.paymentMode === 'UPI')?._sum.totalAmount || 0;
        const splitUpi = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.upiAmount || 0;
        const upiSales = pureUpi + splitUpi;

        const cardSales = orderSalesRes.find(o => o.paymentMode === 'CARD')?._sum.totalAmount || 0;

        // 3. Calculate Approved/Pending Cash Expenses (Smart sum for Partial Payments)
        const cashExpenses = await prisma.expense.findMany({
            where: {
                tenantId,
                vehicleId,
                date,
                paymentMode: 'CASH',
                status: { in: ['PENDING', 'APPROVED', 'PAID'] }
            },
            select: { amount: true, description: true }
        });

        let expenses = 0;
        cashExpenses.forEach(exp => {
            const payMatch = exp.description?.match(/\[PAYMENT:.*?Paid: ₹([\d.]+)\]/);
            if (payMatch && payMatch[1]) {
                expenses += parseFloat(payMatch[1]);
            } else {
                expenses += exp.amount;
            }
        });

        // 4. Get Actual Cash from the LATEST closing (Shift 2 takes priority, fallback to Shift 1)
        const closing2 = await prisma.closingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date, shift: 2 }
            }
        });
        const closing1 = await prisma.closingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date, shift: 1 }
            }
        });

        const latestClosing = closing2 || closing1;
        const actualCash = latestClosing?.actualCash || 0;

        // 5. Calculate Expected and Difference
        const expectedCash = totalOpeningCash + cashSales - expenses;
        const difference = actualCash - expectedCash;

        // Determine overall status based on reconciliation and review state
        let finalStatus = 'PENDING';
        if (latestClosing) {
            if (closing1?.status === 'PENDING' || closing2?.status === 'PENDING') {
                finalStatus = 'AWAITING_REVIEW'; // Admin needs to approve
            } else if (closing1?.status === 'REJECTED' || closing2?.status === 'REJECTED') {
                finalStatus = 'REJECTED';
            } else {
                finalStatus = (difference === 0) ? 'MATCHED' : 'MISMATCHED';
            }
        }

        // 6. Upsert Daily Summary
        return await prisma.dailyCashSummary.upsert({
            where: {
                vehicleId_date: { vehicleId, date }
            },
            update: {
                openingCash: totalOpeningCash,
                cashSales,
                upiSales,
                cardSales,
                expenses,
                expectedCash,
                actualCash,
                difference,
                status: finalStatus
            },
            create: {
                tenantId,
                storeId: effectiveStoreId,
                vehicleId,
                userId: primaryUserId,
                date,
                openingCash: totalOpeningCash,
                cashSales,
                upiSales,
                cardSales,
                expenses,
                expectedCash,
                actualCash,
                difference,
                status: finalStatus
            }
        });
    } catch (error) {
        console.error('[RecalculateSummary Error]:', error);
        throw error;
    }
}

// @desc    Admin: Get finance reports (aggregated cash, expenses, profitability)
// @route   GET /api/cash/admin/finance/reports
// @access  Admin
export const getFinanceReports = async (req, res, next) => {
    try {
        const { date, startDate, endDate, storeId } = req.query;
        const targetDate = date || format(new Date(), 'yyyy-MM-dd');
        const tenantId = req.user.tenantId;

        const baseFilter = {
            tenantId,
            ...(date ? { date: targetDate } : {
                date: {
                    gte: startDate,
                    lte: endDate || targetDate
                }
            })
        };

        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            baseFilter.storeId = storeId;
        } else {
            // For restricted roles, always lock to their store
            const isRestricted = req.user?.role === 'SALES_AGENT' || req.user?.role === 'MECHANIC';
            const isGlobal =
                req.user?.role === 'TENANT_OWNER' ||
                req.user?.role === 'SUPER_ADMIN' ||
                (req.user?.role === 'ADMIN' && !req.user?.customRoleId) ||
                req.user?.portalType === 'ADMIN';

            if (isRestricted) {
                baseFilter.storeId = req.user.storeId;
            } else if (!isGlobal && req.user.storeId) {
                // If not global and has a storeId (e.g. Branch Manager), lock to it
                baseFilter.storeId = req.user.storeId;
            }
            // If global and no storeId requested, we leave it out of filter to get all stores
        }

        // 1. Daily Summary (Daily Cash Sheet)
        const summaries = await prisma.dailyCashSummary.findMany({
            where: baseFilter,
            include: {
                vehicle: {
                    select: { id: true, vehicleNumber: true }
                },
                user: {
                    select: { name: true }
                }
            }
        });

        // Enrich with route info (similar to getAdminCashSummary)
        const dayName = format(new Date(targetDate), 'EEEE').toUpperCase();
        const dailySummaries = await Promise.all(summaries.map(async (s) => {
            const ra = await prisma.routeAssignment.findFirst({
                where: { vehicleId: s.vehicleId, status: true },
                include: { route: { include: { cycles: true } } }
            });
            const todayCycle = ra?.route?.cycles?.find(c => c.dayOfWeek === dayName);
            const villageName = todayCycle?.villageName || ra?.route?.routeName || 'Unspecified';
            return { ...s, villageName };
        }));

        // 2. Expense Category Breakdown
        const expenseFilter = {
            tenantId,
            status: 'APPROVED',
            ...(date ? { date: targetDate } : {
                date: {
                    gte: startDate,
                    lte: endDate || targetDate
                }
            })
        };
        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            expenseFilter.storeId = storeId;
        } else {
            const isRestricted = req.user?.role === 'SALES_AGENT' || req.user?.role === 'MECHANIC';
            const isGlobal =
                req.user?.role === 'TENANT_OWNER' ||
                req.user?.role === 'SUPER_ADMIN' ||
                (req.user?.role === 'ADMIN' && !req.user?.customRoleId) ||
                req.user?.portalType === 'ADMIN';

            if (isRestricted) {
                expenseFilter.storeId = req.user.storeId;
            } else if (!isGlobal && req.user.storeId) {
                expenseFilter.storeId = req.user.storeId;
            }
        }

        const expenses = await prisma.expense.groupBy({
            by: ['type'],
            _sum: { amount: true },
            where: expenseFilter
        });

        // 3. Profitability (Simplified: Sales - approved expenses)
        const salesByVehicle = await prisma.dailyCashSummary.groupBy({
            by: ['vehicleId'],
            _sum: { cashSales: true, expenses: true },
            where: baseFilter
        });

        // Enforce vehicle names for profitability
        const profitability = await Promise.all(salesByVehicle.map(async (v) => {
            const vehicle = await prisma.vehicle.findUnique({
                where: { id: v.vehicleId },
                select: { vehicleNumber: true }
            });
            return {
                vehicleId: v.vehicleId,
                vehicleNumber: vehicle?.vehicleNumber || 'Unknown',
                totalSales: v._sum.cashSales || 0,
                totalExpenses: v._sum.expenses || 0,
                profit: (v._sum.cashSales || 0) - (v._sum.expenses || 0)
            };
        }));

        // 4. Branch-wise Shift Statistics
        const [openingsByStore, closingsByStore, pendingByStore] = await Promise.all([
            prisma.openingCash.groupBy({
                by: ['storeId'],
                where: { date: targetDate, tenantId },
                _count: { id: true }
            }),
            prisma.closingCash.groupBy({
                by: ['storeId'],
                where: { date: targetDate, tenantId },
                _count: { id: true }
            }),
            prisma.closingCash.groupBy({
                by: ['storeId'],
                where: { date: targetDate, tenantId, status: 'SUBMITTED' },
                _count: { id: true }
            })
        ]);

        const storeStats = {};
        openingsByStore.forEach(o => {
            const sid = o.storeId || 'none';
            if (!storeStats[sid]) storeStats[sid] = { active: 0, pending: 0 };
            storeStats[sid].active += o._count.id;
        });
        closingsByStore.forEach(c => {
            const sid = c.storeId || 'none';
            if (!storeStats[sid]) storeStats[sid] = { active: 0, pending: 0 };
            storeStats[sid].active -= c._count.id; // Active = Opened - Closed
        });
        pendingByStore.forEach(p => {
            const sid = p.storeId || 'none';
            if (!storeStats[sid]) storeStats[sid] = { active: 0, pending: 0 };
            storeStats[sid].pending = p._count.id;
        });

        res.json({
            dailySheet: dailySummaries,
            expenseBreakdown: expenses,
            profitability,
            branchStats: storeStats
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Review (Approve/Reject/Edit) closing cash for a vehicle
// @route   PUT /api/cash/admin/closing/review
// @access  Admin
export const adminReviewClosingCash = async (req, res, next) => {
    console.log('[DEBUG] adminReviewClosingCash body:', req.body);
    try {
        const { vehicleId, date, shift, status, actualCash, upiSales, cardSales, denominations, remark } = req.body;

        if (!vehicleId || !date || !shift || !status) {
            res.status(400);
            throw new Error('Vehicle ID, Date, Shift, and Status are required');
        }

        const existingClosing = await prisma.closingCash.findUnique({
            where: { vehicleId_date_shift: { vehicleId, date, shift: parseInt(shift) } }
        });

        if (!existingClosing) {
            res.status(404);
            throw new Error('Closing record not found');
        }

        const updateData = { status };

        // 1. Determine new values against existing
        const newActualCash = actualCash !== undefined ? actualCash : existingClosing.actualCash;
        const newUpiSales = upiSales !== undefined ? upiSales : existingClosing.upiSales;
        const newCardSales = cardSales !== undefined ? cardSales : existingClosing.cardSales;

        // 2. Calculate the variance from what the system originally recorded
        const upiVariance = newUpiSales - existingClosing.upiSales;
        const cardVariance = newCardSales - existingClosing.cardSales;

        // 3. Adjust expectedCash based ONLY on the variance. 
        // If they add 500 to UPI, it means they swapped 500 of physical cash expectation for UPI.
        const newExpectedCash = existingClosing.expectedCash - upiVariance - cardVariance;

        // 4. Calculate new difference
        const newDifference = newActualCash - newExpectedCash;

        if (actualCash !== undefined) updateData.actualCash = newActualCash;
        if (upiSales !== undefined) updateData.upiSales = newUpiSales;
        if (cardSales !== undefined) updateData.cardSales = newCardSales;

        // Notice we do NOT change cashSales. We only shift the expectation to match the modified payment modes.
        updateData.expectedCash = newExpectedCash;
        updateData.difference = newDifference;
        if (denominations) updateData.denominations = denominations;
        if (remark) updateData.remark = remark;

        const closingCash = await prisma.closingCash.update({
            where: { vehicleId_date_shift: { vehicleId, date, shift: parseInt(shift) } },
            data: updateData
        });

        // Recalculate daily summary
        await recalculateDailySummary(vehicleId, date, req.user.tenantId, getEffectiveStoreId(req));

        // SYNC: Update the Store Deposit if it already exists for this shift
        const storeId = getEffectiveStoreId(req);
        const deposit = await prisma.storeDeposit.findUnique({
            where: { storeId_date_shift: { storeId, date, shift: parseInt(shift) } }
        });

        if (deposit) {
            const allClosings = await prisma.closingCash.findMany({
                where: {
                    date,
                    shift: parseInt(shift),
                    vehicle: { storeId: storeId } // More robust: link via vehicle's store
                }
            });

            const totalAmount = allClosings.reduce((sum, c) => sum + (c.actualCash || 0), 0);
            const totalDenominations = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };

            allClosings.forEach(c => {
                if (c.denominations) {
                    Object.entries(c.denominations).forEach(([denom, count]) => {
                        totalDenominations[denom] = (totalDenominations[denom] || 0) + (parseInt(count) || 0);
                    });
                }
            });

            await prisma.storeDeposit.update({
                where: { storeId_date_shift: { storeId, date, shift: parseInt(shift) } },
                data: {
                    amount: totalAmount,
                    denominations: totalDenominations,
                    description: `Auto-synced: Consolidated Deposit for Shift ${shift} (${allClosings.length} Agents)`
                }
            });
        }

        res.json(closingCash);

        // Notify the agent who submitted the cash
        sendNotification({
            userIds: [existingClosing.userId],
            title: `Shift ${shift} Reconciliation ${status}`,
            message: `Your Shift ${shift} closing has been ${status.toLowerCase()} by administration.${status === 'REJECTED' ? ' Please re-submit.' : ''}`,
            type: 'cash',
            priority: status === 'REJECTED' ? 'high' : 'medium',
            metadata: { vehicleId, date, shift, status }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get the current day's Store Cash Register summary with live bounds
// @route   GET /api/cash/store-register/:date
// @access  Admin
export const getStoreCashRegister = async (req, res, next) => {
    try {
        const { date } = req.params;
        const storeId = getEffectiveStoreId(req);

        if (!storeId) {
            res.status(400);
            throw new Error('Admin must belong to a Store to view cash register.');
        }

        const storeRegister = await prisma.storeCashRegister.findUnique({
            where: { storeId_date: { storeId, date } },
            include: {
                openedBy: { select: { name: true } },
                closedBy: { select: { name: true } }
            }
        });

        // 🆕 Fetch previous day's closing if today is not initialized or for carry-over check
        const previousRegister = await prisma.storeCashRegister.findFirst({
            where: {
                storeId,
                date: { lt: date },
                status: 'CLOSED'
            },
            orderBy: { date: 'desc' },
            include: {
                closedBy: { select: { name: true } }
            }
        });

        // Compute live metrics regardless of whether store is open so frontend can show 0
        const allOpening = await prisma.openingCash.aggregate({
            where: { storeId, date },
            _sum: { totalOpeningCash: true }
        });

        const allDeposits = await prisma.storeDeposit.aggregate({
            where: { storeId, date },
            _sum: { amount: true }
        });

        const allDepositsRecords = await prisma.storeDeposit.findMany({
            where: { storeId, date },
            orderBy: { shift: 'asc' }
        });

        const allBankDeposits = await prisma.bankDeposit.aggregate({
            where: { storeId, date },
            _sum: { amount: true }
        });



        const allBankDepositsRecords = await prisma.bankDeposit.findMany({
            where: { storeId, date },
            include: { admin: { select: { name: true, mobile: true } } }
        });

        // Safe Movements
        const allSafeDeposits = await prisma.safeTransaction.aggregate({
            where: { storeId, date, type: 'DEPOSIT' },
            _sum: { amount: true }
        });

        const allSafeWithdrawals = await prisma.safeTransaction.aggregate({
            where: { storeId, date, type: 'WITHDRAW' },
            _sum: { amount: true }
        });

        const movedToSafe = allSafeDeposits._sum.amount || 0;
        const withdrawnFromSafe = allSafeWithdrawals._sum.amount || 0;

        const assignedOut = allOpening._sum.totalOpeningCash || 0;
        const receivedIn = allDeposits._sum.amount || 0;
        const bankTransferred = allBankDeposits._sum.amount || 0;

        // Fetch ALL Direct Store POS Sales (in-store only, excludes agent route orders)
        const allStoreSales = await prisma.order.findMany({
            where: {
                storeId,
                vehicleId: null,  // Only direct POS sales, not agent vehicle orders
                createdAt: {
                    gte: new Date(`${date}T00:00:00.000Z`),
                    lte: new Date(`${date}T23:59:59.999Z`)
                },
                status: { in: ['PAID', 'COMPLETED'] }
            },
            select: { paymentMode: true, totalAmount: true, cashAmount: true, upiAmount: true }
        });

        // 🆕 Fetch Store CASH Expenses (PAID only)
        const allStoreExpenses = await prisma.expense.findMany({
            where: {
                storeId,
                status: { in: ['APPROVED', 'PAID'] },
                paymentMode: 'CASH',
                date: date,
                vehicleId: null // Only direct store expenses, not agent float expenses
            },
            select: { amount: true }
        });

        const totalStoreExpensesCash = allStoreExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const totalStoreSalesCash = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'CASH') return sum + o.totalAmount;
            if (o.paymentMode === 'CASH_UPI') return sum + (o.cashAmount || 0);
            return sum;
        }, 0);

        const totalStoreSalesUPI = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'UPI') return sum + o.totalAmount;
            if (o.paymentMode === 'CASH_UPI') return sum + (o.upiAmount || 0);
            return sum;
        }, 0);

        const totalStoreSalesCard = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'CARD') return sum + o.totalAmount;
            return sum;
        }, 0);

        const totalStoreSalesHybrid = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'CASH_UPI') return sum + o.totalAmount;
            return sum;
        }, 0);

        const totalStoreSalesCount = {
            CASH: allStoreSales.filter(o => o.paymentMode === 'CASH').length,
            UPI: allStoreSales.filter(o => o.paymentMode === 'UPI').length,
            CARD: allStoreSales.filter(o => o.paymentMode === 'CARD').length,
            HYBRID: allStoreSales.filter(o => o.paymentMode === 'CASH_UPI').length,
        };

        let totalStoreCash = 0;
        let safeBalance = 0;
        let availableCash = 0;

        if (storeRegister) {
            totalStoreCash = storeRegister.openingCash - assignedOut + receivedIn + totalStoreSalesCash - bankTransferred - totalStoreExpensesCash;
            safeBalance = movedToSafe - withdrawnFromSafe - bankTransferred;
            availableCash = totalStoreCash - safeBalance;
        }

        const shiftCollectionsVal = await prisma.closingCash.groupBy({
            by: ['shift'],
            where: {
                date,
                vehicle: { storeId }
            },
            _sum: { actualCash: true }
        });

        res.json({
            storeRegister,
            previousRegister,
            storeDeposits: allDepositsRecords,
            bankDeposits: allBankDepositsRecords,
            shiftCollections: shiftCollectionsVal,
            liveMetrics: {
                assignedOut,
                receivedIn,
                bankTransferred,
                totalStoreSalesCash,
                totalStoreSalesUPI,
                totalStoreSalesCard,
                totalStoreSalesHybrid,
                totalStoreSalesCount,
                totalStoreExpensesCash: parseFloat(totalStoreExpensesCash.toFixed(2)),
                totalStoreCash: parseFloat(totalStoreCash.toFixed(2)),
                safeBalance: parseFloat(safeBalance.toFixed(2)),
                availableCash: parseFloat(availableCash.toFixed(2)),
                liveExpected: parseFloat(totalStoreCash.toFixed(2))
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get computed audit ledger for store cash register
// @route   GET /api/cash/store-register/:date/ledger
// @access  Admin
export const getStoreCashLedger = async (req, res, next) => {
    try {
        const { date } = req.params;
        const storeId = getEffectiveStoreId(req);

        if (!storeId) {
            res.status(400);
            throw new Error('Admin must belong to a Store.');
        }

        const storeRegister = await prisma.storeCashRegister.findUnique({
            where: { storeId_date: { storeId, date } },
            include: {
                openedBy: { select: { name: true } },
                closedBy: { select: { name: true } }
            }
        });

        // We continue even if storeRegister is missing so already logged expenses/sales show up
        const isInitialized = !!storeRegister;
        const openingCash = storeRegister?.openingCash || 0;
        let runningBalance = 0;

        // Fetch all related records for this store & date
        const agentOutflows = await prisma.openingCash.findMany({
            where: { storeId, date },
            include: {
                vehicle: {
                    select: {
                        vehicleNumber: true,
                        vehicleName: true,
                        assignedUsers: { select: { name: true, role: true } }
                    }
                },
                user: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        const agentInflows = await prisma.storeDeposit.findMany({
            where: { storeId, date },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });

        const bankTransfers = await prisma.bankDeposit.findMany({
            where: { storeId, date },
            include: { admin: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });

        const safeMovements = await prisma.safeTransaction.findMany({
            where: { storeId, date },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });

        const storeSales = await prisma.order.findMany({
            where: {
                storeId,
                vehicleId: null,
                createdAt: {
                    gte: new Date(`${date}T00:00:00.000Z`),
                    lte: new Date(`${date}T23:59:59.999Z`)
                },
                status: { in: ['PAID', 'COMPLETED'] }
            },
            include: {
                user: { select: { name: true } },
                items: { include: { product: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'asc' }
        });

        // 🆕 Fetch Store CASH Expenses
        const storeExpenses = await prisma.expense.findMany({
            where: {
                storeId,
                status: { in: ['APPROVED', 'PAID'] },
                date: date
            },
            select: {
                id: true,
                type: true,
                amount: true,
                description: true,
                status: true,
                paymentMode: true,
                vehicleId: true,
                createdAt: true,
                displayId: true,
                user: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Build ledger entries
        const entries = [];

        // 1. Opening entry (only if initialized)
        if (isInitialized) {
            entries.push({
                id: storeRegister.id,
                type: 'OPENING',
                label: 'Opening Balance',
                amount: openingCash,
                direction: 'IN',
                timestamp: storeRegister.createdAt,
                userName: storeRegister.openedBy?.name || 'Admin',
                reference: null,
                referenceName: 'Daily Opening Cash',
                metadata: { denominations: storeRegister.openingDenominations }
            });
        }

        // 2. Agent outflows (float given to agents)
        agentOutflows.forEach(o => {
            if (o.totalOpeningCash <= 0 && !o.isNoService) return;
            const agentName = o.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT')?.name || 'Unknown Agent';
            entries.push({
                id: o.id,
                type: 'AGENT_OUTFLOW',
                label: `Float Assigned → ${agentName}`,
                amount: o.totalOpeningCash,
                direction: 'OUT',
                timestamp: o.createdAt,
                userName: o.user?.name || 'Admin',
                reference: o.vehicleId,
                referenceName: `${agentName} • ${o.vehicle?.vehicleNumber || ''} • Shift ${o.shift}`,
                metadata: { shift: o.shift, denominations: o.denominations, vehicleNumber: o.vehicle?.vehicleNumber, isNoService: o.isNoService }
            });
        });

        // 3. Agent inflows (shift cash deposited into safe)
        agentInflows.forEach(d => {
            entries.push({
                id: d.id,
                type: 'AGENT_INFLOW',
                label: `Cash Deposited ← ${d.user?.name || 'Agent'}`,
                amount: d.amount,
                direction: 'IN',
                timestamp: d.createdAt,
                userName: d.user?.name || 'Agent',
                reference: d.id,
                referenceName: `Shift ${d.shift} Cash`,
                metadata: { shift: d.shift, denominations: d.denominations, date: d.date }
            });
        });

        // 4. Store Expenses Outflows
        storeExpenses.forEach(e => {
            let displayAmount = e.amount;
            let isPartial = false;

            // Extract actual paid amount from metadata if it's a partial payment
            if (e.description && e.description.includes('[PAYMENT:')) {
                const paidMatch = e.description.match(/Paid:\s*₹?(\d+(\.\d+)?)/i);
                if (paidMatch && paidMatch[1]) {
                    displayAmount = parseFloat(paidMatch[1]);
                    if (e.description.includes('PARTIAL')) {
                        isPartial = true;
                    }
                }
            }

            entries.push({
                id: e.id,
                type: 'EXPENSE_OUTFLOW',
                label: `Expense: ${e.type}${isPartial ? ' (PARTIAL)' : ''}`,
                amount: displayAmount,
                direction: 'OUT',
                timestamp: e.createdAt,
                userName: e.user?.name || 'Staff',
                reference: e.id,
                referenceName: `${e.displayId || 'EXP'} • ${e.type}${isPartial ? ' [Partial]' : ''}`,
                metadata: {
                    description: e.description,
                    status: e.status,
                    paymentMode: e.paymentMode,
                    vehicleId: e.vehicleId,
                    fullAmount: e.amount,
                    isPartial: isPartial,
                    displayId: e.displayId
                }
            });
        });


        // 4. Bank transfers (cash moved from safe to bank)
        bankTransfers.forEach(b => {
            entries.push({
                id: b.id,
                type: 'BANK_TRANSFER',
                label: `Bank Transfer → ${b.branchName}`,
                amount: b.amount,
                direction: 'OUT',
                timestamp: b.createdAt || b.dateTime,
                userName: b.admin?.name || b.depositedBy,
                reference: b.id,
                referenceName: `${b.branchName} • ${b.depositedBy}`,
                metadata: { branchName: b.branchName, receiptImage: b.receiptImage, remark: b.remark }
            });
        });

        // 5. Safe movements (Available <-> Safe)
        safeMovements.forEach(s => {
            entries.push({
                id: s.id,
                type: 'SAFE_MOVEMENT',
                label: s.type === 'DEPOSIT' ? 'Moved to Safe' : 'Moved to Available',
                amount: s.amount,
                direction: s.type === 'DEPOSIT' ? 'OUT_TO_SAFE' : 'IN_FROM_SAFE',
                timestamp: s.createdAt,
                userName: s.user?.name || 'Admin',
                reference: s.id,
                referenceName: s.description || (s.type === 'DEPOSIT' ? 'Counter → Safe' : 'Safe → Counter'),
                metadata: { type: s.type, denominations: s.denominations, description: s.description }
            });
        });

        // 6. Direct POS Sales (Admin POS)
        storeSales.forEach(o => {
            const saleCash = o.paymentMode === 'CASH' ? o.totalAmount : (o.cashAmount || 0);
            entries.push({
                id: o.id,
                type: 'STORE_SALE',
                label: `POS Sale • ${o.paymentMode} • ${o.displayId || o.orderNumber}`,
                amount: o.totalAmount,           // Total amount shown in column
                cashImpact: saleCash,           // Actual cash added to register
                direction: 'IN',
                timestamp: o.createdAt,
                userName: o.user?.name || 'Admin',
                reference: o.id,
                referenceName: `${o.customerName || 'Walk-in'} • ${o.mobile || 'No Mobile'}`,
                metadata: {
                    orderNumber: o.displayId || o.orderNumber,
                    paymentMode: o.paymentMode,
                    items: o.items.map(i => ({ name: i.product?.name, qty: i.quantity, price: i.price }))
                }
            });
        });
        entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Compute running balance — tracks Total Store Cash (Available + Safe)
        const ledger = entries.map(entry => {
            const before = runningBalance;

            if (entry.type === 'STORE_SALE') {
                // Only the cash portion of a POS sale enters the store's physical cash
                runningBalance += (entry.cashImpact || 0);
            } else if (entry.direction === 'IN') {
                runningBalance += entry.amount;
            } else if (entry.direction === 'OUT') {
                // Determine if this outflow should deduct from physical store balance
                if (entry.type === 'EXPENSE_OUTFLOW') {
                    const isStoreCash = entry.metadata?.paymentMode === 'CASH' && !entry.metadata?.vehicleId;
                    const isReimbursement = entry.metadata?.paymentMode === 'PERSONAL_CASH';
                    if (isStoreCash || isReimbursement) {
                        runningBalance -= entry.amount;
                    }
                } else {
                    // Agent Outflows (Float) and Bank Transfers ALWAYS deduct from store cash
                    runningBalance -= entry.amount;
                }
            } else if (entry.type === 'SAFE_MOVEMENT') {
                // Internal movements (Counter <-> Safe) do not change the TOTAL store balance
                // runningBalance += 0;
            }

            return {
                ...entry,
                balanceBefore: parseFloat(before.toFixed(2)),
                balanceAfter: parseFloat(runningBalance.toFixed(2))
            };
        });

        // Closing entry if store is closed
        if (isInitialized && storeRegister.status === 'CLOSED' && storeRegister.actualClosingCash !== null) {
            ledger.push({
                id: `${storeRegister.id}-closing`,
                type: 'CLOSING',
                label: 'Store Safe Closed',
                amount: storeRegister.actualClosingCash,
                direction: 'NEUTRAL',
                timestamp: storeRegister.updatedAt,
                userName: storeRegister.closedBy?.name || 'Admin',
                reference: null,
                referenceName: `Physical: ₹${storeRegister.actualClosingCash?.toFixed(2)} | Variance: ₹${storeRegister.closingDifference?.toFixed(2)}`,
                metadata: {
                    expectedClosingCash: storeRegister.expectedClosingCash,
                    actualClosingCash: storeRegister.actualClosingCash,
                    closingDifference: storeRegister.closingDifference,
                    denominations: storeRegister.closingDenominations,
                    closingRemarks: storeRegister.closingRemarks
                },
                balanceBefore: parseFloat(runningBalance.toFixed(2)),
                balanceAfter: parseFloat(runningBalance.toFixed(2))
            });
        }

        const totalOutflow = entries.filter(e => e.type === 'AGENT_OUTFLOW').reduce((s, e) => s + e.amount, 0);
        const totalInflow = entries.filter(e => e.type === 'AGENT_INFLOW').reduce((s, e) => s + e.amount, 0);
        const totalBank = entries.filter(e => e.type === 'BANK_TRANSFER').reduce((s, e) => s + e.amount, 0);

        // Calculate Safe Cash specifically
        const totalMovedToSafe = safeMovements.filter(s => s.type === 'DEPOSIT').reduce((s, e) => s + e.amount, 0);
        const totalWithdrawnFromSafe = safeMovements.filter(s => s.type === 'WITHDRAW').reduce((s, e) => s + e.amount, 0);

        const safeBalance = totalMovedToSafe - totalWithdrawnFromSafe - totalBank;
        const totalStoreCash = parseFloat(runningBalance.toFixed(2));
        const availableCash = totalStoreCash - safeBalance;

        res.json({
            ledger: ledger.reverse(),
            summary: {
                openingCash: openingCash,
                totalOutflow: parseFloat(totalOutflow.toFixed(2)),
                totalInflow: parseFloat(totalInflow.toFixed(2)),
                totalBankTransfer: parseFloat(totalBank.toFixed(2)),
                totalStoreCash,
                safeBalance: parseFloat(safeBalance.toFixed(2)),
                availableCash: parseFloat(availableCash.toFixed(2)),
                currentBalance: totalStoreCash, // Keeping for backward compatibility
                status: storeRegister?.status || 'NOT_INITIALIZED',
                entryCount: ledger.length
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add movement between Available Cash and Safe Cash
// @route   POST /api/cash/safe-movement
// @access  Admin
export const createSafeTransaction = async (req, res, next) => {
    try {
        const { date, amount, type, denominations, description } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date || !amount || !type) {
            res.status(400);
            throw new Error('Store ID, Date, Amount, and Type are required');
        }

        // 🆕 Strict bounds checking on backend
        const allOpening = await prisma.openingCash.aggregate({ where: { storeId, date }, _sum: { totalOpeningCash: true } });
        const allDeposits = await prisma.storeDeposit.aggregate({ where: { storeId, date }, _sum: { amount: true } });
        const allBankDeposits = await prisma.bankDeposit.aggregate({ where: { storeId, date }, _sum: { amount: true } });
        const allSafeDeposits = await prisma.safeTransaction.aggregate({ where: { storeId, date, type: 'DEPOSIT' }, _sum: { amount: true } });
        const allSafeWithdrawals = await prisma.safeTransaction.aggregate({ where: { storeId, date, type: 'WITHDRAW' }, _sum: { amount: true } });
        const storeRegister = await prisma.storeCashRegister.findUnique({ where: { storeId_date: { storeId, date } } });

        if (!storeRegister) {
            res.status(400);
            throw new Error('Store Register not found for this date. Initialize safe first.');
        }

        const assignedOut = allOpening._sum.totalOpeningCash || 0;
        const receivedIn = allDeposits._sum.amount || 0;
        const bankTransferred = allBankDeposits._sum.amount || 0;
        const movedToSafe = allSafeDeposits._sum.amount || 0;
        const withdrawnFromSafe = allSafeWithdrawals._sum.amount || 0;

        // Add POS Sales (CASH part — in-store only)
        const storeSales = await prisma.order.findMany({
            where: {
                storeId,
                vehicleId: null,
                createdAt: {
                    gte: new Date(`${date}T00:00:00.000Z`),
                    lte: new Date(`${date}T23:59:59.999Z`)
                },
                status: { in: ['PAID', 'COMPLETED'] }
            },
            select: { paymentMode: true, totalAmount: true, cashAmount: true }
        });

        const totalPOSCash = storeSales.reduce((sum, o) => {
            const cash = o.paymentMode === 'CASH' ? o.totalAmount : (o.cashAmount || 0);
            return sum + cash;
        }, 0);

        // Standard Calculation
        const totalStoreCash = storeRegister.openingCash + totalPOSCash + receivedIn - assignedOut - bankTransferred;
        const safeBalance = movedToSafe - withdrawnFromSafe - bankTransferred;
        const availableCash = totalStoreCash - safeBalance;

        if (type === 'DEPOSIT' && amount > (availableCash + 0.01)) {
            res.status(400);
            throw new Error(`Limit Exceeded: The movement amount exceeds the available cash on hand (Current Max: ₹${Math.max(0, availableCash).toFixed(2)})`);
        }
        if (type === 'WITHDRAW' && amount > safeBalance) {
            res.status(400);
            throw new Error(`Limit Exceeded: The requested withdrawal exceeds the currently available safe balance (Current Max: ₹${Math.max(0, safeBalance).toFixed(2)})`);
        }

        const movement = await prisma.safeTransaction.create({
            data: {
                tenantId: req.user.tenantId,
                storeId,
                date,
                amount,
                type, // DEPOSIT or WITHDRAW
                denominations,
                description,
                userId: req.user.id
            }
        });

        res.json(movement);
    } catch (error) {
        next(error);
    }
};

// @desc    Open the Store Cash Register for the day
// @route   POST /api/cash/store-register/open
// @access  Admin
export const openStoreCashRegister = async (req, res, next) => {
    try {
        const { date, openingCash, denominations } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date || openingCash === undefined || !denominations) {
            res.status(400);
            throw new Error('Store ID, Date, Opening Cash, and Denominations are required');
        }

        const newRegister = await prisma.storeCashRegister.create({
            data: {
                tenantId: req.user.tenantId,
                storeId,
                date,
                openingCash,
                openingDenominations: denominations,
                openedById: req.user.id,
                status: 'OPEN'
            }
        });

        res.json(newRegister);
    } catch (error) {
        if (error.code === 'P2002') {
            // Idempotent: If already open, just return the existing one
            const existing = await prisma.storeCashRegister.findUnique({
                where: { storeId_date: { storeId, date } }
            });
            if (existing) return res.json(existing);

            res.status(400);
            return next(new Error('Store Cash Register is already open for this date'));
        }
        next(error);
    }
};

// @desc    Close the Store Cash Register for the day
// @route   POST /api/cash/store-register/close
// @access  Admin
export const closeStoreCashRegister = async (req, res, next) => {
    try {
        const { date, actualClosingCash, denominations, remarks } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date || actualClosingCash === undefined || !denominations) {
            res.status(400);
            throw new Error('Store ID, Date, Closing Cash, and Denominations are required');
        }

        // Calculate live expected physically first
        const storeRegister = await prisma.storeCashRegister.findUnique({
            where: { storeId_date: { storeId, date } }
        });

        if (!storeRegister) {
            res.status(404);
            throw new Error('Store Cash Register not found for this date');
        }

        if (storeRegister.status === 'CLOSED') {
            res.status(400);
            throw new Error('Store Cash Register is already closed for this date');
        }

        // Accumulate all factors for Available Cash (Counter Cash)
        const allOpening = await prisma.openingCash.aggregate({
            where: { storeId, date },
            _sum: { totalOpeningCash: true }
        });

        const allDeposits = await prisma.storeDeposit.aggregate({
            where: { storeId, date },
            _sum: { amount: true }
        });

        const allBankDeposits = await prisma.bankDeposit.aggregate({
            where: { storeId, date },
            _sum: { amount: true }
        });

        // POS Cash Sales (in-store only)
        const storeSales = await prisma.order.findMany({
            where: {
                storeId,
                vehicleId: null,
                createdAt: {
                    gte: new Date(`${date}T00:00:00.000Z`),
                    lte: new Date(`${date}T23:59:59.999Z`)
                },
                status: { in: ['PAID', 'COMPLETED'] }
            },
            select: { paymentMode: true, totalAmount: true, cashAmount: true }
        });

        const totalPOSCash = storeSales.reduce((sum, o) => {
            const cash = o.paymentMode === 'CASH' ? o.totalAmount : (o.cashAmount || 0);
            return sum + cash;
        }, 0);

        const assignedOut = allOpening._sum.totalOpeningCash || 0;
        const receivedIn = allDeposits._sum.amount || 0;
        const bankTransferred = allBankDeposits._sum.amount || 0;

        // Expected Available Cash = Opening + POS_Cash + Agent_Deposits - Agent_Deployments - Bank_Transfers
        const liveExpected = storeRegister.openingCash + totalPOSCash + receivedIn - assignedOut - bankTransferred;

        const closingDifference = actualClosingCash - liveExpected;

        const closedRegister = await prisma.storeCashRegister.update({
            where: { storeId_date: { storeId, date } },
            data: {
                expectedClosingCash: liveExpected,
                actualClosingCash,
                closingDifference,
                closingDenominations: denominations,
                closingRemarks: remarks,
                closedById: req.user.id,
                status: 'CLOSED'
            }
        });

        res.json(closedRegister);
    } catch (error) {
        next(error);
    }
};

// @desc    RESET Store Cash Register for testing
// @route   DELETE /api/cash/store-register/:date/reset
// @access  Admin
export const resetStoreCashRegister = async (req, res, next) => {
    try {
        const { date } = req.params;
        const storeId = getEffectiveStoreId(req);

        await prisma.storeCashRegister.delete({
            where: { storeId_date: { storeId, date } }
        });

        res.json({ message: 'Register reset successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Create a store deposit per shift
// @route   POST /api/cash/store-register/deposit
// @access  Admin
export const createStoreDeposit = async (req, res, next) => {
    try {
        const { date, shift, amount, denominations, description } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date || !shift || amount === undefined || !denominations || !description) {
            res.status(400);
            throw new Error('All fields are required (date, shift, amount, denominations, description)');
        }

        const deposit = await prisma.storeDeposit.create({
            data: {
                tenantId: req.user.tenantId,
                storeId,
                date,
                shift: parseInt(shift),
                amount,
                denominations,
                description,
                userId: req.user.id
            }
        });

        res.json(deposit);
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400);
            return next(new Error(`A deposit for shift ${req.body.shift} has already been submitted for this date.`));
        }
        next(error);
    }
};

// @desc    Admin: Update Store Cash Register (Opening Cash or reset status)
// @route   PATCH /api/cash/store-register/update
// @access  Admin
export const updateStoreCashRegister = async (req, res, next) => {
    try {
        const { date, openingCash, denominations, status, actualClosingCash, isClosingUpdate } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date) {
            res.status(400);
            throw new Error('Store ID and Date are required');
        }

        const existing = await prisma.storeCashRegister.findUnique({
            where: { storeId_date: { storeId, date } }
        });

        if (!existing) {
            res.status(404);
            throw new Error('Store Register not found');
        }

        const updateData = {};
        if (openingCash !== undefined) updateData.openingCash = openingCash;
        if (denominations) updateData.openingDenominations = denominations;
        if (status) updateData.status = status;

        if (isClosingUpdate && actualClosingCash !== undefined) {
            updateData.actualClosingCash = actualClosingCash;
            updateData.closingDenominations = denominations; // reuse denominations field if provided
            updateData.closingDifference = actualClosingCash - existing.expectedClosingCash;
        }

        const updated = await prisma.storeCashRegister.update({
            where: { storeId_date: { storeId, date } },
            data: updateData
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Update a specific Store Deposit
// @route   PATCH /api/cash/store-register/deposit/:id
// @access  Admin
export const updateStoreDeposit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, denominations, description } = req.body;
        const tenantId = req.user.tenantId;

        if (!id) {
            res.status(400);
            throw new Error('Deposit ID is required');
        }

        const updated = await prisma.storeDeposit.update({
            where: { id, tenantId },
            data: {
                amount: parseFloat(amount),
                denominations: denominations || {},
                description
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('[updateStoreDeposit Error]:', error);
        next(error);
    }
};

// @desc    Admin: Delete a specific Store Deposit
// @route   DELETE /api/cash/store-register/deposit/:id
// @access  Admin
export const deleteStoreDeposit = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.storeDeposit.delete({
            where: { id }
        });

        res.json({ message: 'Deposit deleted successfully' });
    } catch (error) {
        next(error);
    }
};
// @desc    Admin: Add a Bank Deposit
// @route   POST /api/cash/store-register/bank-deposit
// @access  Admin
export const adminAddBankDeposit = async (req, res, next) => {
    try {
        const { date, amount, branchName, receiptImage, depositedBy, adminId, remark } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date || !amount || !branchName || !depositedBy) {
            res.status(400);
            throw new Error('All mandatory fields are required (Amount, Branch, Deposited By)');
        }

        // 🆕 Validate against current safe balance - Must be from safe ONLY and cannot go negative
        const allSafeDeposits = await prisma.safeTransaction.aggregate({
            where: { storeId, date, type: 'DEPOSIT' },
            _sum: { amount: true }
        });

        const allSafeWithdrawals = await prisma.safeTransaction.aggregate({
            where: { storeId, date, type: 'WITHDRAW' },
            _sum: { amount: true }
        });

        const allBankDeposits = await prisma.bankDeposit.aggregate({
            where: { storeId, date },
            _sum: { amount: true }
        });

        const movedToSafe = allSafeDeposits._sum.amount || 0;
        const withdrawnFromSafe = allSafeWithdrawals._sum.amount || 0;
        const bankTransferred = allBankDeposits._sum.amount || 0;

        const currentSafeBalance = movedToSafe - withdrawnFromSafe - bankTransferred;

        if (amount > currentSafeBalance) {
            res.status(400);
            throw new Error(`Insufficient funds in Safe! Available: ₹${currentSafeBalance.toFixed(2)}, Requested: ₹${amount.toFixed(2)}`);
        }

        const bankDeposit = await prisma.bankDeposit.create({
            data: {
                tenantId: req.user.tenantId,
                storeId,
                date,
                amount,
                branchName,
                receiptImage,
                depositedBy,
                adminId,
                remark
            }
        });

        res.json(bankDeposit);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Delete a Bank Deposit
// @route   DELETE /api/cash/store-register/bank-deposit/:id
// @access  Admin
export const deleteBankDeposit = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.bankDeposit.delete({ where: { id } });
        res.json({ message: 'Bank deposit deleted successfully' });
    } catch (error) {
        next(error);
    }
};
