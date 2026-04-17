import prisma from '../utils/prisma.js';
import { format } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';
import { logActivity } from '../utils/activityLogger.js';


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
                storeId: req.user.storeId,
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
            storeId: req.user.storeId,
            action: 'OPENING_CASH_SUBMITTED',
            details: `Submitted opening cash of ₹${totalOpeningCash} for Shift ${shift}`,
            metadata: { vehicleId, amount: totalOpeningCash, shift, date: dateString }
        });

        // Recalculate daily summary
        await recalculateDailySummary(vehicleId, dateString, req.user.tenantId, req.user.storeId);

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
                storeId: req.user.storeId,
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
                    storeId: req.user.storeId,
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
        await recalculateDailySummary(vehicleId, dateString, req.user.tenantId, req.user.storeId);

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

        // Calculate total day's Cash Sales
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
        const totalDaySales = pureCash + splitCash;

        const pureUpi = orderSalesRes.find(o => o.paymentMode === 'UPI')?._sum.totalAmount || 0;
        const splitUpi = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.upiAmount || 0;
        const totalDayUpi = pureUpi + splitUpi;

        const totalDayCard = orderSalesRes.find(o => o.paymentMode === 'CARD')?._sum.totalAmount || 0;

        // Calculate total day's expenses
        const expensesResult = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                tenantId: req.user.tenantId,
                vehicleId,
                date: dateString,
                paymentMode: 'CASH',
                NOT: { status: 'REJECTED' }
            }
        });
        const totalDayExpenses = expensesResult._sum.amount || 0;

        // Per-shift calculation
        let shiftCashSales = totalDaySales;
        let shiftUpiSales = totalDayUpi;
        let shiftCardSales = totalDayCard;
        let shiftExpenses = totalDayExpenses;

        if (shift === 2) {
            const shift1Record = await prisma.closingCash.findUnique({
                where: { 
                    vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 }
                }
            });
            shiftCashSales = Math.max(0, totalDaySales - (shift1Record?.cashSales || 0));
            shiftUpiSales = Math.max(0, totalDayUpi - (shift1Record?.upiSales || 0));
            shiftCardSales = Math.max(0, totalDayCard - (shift1Record?.cardSales || 0));
            shiftExpenses = Math.max(0, totalDayExpenses - (shift1Record?.expenses || 0));
        }

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
                storeId: req.user.storeId,
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
            storeId: req.user.storeId,
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
        await recalculateDailySummary(vehicleId, dateString, req.user.tenantId, req.user.storeId);

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
                metadata: { vehicleId, difference, actualCash, expectedCash, shift }
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

        const expensesResult = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                tenantId: req.user.tenantId,
                vehicleId,
                date: dateString,
                paymentMode: 'CASH',
                NOT: { status: 'REJECTED' }
            }
        });
        const totalExpenses = expensesResult._sum.amount || 0;

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
        const { date, storeId } = req.query;
        const dateString = date || format(new Date(), 'yyyy-MM-dd');

        const vehicleFilter = { tenantId: req.user.tenantId, status: true };
        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            vehicleFilter.storeId = storeId;
        } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
            vehicleFilter.storeId = req.user.storeId;
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

        const startOfDayDate = new Date(dateString);
        startOfDayDate.setHours(0, 0, 0, 0);
        const endOfDayDate = new Date(dateString);
        endOfDayDate.setHours(23, 59, 59, 999);

        const orderAggregates = await prisma.order.groupBy({
            by: ['vehicleId', 'paymentMode'],
            _sum: { totalAmount: true },
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
                NOT: { status: 'REJECTED' }
            }
        });

        const results = vehicles.map((v) => {
            const s = summaries.find(sum => sum.vehicleId === v.id);
            const openings = openingCashRecords.filter(o => o.vehicleId === v.id);
            const closings = closingCashRecords.filter(c => c.vehicleId === v.id);
            const orders = orderAggregates.filter(o => o.vehicleId === v.id);
            const expenses = expenseAggregates.filter(e => e.vehicleId === v.id);

            const totalRealtimeCashSales = orders.filter(o => o.paymentMode === 'CASH').reduce((sum, o) => sum + (o._sum.totalAmount || 0), 0);
            const totalRealtimeUpiSales = orders.filter(o => o.paymentMode === 'UPI').reduce((sum, o) => sum + (o._sum.totalAmount || 0), 0);
            const totalRealtimeCardSales = orders.filter(o => o.paymentMode === 'CARD').reduce((sum, o) => sum + (o._sum.totalAmount || 0), 0);
            const totalRealtimeExpenses = expenses.reduce((sum, e) => sum + (e._sum.amount || 0), 0);

            const o1 = openings.find(o => o.shift === 1);
            const o2 = openings.find(o => o.shift === 2);
            const c1 = closings.find(c => c.shift === 1);
            const c2 = closings.find(c => c.shift === 2);

            let s1Live = { cashSales: 0, upiSales: 0, cardSales: 0, expenses: 0, expected: 0 };
            let s2Live = { cashSales: 0, upiSales: 0, cardSales: 0, expenses: 0, expected: 0 };

            if (o1 && !c1) {
                s1Live.cashSales = totalRealtimeCashSales;
                s1Live.upiSales = totalRealtimeUpiSales;
                s1Live.cardSales = totalRealtimeCardSales;
                s1Live.expenses = totalRealtimeExpenses;
                s1Live.expected = o1.totalOpeningCash + s1Live.cashSales - s1Live.expenses;
            } else if (c1) {
                s1Live.cashSales = c1.cashSales;
                s1Live.upiSales = c1.upiSales;
                s1Live.cardSales = c1.cardSales;
                s1Live.expenses = c1.expenses;
                s1Live.expected = c1.expectedCash;
            }

            if (o2 && !c2) {
                const s1AccountedSales = c1?.cashSales || 0;
                const s1AccountedUpi = c1?.upiSales || 0;
                const s1AccountedCard = c1?.cardSales || 0;
                const s1AccountedExpenses = c1?.expenses || 0;
                
                s2Live.cashSales = Math.max(0, totalRealtimeCashSales - s1AccountedSales);
                s2Live.upiSales = Math.max(0, totalRealtimeUpiSales - s1AccountedUpi);
                s2Live.cardSales = Math.max(0, totalRealtimeCardSales - s1AccountedCard);
                s2Live.expenses = Math.max(0, totalRealtimeExpenses - s1AccountedExpenses);
                s2Live.expected = o2.totalOpeningCash + s2Live.cashSales - s2Live.expenses;
            } else if (c2) {
                s2Live.cashSales = c2.cashSales;
                s2Live.upiSales = c2.upiSales;
                s2Live.cardSales = c2.cardSales;
                s2Live.expenses = c2.expenses;
                s2Live.expected = c2.expectedCash;
            }

            return {
                id: s ? s.id : `temp-${v.id}`,
                vehicleId: v.id,
                date: dateString,
                tenantId: req.user.tenantId,
                storeId: v.storeId,
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
                storeId: req.user.storeId,
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
                    storeId: req.user.storeId,
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
        const updatedSummary = await recalculateDailySummary(vehicleId, date, req.user.tenantId, req.user.storeId);

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

    // 3. Calculate Approved/Pending Cash Expenses
    const expensesRes = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
            tenantId,
            vehicleId,
            date,
            paymentMode: 'CASH',
            NOT: { status: 'REJECTED' }
        }
    });
    const expenses = expensesRes._sum.amount || 0;

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
        } else if (req.user.storeId) {
            baseFilter.storeId = req.user.storeId;
        }

        // 1. Daily Summary (Daily Cash Sheet)
        const dailySummaries = await prisma.dailyCashSummary.findMany({
            where: baseFilter,
            include: {
                vehicle: {
                    select: { vehicleNumber: true }
                }
            }
        });

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
        } else if (req.user.storeId) {
            expenseFilter.storeId = req.user.storeId;
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

        res.json({
            dailySheet: dailySummaries,
            expenseBreakdown: expenses,
            profitability
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
        await recalculateDailySummary(vehicleId, date, req.user.tenantId, req.user.storeId);

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
