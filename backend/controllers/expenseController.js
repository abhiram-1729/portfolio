import prisma from '../utils/prisma.js';
import { format } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';
import { uploadToSupabase } from '../utils/supabaseService.js';
import { recalculateDailySummary } from './cashController.js';
import { generateId } from '../utils/idGenerator.js';

// @desc    Add expense entry
// @route   POST /api/expenses
// @access  Private (VGE)
export const addExpense = async (req, res, next) => {
    try {
        const { type, amount, paymentMode, description, billImage, vehicleId } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (!type || !amount || !paymentMode) {
            res.status(400);
            throw new Error('Type, amount, and payment mode are required');
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

        const expense = await prisma.expense.create({
            data: {
                tenantId: req.user.tenantId,
                storeId: req.user.storeId,
                displayId,
                userId,
                vehicleId: vehicleId || req.user.assignedVehicleId,
                type,
                amount: parseFloat(amount),
                paymentMode,
                description,
                billImage: imageUrl,
                date: dateString,
                status: 'PENDING'
            }
        });

        // If it's a cash expense, it should be reflected in the daily summary immediately
        if (paymentMode === 'CASH') {
            await recalculateDailySummary(expense.vehicleId, dateString);
        }

        res.status(201).json(expense);

        // Notify admins for approval if needed (maybe high amount)
        if (amount > 1000) {
            sendNotification({
                roles: ['ADMIN'],
                title: 'High Expense Recorded',
                message: `${req.user.name} recorded a ${type} expense of ₹${amount}.`,
                type: 'expense',
                priority: 'high',
                metadata: { expenseId: expense.id, amount }
            });
        }
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
        const { date } = req.query;
        
        const expenses = await prisma.expense.findMany({
            where: {
                tenantId: req.user.tenantId,
                userId,
                ...(date && { date })
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(expenses);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Get all expenses for monitoring
// @route   GET /api/admin/expenses
// @access  Admin
export const getAllExpenses = async (req, res, next) => {
    try {
        const { date, userId, status, storeId } = req.query;

        const where = {
            tenantId: req.user.tenantId,
            ...(date && { date }),
            ...(userId && { userId }),
            ...(status && { status })
        };

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

        res.json(expenses);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Approve/Reject expense
// @route   PUT /api/admin/expenses/:id/status
// @access  Admin
export const updateExpenseStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            res.status(400);
            throw new Error('Invalid status');
        }

        const expense = await prisma.expense.update({
            where: { id: id, tenantId: req.user.tenantId },
            data: { status },
            include: { user: true }
        });

        // Trigger sync
        if (expense.paymentMode === 'CASH') {
            await recalculateDailySummary(expense.vehicleId, expense.date);
        }

        res.json(expense);

        sendNotification({
            userIds: [expense.userId],
            title: `Expense ${status.toLowerCase()}`,
            message: `Your ${expense.type} expense of ₹${expense.amount} has been ${status.toLowerCase()}.`,
            type: 'expense',
            priority: 'medium',
            metadata: { expenseId: expense.id, status }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Agent: Claim an approved expense (Finalize)
// @route   PUT /api/expenses/:id/claim
// @access  Private (VGE)
export const claimExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const expense = await prisma.expense.findUnique({
            where: { id: id, tenantId: req.user.tenantId }
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
            where: { id: id },
            data: { status: 'PAID' }
        });

        // Trigger sync with daily summary IF it was a cash expense
        // This is where it finally hits the account books
        if (updatedExpense.paymentMode === 'CASH') {
            await recalculateDailySummary(updatedExpense.vehicleId, updatedExpense.date);
        }

        res.json(updatedExpense);
    } catch (error) {
        next(error);
    }
};

// @desc    Expense Category Management - List
// @route   GET /api/admin/expense-categories
// @access  Admin
export const getExpenseCategories = async (req, res, next) => {
    try {
        const categories = await prisma.expenseCategory.findMany({
            where: { status: true, tenantId: req.user.tenantId }
        });
        res.json(categories);
    } catch (error) {
        next(error);
    }
};

// @desc    Expense Category Management - Create
// @route   POST /api/admin/expense-categories
// @access  Admin
export const createExpenseCategory = async (req, res, next) => {
    try {
        const { name, limit } = req.body;
        const category = await prisma.expenseCategory.create({
            data: { 
                tenantId: req.user.tenantId,
                name, 
                limit: limit ? parseFloat(limit) : null 
            }
        });
        res.status(201).json(category);
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
            update: {
                amount: parseFloat(amount),
                denominations,
                userId
            },
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

        // Update daily summary
        await prisma.dailyCashSummary.update({
            where: {
                vehicleId_date: {
                    vehicleId: transfer.vehicleId,
                    date: dateString
                }
            },
            data: { submittedCash: parseFloat(amount) }
        });

        res.status(201).json(transfer);

        sendNotification({
            roles: ['ADMIN'],
            title: 'Cash Submitted to Chest',
            message: `${req.user.name} submitted ₹${amount} to chest for ${transfer.vehicleId}.`,
            type: 'cash',
            priority: 'medium',
            metadata: { transferId: transfer.id, amount }
        });
    } catch (error) {
        next(error);
    }
};

// Removed old updateDailySummaryExpenses in favor of cashController.recalculateDailySummary

