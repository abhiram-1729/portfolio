import prisma from '../utils/prisma.js';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';
import { uploadToSupabase } from '../utils/supabaseService.js';
import { recalculateDailySummary } from './cashController.js';
import { generateId } from '../utils/idGenerator.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Add expense entry
// @route   POST /api/expenses
// @access  Private (VGE)
export const addExpense = async (req, res, next) => {
    try {
        const {
            type,
            amount,
            paymentMode,
            description,
            billImage,
            vehicleId
        } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');
        const parsedAmount = parseFloat(amount);

        if (!type || !amount || !paymentMode) {
            res.status(400);
            throw new Error('Type, amount, and payment mode are required');
        }

        // 1. Duplicate Detection (Same user, amount, type, and date within last 10 min)
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const duplicate = await prisma.expense.findFirst({
            where: {
                userId,
                amount: parsedAmount,
                type,
                date: dateString,
                createdAt: { gte: tenMinsAgo },
                status: { not: 'REJECTED' }
            }
        });

        if (duplicate) {
            res.status(400);
            throw new Error('Duplicate expense detected. You already submitted this expense recently.');
        }

        // 2. Category-level limit check (using ExpenseCategory.limit if defined)
        try {
            const categoryConfig = await prisma.expenseCategory.findFirst({
                where: { tenantId: req.user.tenantId, name: type, status: true }
            });
            if (categoryConfig?.limit && parsedAmount > categoryConfig.limit) {
                res.status(400);
                throw new Error(`This category (${type}) has a single-transaction limit of ₹${categoryConfig.limit}.`);
            }
        } catch (e) {
            if (e.message?.includes('limit')) throw e;
        }

        let imageUrl = billImage;
        if (req.file) {
            imageUrl = await uploadToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'vehicles',
                'expenses'
            );
        }

        const displayId = await generateId({
            entity: 'EXP',
            tenantId: req.user.tenantId,
            storeId: req.user.storeId
        });

        let dbPaymentMode = paymentMode;
        let dbDescription = description || '';

        if (paymentMode === 'PERSONAL_CASH') {
            dbPaymentMode = 'CASH';
            dbDescription = '[PERSONAL_CASH] ' + dbDescription;
        }

        const expense = await prisma.expense.create({
            data: {
                tenantId: req.user.tenantId,
                storeId: req.user.storeId,
                displayId,
                userId,
                vehicleId: vehicleId || req.user.assignedVehicleId,
                type,
                amount: parsedAmount,
                paymentMode: dbPaymentMode,
                description: dbDescription,
                billImage: imageUrl,
                date: dateString,
                status: 'PENDING'
            }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'EXPENSE_SUBMITTED',
            details: `Submitted ${type} expense of ₹${amount} (${paymentMode})`,
            metadata: { expenseId: expense.id, type, amount, paymentMode }
        });

        // CASH expenses affect daily cash immediately
        if (paymentMode === 'CASH') {
            await recalculateDailySummary(expense.vehicleId, dateString, req.user.tenantId, req.user.storeId);
        }

        res.status(201).json(expense);

        // Notify admins
        sendNotification({
            roles: ['ADMIN', 'SUPERVISOR'],
            title: 'New Expense Request',
            message: `${req.user.name} submitted a ${type} expense of ₹${amount}.`,
            type: 'expense',
            priority: parsedAmount > 5000 ? 'high' : 'medium',
            metadata: { expenseId: expense.id, amount }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's expenses (VGE)
// @route   GET /api/expenses/my
// @access  Private
export const getMyExpenses = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { date, status } = req.query;

        const expenses = await prisma.expense.findMany({
            where: {
                tenantId: req.user.tenantId,
                userId,
                ...(date && { date }),
                ...(status && { status })
            },
            orderBy: { createdAt: 'desc' }
        });

        const mappedExpenses = expenses.map(e => {
            if (e.description?.startsWith('[PERSONAL_CASH] ')) {
                return { ...e, paymentMode: 'PERSONAL_CASH', description: e.description.replace('[PERSONAL_CASH] ', '') };
            }
            return e;
        });

        res.json(mappedExpenses);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Get all expenses for monitoring
// @route   GET /api/expenses/admin/all
// @access  Admin
export const getAllExpenses = async (req, res, next) => {
    try {
        const { date, startDate, endDate, userId, status, storeId, minAmount, maxAmount, paymentMode } = req.query;

        const where = {
            tenantId: req.user.tenantId,
            ...(userId && { userId }),
            ...(status && { status }),
        };

        if (paymentMode) {
            if (paymentMode === 'PERSONAL_CASH') {
                where.paymentMode = 'CASH';
                where.description = { contains: '[PERSONAL_CASH]' };
            } else if (paymentMode === 'CASH') {
                where.paymentMode = 'CASH';
                where.NOT = {
                    description: { contains: '[PERSONAL_CASH]' }
                };
            } else {
                where.paymentMode = paymentMode;
            }
        }

        if (startDate && endDate) {
            where.date = { gte: startDate, lte: endDate };
        } else if (date) {
            where.date = date;
        }

        // Amount range filter
        if (minAmount || maxAmount) {
            where.amount = {};
            if (minAmount) where.amount.gte = parseFloat(minAmount);
            if (maxAmount) where.amount.lte = parseFloat(maxAmount);
        }

        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            where.storeId = storeId;
        } else if (req.user.storeId) {
            where.storeId = req.user.storeId;
        }

        const expenses = await prisma.expense.findMany({
            where,
            include: {
                user: { select: { name: true, role: true } },
                vehicle: { select: { vehicleNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const mappedExpenses = expenses.map(e => {
            if (e.description?.startsWith('[PERSONAL_CASH] ')) {
                return { ...e, paymentMode: 'PERSONAL_CASH', description: e.description.replace('[PERSONAL_CASH] ', '') };
            }
            return e;
        });

        res.json(mappedExpenses);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Approve/Reject/Return/Verify expense
// @route   PUT /api/expenses/admin/:id/status
// @access  Admin
export const updateExpenseStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, remarks, utrNumber, approverName } = req.body;

        const effectivePaymentRef = utrNumber;

        // Only statuses that exist in the current DB enum
        const allowedStatuses = ['APPROVED', 'REJECTED', 'PAID', 'PENDING'];
        if (!allowedStatuses.includes(status)) {
            res.status(400);
            throw new Error('Invalid status');
        }

        const currentExpense = await prisma.expense.findUnique({ where: { id } });
        if (!currentExpense) {
            res.status(404);
            throw new Error('Expense not found');
        }

        // Monthly Cutoff: Prevent edits after 5th of next month (unless ADMIN role)
        const expenseDate = new Date(currentExpense.date);
        const today = new Date();
        const cutoffDate = new Date(expenseDate.getFullYear(), expenseDate.getMonth() + 1, 5);
        if (today > cutoffDate && req.user.role !== 'ADMIN' && req.user.role !== 'TENANT_OWNER') {
            res.status(400);
            throw new Error('This period is closed. Expenses from this date can no longer be modified.');
        }



        // Admin manually approves/rejects/pays
        let targetStatus = status;
        
        // AUTO-PAY logic:
        // 1. Store Expenses (vehicleId: null) -> PAID immediately on APPROVED
        if (status === 'APPROVED' && !currentExpense.vehicleId) {
            targetStatus = 'PAID';
        }

        // Build description with remarks
        let updatedDescription = currentExpense.description || '';
        if (remarks) {
            updatedDescription = `${updatedDescription}\n[${format(new Date(), 'dd/MM/yy HH:mm')} - ${req.user.name}]: ${remarks}`;
        }

        const effectiveApprover = (approverName || req.user.name).trim();

        if (targetStatus === 'APPROVED') {
            if (!updatedDescription.includes('[APPROVED_BY:')) {
                updatedDescription = `${updatedDescription} [APPROVED_BY:${effectiveApprover}]`.trim();
            }
        } else if (targetStatus === 'PAID') {
            if (status === 'APPROVED' || !updatedDescription.includes('[APPROVED_BY:')) {
                // If it was already approved, don't duplicate, but if coming from PENDING to PAID directly (cash)
                if (!updatedDescription.includes('[APPROVED_BY:')) {
                    updatedDescription = `${updatedDescription} [APPROVED_BY:${effectiveApprover}]`.trim();
                }
            }
            if (!updatedDescription.includes('[PAID_BY:')) {
                updatedDescription = `${updatedDescription} [PAID_BY:${effectiveApprover}]`.trim();
            }
        }

        const updateData = {
            status: targetStatus,
            description: updatedDescription || undefined
        };

        const expense = await prisma.expense.update({
            where: { id, tenantId: req.user.tenantId },
            data: updateData,
            include: { user: true }
        });

        // Recalculate cash if needed
        if (expense.paymentMode === 'CASH') {
            await recalculateDailySummary(expense.vehicleId, expense.date, req.user.tenantId, req.user.storeId);
        }

        res.json(expense);

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: `EXPENSE_${targetStatus}`,
            details: `${targetStatus} ${expense.type} expense of ₹${expense.amount} for ${expense.user?.name}`,
            targetUserId: expense.userId,
            metadata: { expenseId: expense.id, status: targetStatus, amount: expense.amount, agentId: expense.userId }
        });

        sendNotification({
            userIds: [expense.userId],
            title: `Expense ${targetStatus.charAt(0) + targetStatus.slice(1).toLowerCase()}`,
            message: `Your ${expense.type} expense of ₹${expense.amount} has been ${targetStatus.toLowerCase()}.${remarks ? ` Remarks: ${remarks}` : ''}`,
            type: 'expense',
            priority: 'medium',
            metadata: { expenseId: expense.id, status: targetStatus }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Bulk update expense status
// @route   PUT /api/expenses/admin/bulk-status
// @access  Admin
export const bulkUpdateStatus = async (req, res, next) => {
    try {
        const { ids, status } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400);
            throw new Error('No IDs provided');
        }

        const allowedStatuses = ['APPROVED', 'REJECTED', 'PAID'];
        if (!allowedStatuses.includes(status)) {
            res.status(400);
            throw new Error('Invalid bulk status');
        }

        const expenses = await prisma.expense.findMany({
            where: { id: { in: ids }, tenantId: req.user.tenantId }
        });

        // Process each expense (CASH auto-pays on approval)
        const updatePromises = expenses.map(exp => {
            let targetStatus = status;

            // AUTO-PAY logic:
            // 1. Store Expenses (vehicleId: null) -> PAID immediately on APPROVED
            if (status === 'APPROVED' && !exp.vehicleId) {
                targetStatus = 'PAID';
            }

            let updatedDescription = exp.description || '';
            if (targetStatus === 'APPROVED' && !updatedDescription.includes('[APPROVED_BY:')) {
                updatedDescription = `${updatedDescription} [APPROVED_BY:${req.user.name}]`.trim();
            }
            if (targetStatus === 'PAID') {
                if (status === 'APPROVED' && !updatedDescription.includes('[APPROVED_BY:')) {
                    updatedDescription = `${updatedDescription} [APPROVED_BY:${req.user.name}]`.trim();
                }
                if (!updatedDescription.includes('[PAID_BY:')) {
                    updatedDescription = `${updatedDescription} [PAID_BY:${req.user.name}]`.trim();
                }
            }

            return prisma.expense.update({
                where: { id: exp.id },
                data: { status: targetStatus, description: updatedDescription || undefined }
            });
        });

        await Promise.all(updatePromises);

        // Recalculate cash summaries for affected CASH expenses
        const cashExpenses = expenses.filter(e => e.paymentMode === 'CASH');
        const pairs = [...new Set(cashExpenses.map(e => `${e.vehicleId}|${e.date}`))];
        for (const pair of pairs) {
            const [vId, date] = pair.split('|');
            if (vId && date) await recalculateDailySummary(vId, date, req.user.tenantId);
        }

        res.json({ message: `Successfully updated ${ids.length} expenses to ${status}` });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'EXPENSE_BULK_UPDATE',
            details: `Bulk updated ${ids.length} expenses to ${status}`,
            metadata: { count: ids.length, status, ids }
        });

        // Notify affected users
        const userIds = [...new Set(expenses.map(e => e.userId))];
        sendNotification({
            userIds,
            title: 'Expense Update',
            message: `${ids.length} of your expenses have been ${status.toLowerCase()}.`,
            type: 'expense',
            priority: 'medium'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Agent: Claim an approved expense (Finalize - for PERSONAL_CASH)
// @route   PUT /api/expenses/:id/claim
// @access  Private (VGE)
export const claimExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const expense = await prisma.expense.findUnique({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!expense) {
            res.status(404);
            throw new Error('Expense not found');
        }

        if (expense.userId !== userId) {
            res.status(403);
            throw new Error('Not authorized to claim this expense');
        }

        if (expense.status !== 'APPROVED') {
            res.status(400);
            throw new Error('Only approved expenses can be claimed');
        }

        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: { status: 'PAID' }
        });

        if (updatedExpense.paymentMode === 'CASH') {
            await recalculateDailySummary(updatedExpense.vehicleId, updatedExpense.date);
        }

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'EXPENSE_CLAIMED',
            details: `Agent claimed ₹${expense.amount} for ${expense.type}`,
            metadata: { expenseId: expense.id }
        });

        res.json(updatedExpense);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Get expense analytics summary
// @route   GET /api/expenses/admin/analytics
// @access  Admin
export const getExpenseAnalytics = async (req, res, next) => {
    try {
        const { startDate, endDate, storeId } = req.query;
        const today = format(new Date(), 'yyyy-MM-dd');
        const start = startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const end = endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd');

        const where = {
            tenantId: req.user.tenantId,
            date: { gte: start, lte: end },
            status: { not: 'REJECTED' }
        };

        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            where.storeId = storeId;
        } else if (req.user.storeId) {
            where.storeId = req.user.storeId;
        }

        const expenses = await prisma.expense.findMany({
            where,
            include: { user: { select: { name: true } } }
        });

        // Category breakdown
        const byCategory = {};
        const byAgent = {};
        const byPaymentMode = {};
        const byStatus = {};
        const byDate = {};

        for (const exp of expenses) {
            byCategory[exp.type] = (byCategory[exp.type] || 0) + exp.amount;
            byAgent[exp.user?.name || 'Unknown'] = (byAgent[exp.user?.name || 'Unknown'] || 0) + exp.amount;

            let mode = exp.paymentMode;
            if (exp.description?.includes('[PERSONAL_CASH]')) {
                mode = 'PERSONAL_CASH';
            }
            byPaymentMode[mode] = (byPaymentMode[mode] || 0) + exp.amount;
            byStatus[exp.status] = (byStatus[exp.status] || 0) + 1;
            byDate[exp.date] = (byDate[exp.date] || 0) + exp.amount;
        }

        const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
        const pendingAmount = expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0);
        const approvedAmount = expenses.filter(e => ['APPROVED', 'PAID'].includes(e.status)).reduce((s, e) => s + e.amount, 0);

        res.json({
            totalAmount,
            pendingAmount,
            approvedAmount,
            totalCount: expenses.length,
            byCategory: Object.entries(byCategory).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
            byAgent: Object.entries(byAgent).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 10),
            byPaymentMode: Object.entries(byPaymentMode).map(([mode, amount]) => ({ mode, amount })),
            byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
            byDate: Object.entries(byDate).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date))
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Expense Category Management - List (Role-Filtered)
// @route   GET /api/expenses/admin/categories
// @access  Private
export const getExpenseCategories = async (req, res, next) => {
    try {
        console.log(`[getExpenseCategories] Called by user: ${req.user.name} (Role: ${req.user.role}, Tenant: ${req.user.tenantId})`);

        const allCategories = await prisma.expenseCategory.findMany({
            where: { status: true, tenantId: req.user.tenantId },
            orderBy: { name: 'asc' }
        });

        // Role-based filtering using naming convention:
        // [AGENT] prefix  → visible to SALES_AGENT, HELPER only
        // [STORE] prefix  → visible to ADMIN, TENANT_OWNER, SUPERVISOR, SUPER_ADMIN only
        // No prefix       → visible to everyone
        const agentRoles = ['SALES_AGENT', 'HELPER'];
        const isAgent = agentRoles.includes(req.user.role);

        const filtered = allCategories
            .filter(cat => {
                const n = cat.name;
                if (n.startsWith('[AGENT]')) return isAgent;
                if (n.startsWith('[STORE]')) return !isAgent;
                return true; // untagged = visible to all
            })
            .map(cat => ({
                ...cat,
                // Strip [AGENT] / [STORE] prefix for clean display
                displayName: cat.name.replace(/^\[(AGENT|STORE)\]\s*/i, '')
            }));

        console.log(`[getExpenseCategories] Returning ${filtered.length} of ${allCategories.length} categories for role: ${req.user.role}`);
        res.json(filtered);
    } catch (error) {
        next(error);
    }
};


// @desc    Expense Category Management - Create
// @route   POST /api/expenses/admin/categories
// @access  Admin
export const createExpenseCategory = async (req, res, next) => {
    try {
        const { name, limit } = req.body;
        const existing = await prisma.expenseCategory.findFirst({
            where: { tenantId: req.user.tenantId, name }
        });

        if (existing) {
            return res.status(400).json({ message: 'Category name already exists' });
        }

        const category = await prisma.expenseCategory.create({
            data: {
                tenantId: req.user.tenantId,
                name,
                limit: limit ? parseFloat(limit) : null
            }
        });
        res.status(201).json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Category name already exists' });
        }
        next(error);
    }
};

// @desc    Expense Category Management - Update
// @route   PUT /api/expenses/admin/categories/:id
// @access  Admin
export const updateExpenseCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, limit } = req.body;

        if (name) {
            const existing = await prisma.expenseCategory.findFirst({
                where: {
                    tenantId: req.user.tenantId,
                    name,
                    id: { not: id }
                }
            });
            if (existing) return res.status(400).json({ message: 'Category name already exists' });
        }

        const category = await prisma.expenseCategory.update({
            where: { id, tenantId: req.user.tenantId },
            data: { name, limit: limit ? parseFloat(limit) : null }
        });
        res.json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Category name already exists' });
        }
        next(error);
    }
};

