import prisma from '../utils/prisma.js';
import { format } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';


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
                vehicleId,
                userId,
                date: dateString,
                shift,
                denominations,
                totalOpeningCash,
            },
        });

        // Recalculate daily summary (aggregates both shifts)
        await recalculateDailySummary(vehicleId, dateString);

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
        const { vehicleId, denominations, totalOpeningCash, userId, shift = 1 } = req.body;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (!vehicleId || !userId || totalOpeningCash === undefined) {
            res.status(400);
            throw new Error('Vehicle ID, User ID, and total are required');
        }

        if (![1, 2].includes(shift)) {
            res.status(400);
            throw new Error('Shift must be 1 (Morning) or 2 (Afternoon)');
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
                denominations: denominations || {},
                totalOpeningCash,
                userId,
            },
            create: {
                vehicleId,
                userId,
                date: dateString,
                shift,
                denominations: denominations || {},
                totalOpeningCash,
            },
        });

        // Recalculate daily summary (aggregates both shifts)
        await recalculateDailySummary(vehicleId, dateString);

        res.status(201).json(openingCash);

        sendNotification({
            userIds: [userId],
            roles: ['ADMIN'],
            title: `Shift ${shift} Float Assigned`,
            message: `₹${totalOpeningCash} opening cash assigned for Shift ${shift}.`,
            type: 'cash',
            priority: 'medium',
            metadata: { vehicleId, amount: totalOpeningCash, shift }
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

// @desc    Submit closing cash for a vehicle (agent submits for a specific shift)
// @route   POST /api/cash/closing
// @access  Private
export const submitClosingCash = async (req, res, next) => {
    try {
        const { vehicleId, actualCash, denominations, remark, shift = 1 } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (![1, 2].includes(shift)) {
            res.status(400);
            throw new Error('Shift must be 1 (Morning) or 2 (Afternoon)');
        }

        // Enforce: Shift 1 must be closed before Shift 2
        if (shift === 2) {
            const shift1Closing = await prisma.closingCash.findUnique({
                where: { vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 } }
            });
            if (!shift1Closing) {
                res.status(400);
                throw new Error('Shift 1 must be closed before closing Shift 2');
            }
        }

        // Get the opening cash for THIS shift only
        const shiftOpening = await prisma.openingCash.findUnique({
            where: { vehicleId_date_shift: { vehicleId, date: dateString, shift } }
        });

        if (!shiftOpening) {
            res.status(400);
            throw new Error(`Opening cash for Shift ${shift} must be assigned first`);
        }

        // Calculate total day's Cash Sales
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const cashSalesResult = await prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: {
                vehicleId,
                paymentMode: 'CASH',
                status: 'COMPLETED',
                createdAt: { gte: startOfDay, lte: endOfDay },
            },
        });
        const totalDaySales = cashSalesResult._sum.totalAmount || 0;

        // Calculate total day's expenses
        const expensesResult = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                vehicleId,
                date: dateString,
                paymentMode: 'CASH',
                NOT: { status: 'REJECTED' }
            }
        });
        const totalDayExpenses = expensesResult._sum.amount || 0;

        // Per-shift calculation: each shift is INDEPENDENT
        let shiftCashSales = totalDaySales;
        let shiftExpenses = totalDayExpenses;

        if (shift === 2) {
            // Shift 2 gets only what's NEW since Shift 1 closed
            const shift1Record = await prisma.closingCash.findUnique({
                where: { vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 } }
            });
            const s1Sales = shift1Record?.cashSales || 0;
            const s1Expenses = shift1Record?.expenses || 0;
            shiftCashSales = totalDaySales - s1Sales;
            shiftExpenses = totalDayExpenses - s1Expenses;
        }

        // Expected = THIS shift's opening + THIS shift's sales - THIS shift's expenses
        const expectedCash = shiftOpening.totalOpeningCash + shiftCashSales - shiftExpenses;
        const difference = actualCash - expectedCash;

        if (difference !== 0 && !remark) {
            res.status(400);
            throw new Error('Remark is required if there is a difference');
        }

        const closingCash = await prisma.closingCash.upsert({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift },
            },
            update: {
                openingCash: shiftOpening.totalOpeningCash,
                cashSales: shiftCashSales,
                expenses: shiftExpenses,
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
                shift,
                openingCash: shiftOpening.totalOpeningCash,
                cashSales: shiftCashSales,
                expenses: shiftExpenses,
                expectedCash,
                actualCash,
                difference,
                denominations,
                remark,
            },
        });

        // Recalculate daily summary
        await recalculateDailySummary(vehicleId, dateString);

        res.status(201).json(closingCash);

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
            where: { vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 } },
        });
        const opening2 = await prisma.openingCash.findUnique({
            where: { vehicleId_date_shift: { vehicleId, date: dateString, shift: 2 } },
        });
        const closing1 = await prisma.closingCash.findUnique({
            where: { vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 } },
        });
        const closing2 = await prisma.closingCash.findUnique({
            where: { vehicleId_date_shift: { vehicleId, date: dateString, shift: 2 } },
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const cashSalesResult = await prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: {
                vehicleId,
                paymentMode: 'CASH',
                status: 'COMPLETED',
                createdAt: { gte: startOfDay, lte: endOfDay },
            },
        });
        const totalCashSales = cashSalesResult._sum.totalAmount || 0;

        const expensesResult = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                vehicleId,
                date: dateString,
                paymentMode: 'CASH',
                NOT: { status: 'REJECTED' }
            }
        });
        const totalExpenses = expensesResult._sum.amount || 0;

        // Per-shift sales/expenses split
        const s1Sales = closing1?.cashSales || (closing1 ? 0 : totalCashSales); // if S1 not closed, all current sales belong to S1
        const s1Expenses = closing1?.expenses || (closing1 ? 0 : totalExpenses);
        const s2Sales = closing1 ? totalCashSales - s1Sales : 0; // S2 only gets sales after S1 closed
        const s2Expenses = closing1 ? totalExpenses - s1Expenses : 0;

        const totalOpening = (opening1?.totalOpeningCash || 0) + (opening2?.totalOpeningCash || 0);

        res.json({
            vehicleAssigned: true,
            // Aggregated values (backward compat)
            openingSubmitted: !!opening1,
            closingSubmitted: !!closing2 || !!closing1,
            openingCash: totalOpening,
            cashSales: totalCashSales,
            expenses: totalExpenses,
            // Per-shift detail
            shifts: {
                shift1: {
                    openingAssigned: !!opening1,
                    openingCash: opening1?.totalOpeningCash || 0,
                    openingDenominations: opening1?.denominations || null,
                    closingSubmitted: !!closing1,
                    closingDenominations: closing1?.denominations || null,
                    closingActual: closing1?.actualCash || 0,
                    closingDifference: closing1?.difference || 0,
                    cashSales: closing1 ? s1Sales : totalCashSales, // if S1 not yet closed, show all current sales
                    expenses: closing1 ? s1Expenses : totalExpenses,
                },
                shift2: {
                    openingAssigned: !!opening2,
                    openingCash: opening2?.totalOpeningCash || 0,
                    openingDenominations: opening2?.denominations || null,
                    closingSubmitted: !!closing2,
                    closingDenominations: closing2?.denominations || null,
                    closingActual: closing2?.actualCash || 0,
                    closingDifference: closing2?.difference || 0,
                    cashSales: s2Sales,
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

        const summaries = await prisma.dailyCashSummary.findMany({
            where: { date: dateString },
            include: {
                vehicle: {
                    select: {
                        vehicleNumber: true,
                        vehicleName: true,
                        assignedUsers: {
                            select: { id: true, name: true, role: true }
                        }
                    },
                },
            },
        });

        // Enrich with per-shift opening data
        const enriched = await Promise.all(
            summaries.map(async (s) => {
                const openings = await prisma.openingCash.findMany({
                    where: { vehicleId: s.vehicleId, date: s.date },
                    select: { shift: true, totalOpeningCash: true, denominations: true },
                    orderBy: { shift: 'asc' }
                });
                const closings = await prisma.closingCash.findMany({
                    where: { vehicleId: s.vehicleId, date: s.date },
                    select: { shift: true, actualCash: true, difference: true, denominations: true, cashSales: true, expenses: true, expectedCash: true, openingCash: true, remark: true },
                    orderBy: { shift: 'asc' }
                });

                // Fetch total sales by payment mode for the whole day
                const startOfDay = new Date(s.date);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(s.date);
                endOfDay.setHours(23, 59, 59, 999);

                const salesByMode = await prisma.order.groupBy({
                    by: ['paymentMode'],
                    _sum: { totalAmount: true },
                    where: {
                        vehicleId: s.vehicleId,
                        status: 'COMPLETED',
                        createdAt: { gte: startOfDay, lte: endOfDay }
                    }
                });

                let dailyCashSales = 0, dailyUpiSales = 0, dailyCardSales = 0;
                salesByMode.forEach(item => {
                    if (item.paymentMode === 'CASH') dailyCashSales += item._sum.totalAmount || 0;
                    if (item.paymentMode === 'UPI') dailyUpiSales += item._sum.totalAmount || 0;
                    if (item.paymentMode === 'CARD') dailyCardSales += item._sum.totalAmount || 0;
                });

                return {
                    ...s,
                    dailySales: {
                        totalCash: dailyCashSales,
                        totalUpi: dailyUpiSales,
                        totalCard: dailyCardSales,
                        grandTotal: dailyCashSales + dailyUpiSales + dailyCardSales
                    },
                    openingDenominations: openings[0]?.denominations || {},
                    shiftDetails: {
                        shift1: {
                            opening: openings.find(o => o.shift === 1) || null,
                            closing: closings.find(c => c.shift === 1) || null,
                        },
                        shift2: {
                            opening: openings.find(o => o.shift === 2) || null,
                            closing: closings.find(c => c.shift === 2) || null,
                        }
                    }
                };
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
        const { vehicleId, date, openingCash, denominations, remark, shift = 1 } = req.body;

        if (!vehicleId || !date || openingCash === undefined) {
            res.status(400);
            throw new Error('Vehicle ID, Date, and Opening Cash are required');
        }

        // Update the specific shift's OpeningCash record
        await prisma.openingCash.upsert({
            where: { vehicleId_date_shift: { vehicleId, date, shift } },
            update: {
                totalOpeningCash: openingCash,
                denominations: denominations || {},
            },
            create: {
                vehicleId,
                date,
                shift,
                userId: req.user.id,
                totalOpeningCash: openingCash,
                denominations: denominations || {},
            },
        });

        // Recalculate daily summary (aggregates both shifts)
        const updatedSummary = await recalculateDailySummary(vehicleId, date);

        const finalSummary = await prisma.dailyCashSummary.findUnique({
            where: { vehicleId_date: { vehicleId, date } },
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
export async function recalculateDailySummary(vehicleId, date) {
    if (!vehicleId || !date) return;

    // 1. Get Opening Cash from BOTH shifts
    const openings = await prisma.openingCash.findMany({
        where: { vehicleId, date }
    });
    const totalOpeningCash = openings.reduce((sum, o) => sum + o.totalOpeningCash, 0);
    const primaryUserId = openings[0]?.userId || 'SYSTEM';

    // 2. Calculate Cash Sales from Orders
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const cashSalesRes = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
            vehicleId,
            paymentMode: 'CASH',
            status: 'COMPLETED',
            createdAt: { gte: startOfDay, lte: endOfDay }
        }
    });
    const cashSales = cashSalesRes._sum.totalAmount || 0;

    // 3. Calculate Approved/Pending Cash Expenses
    const expensesRes = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
            vehicleId,
            date,
            paymentMode: 'CASH',
            NOT: { status: 'REJECTED' }
        }
    });
    const expenses = expensesRes._sum.amount || 0;

    // 4. Get Actual Cash from the LATEST closing (Shift 2 takes priority, fallback to Shift 1)
    const closing2 = await prisma.closingCash.findUnique({
        where: { vehicleId_date_shift: { vehicleId, date, shift: 2 } }
    });
    const closing1 = await prisma.closingCash.findUnique({
        where: { vehicleId_date_shift: { vehicleId, date, shift: 1 } }
    });
    const latestClosing = closing2 || closing1;
    const actualCash = latestClosing?.actualCash || 0;

    // 5. Calculate Expected and Difference
    const expectedCash = totalOpeningCash + cashSales - expenses;
    const difference = actualCash - expectedCash;

    // 6. Upsert Daily Summary
    return await prisma.dailyCashSummary.upsert({
        where: { vehicleId_date: { vehicleId, date } },
        update: {
            openingCash: totalOpeningCash,
            cashSales,
            expenses,
            expectedCash,
            actualCash,
            difference,
            status: actualCash > 0 ? (difference === 0 ? 'MATCHED' : 'MISMATCHED') : 'PENDING'
        },
        create: {
            vehicleId,
            userId: primaryUserId,
            date,
            openingCash: totalOpeningCash,
            cashSales,
            expenses,
            expectedCash,
            actualCash,
            difference,
            status: actualCash > 0 ? (difference === 0 ? 'MATCHED' : 'MISMATCHED') : 'PENDING'
        }
    });
}

// @desc    Admin: Get finance reports (aggregated cash, expenses, profitability)
// @route   GET /api/cash/admin/finance/reports
// @access  Admin
export const getFinanceReports = async (req, res, next) => {
    try {
        const { date, startDate, endDate } = req.query;
        const targetDate = date || format(new Date(), 'yyyy-MM-dd');

        // 1. Daily Summary (Daily Cash Sheet)
        const dailySummaries = await prisma.dailyCashSummary.findMany({
            where: {
                ...(date ? { date: targetDate } : {
                    date: {
                        gte: startDate,
                        lte: endDate || targetDate
                    }
                })
            },
            include: {
                vehicle: {
                    select: { vehicleNumber: true }
                }
            }
        });

        // 2. Expense Category Breakdown
        const expenses = await prisma.expense.groupBy({
            by: ['type'],
            _sum: { amount: true },
            where: {
                status: 'APPROVED',
                ...(date ? { date: targetDate } : {
                    date: {
                        gte: startDate,
                        lte: endDate || targetDate
                    }
                })
            }
        });

        // 3. Profitability (Simplified: Sales - approved expenses)
        const salesByVehicle = await prisma.dailyCashSummary.groupBy({
            by: ['vehicleId'],
            _sum: { cashSales: true, expenses: true },
            where: {
                ...(date ? { date: targetDate } : {
                    date: {
                        gte: startDate,
                        lte: endDate || targetDate
                    }
                })
            }
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
