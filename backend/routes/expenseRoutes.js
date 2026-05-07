import express from 'express';
import {
    addExpense,
    getMyExpenses,
    getAllExpenses,
    updateExpenseStatus,
    bulkUpdateStatus,
    getExpenseAnalytics,
    getExpenseCategories,
    createExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    submitToChest,
    claimExpense,
    raiseDispute,
    reopenExpense
} from '../controllers/expenseController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Agent routes
router.post('/', protect, uploadMiddleware.single('billImage'), addExpense);
router.get('/my', protect, getMyExpenses);
router.post('/chest-transfer', protect, submitToChest);
router.put('/:id/claim', protect, claimExpense);
router.put('/:id/dispute', protect, raiseDispute);

// Admin & Shared routes
router.get('/admin/categories', protect, getExpenseCategories);
router.post('/admin/categories', protect, admin, createExpenseCategory);
router.put('/admin/categories/:id', protect, admin, updateExpenseCategory);
router.delete('/admin/categories/:id', protect, admin, deleteExpenseCategory);

// Admin Monitoring routes
router.get('/admin/all', protect, admin, getAllExpenses);
router.get('/admin/analytics', protect, admin, getExpenseAnalytics);
router.put('/admin/bulk-status', protect, admin, bulkUpdateStatus);
router.put('/admin/:id/reopen', protect, admin, reopenExpense);
router.put('/admin/:id/status', protect, admin, updateExpenseStatus);

export default router;
