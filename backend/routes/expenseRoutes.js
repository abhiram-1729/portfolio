import express from 'express';
import {
    addExpense,
    getMyExpenses,
    getAllExpenses,
    updateExpenseStatus,
    getExpenseCategories,
    createExpenseCategory,
    submitToChest,
    claimExpense
} from '../controllers/expenseController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Agent routes
router.post('/', protect, uploadMiddleware.single('billImage'), addExpense);
router.get('/my', protect, getMyExpenses);
router.post('/chest-transfer', protect, submitToChest);
router.put('/:id/claim', protect, claimExpense);

// Admin & Shared routes
router.get('/admin/categories', protect, getExpenseCategories); // Both can read
router.post('/admin/categories', protect, admin, createExpenseCategory); // Only admin can create

// Admin Monitoring routes
router.get('/admin/all', protect, admin, getAllExpenses);
router.put('/admin/:id/status', protect, admin, updateExpenseStatus);

export default router;
