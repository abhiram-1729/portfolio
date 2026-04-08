import express from 'express';
import {
    submitOpeningCash,
    submitClosingCash,
    getCashStatus,
    getAdminCashSummary,
    adminSubmitOpeningCash,
    adminUpdateReconciliation,
    deleteReconciliation
} from '../controllers/cashController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/opening', protect, submitOpeningCash);
router.post('/closing', protect, submitClosingCash);
router.get('/status', protect, getCashStatus);
router.get('/admin/reconciliation', protect, admin, getAdminCashSummary);
router.put('/admin/reconciliation', protect, admin, adminUpdateReconciliation);
router.delete('/admin/reconciliation/:vehicleId/:date', protect, admin, deleteReconciliation);
router.post('/admin/opening', protect, admin, adminSubmitOpeningCash);

export default router;