// @desc    Expense Category Management - Delete
// @route   DELETE /api/expenses/admin/categories/:id
// @access  Admin
export const deleteExpenseCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.expenseCategory.update({
            where: { id, tenantId: req.user.tenantId },
            data: { status: false }
        });
        res.json({ message: 'Category deactivated' });
    } catch (error) {
        next(error);
    }
};

// @desc    Cash Submission to Chest
// @route   POST /api/expenses/chest-transfer
// @access  Private (VGE)
export const submitToChest = async (req, res, next) => {
    try {
        const { amount, denominations, vehicleId } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        const transfer = await prisma.cashTransfer.upsert({
            where: {
                vehicleId_date: {
                    vehicleId: vehicleId || req.user.assignedVehicleId,
                    date: dateString
                }
            },
            update: { amount: parseFloat(amount), denominations, userId },
            create: {
                tenantId: req.user.tenantId,
                storeId: req.user.storeId,
                userId,
                vehicleId: vehicleId || req.user.assignedVehicleId,
                date: dateString,
                amount: parseFloat(amount),
                denominations
            }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'CASH_TO_CHEST_SUBMITTED',
            details: `Submitted ₹${amount} to chest`,
            metadata: { transferId: transfer.id, amount, date: dateString }
        });

        await prisma.dailyCashSummary.update({
            where: { vehicleId_date: { vehicleId: transfer.vehicleId, date: dateString } },
            data: { submittedCash: parseFloat(amount) }
        });

        res.status(201).json(transfer);

        sendNotification({
            roles: ['ADMIN'],
            title: 'Cash Submitted to Chest',
            message: `${req.user.name} submitted ₹${amount} to chest.`,
            type: 'cash',
            priority: 'medium',
            metadata: { transferId: transfer.id, amount }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Agent: Raise dispute on a rejected/closed expense
// @route   PUT /api/expenses/:id/dispute
// @access  Private (VGE)
export const raiseDispute = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            res.status(400);
            throw new Error('Dispute reason is required');
        }

        const expense = await prisma.expense.findUnique({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!expense) {
            res.status(404);
            throw new Error('Expense not found');
        }

        if (expense.userId !== req.user.id) {
            res.status(403);
            throw new Error('Not authorized');
        }

        if (!['REJECTED'].includes(expense.status)) {
            res.status(400);
            throw new Error('Only rejected expenses can be disputed');
        }

        const updated = await prisma.expense.update({
            where: { id },
            data: {
                status: 'PENDING',
                description: `${expense.description || ''}\n[DISPUTE ${format(new Date(), 'dd/MM/yy HH:mm')}]: ${reason}`
            }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'EXPENSE_DISPUTED',
            details: `Disputed ${expense.type} expense of ₹${expense.amount}: ${reason}`,
            metadata: { expenseId: expense.id, reason }
        });

        sendNotification({
            roles: ['ADMIN'],
            title: 'Expense Dispute Raised',
            message: `${req.user.name} disputed a ${expense.type} expense of ₹${expense.amount}.`,
            type: 'expense',
            priority: 'high',
            metadata: { expenseId: expense.id }
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Reopen a closed/rejected expense for re-evaluation
// @route   PUT /api/expenses/admin/:id/reopen
// @access  Admin
export const reopenExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const expense = await prisma.expense.findUnique({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!expense) {
            res.status(404);
            throw new Error('Expense not found');
        }

        if (!['REJECTED', 'PAID'].includes(expense.status)) {
            res.status(400);
            throw new Error('Only rejected or paid expenses can be reopened');
        }

        const updated = await prisma.expense.update({
            where: { id },
            data: {
                status: 'PENDING',
                description: `${expense.description || ''}\n[REOPENED ${format(new Date(), 'dd/MM/yy HH:mm')} by ${req.user.name}]: ${reason || 'Admin reopened'}`
            }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'EXPENSE_REOPENED',
            details: `Reopened ${expense.type} expense of ₹${expense.amount}`,
            targetUserId: expense.userId,
            metadata: { expenseId: expense.id, reason }
        });

        sendNotification({
            userIds: [expense.userId],
            title: 'Expense Reopened',
            message: `Your ${expense.type} expense of ₹${expense.amount} has been reopened for re-evaluation.`,
            type: 'expense',
            priority: 'medium',
            metadata: { expenseId: expense.id }
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};
