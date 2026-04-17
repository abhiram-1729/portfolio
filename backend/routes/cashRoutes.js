import express from 'express';
import {
    submitOpeningCash,
    submitClosingCash,
    getCashStatus,
    getAdminCashSummary,
    adminSubmitOpeningCash,
    adminUpdateReconciliation,
    deleteReconciliation,
    adminReviewClosingCash,
    getStoreCashRegister,
    openStoreCashRegister,
    closeStoreCashRegister,
    createStoreDeposit,
    updateStoreCashRegister,
    updateStoreDeposit,
    deleteStoreDeposit,
    adminAddBankDeposit,
    deleteBankDeposit
} from '../controllers/cashController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/opening', protect, submitOpeningCash);
router.post('/closing', protect, submitClosingCash);
router.get('/status', protect, getCashStatus);
router.get('/admin/reconciliation', protect, admin, getAdminCashSummary);
router.put('/admin/reconciliation', protect, admin, adminUpdateReconciliation);
router.put('/admin/closing/review', protect, admin, adminReviewClosingCash);
router.delete('/admin/reconciliation/:vehicleId/:date', protect, admin, deleteReconciliation);
router.post('/admin/opening', protect, admin, adminSubmitOpeningCash);

// Store Cash Safe Routes
router.get('/store-register/:date', protect, admin, getStoreCashRegister);
router.post('/store-register/open', protect, admin, openStoreCashRegister);
router.post('/store-register/close', protect, admin, closeStoreCashRegister);
router.post('/store-register/deposit', protect, admin, createStoreDeposit);
router.patch('/store-register/update', protect, admin, updateStoreCashRegister);
router.patch('/store-register/deposit/:id', protect, admin, updateStoreDeposit);
router.delete('/store-register/deposit/:id', protect, admin, deleteStoreDeposit);
router.post('/store-register/bank-deposit', protect, admin, adminAddBankDeposit);
router.delete('/store-register/bank-deposit/:id', protect, admin, deleteBankDeposit);

export default router;
