import express from 'express';
import {
    submitOpeningCash,
    submitClosingCash,
    getCashStatus,
    getAdminCashSummary,
} from '../controllers/cashController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/opening', protect, submitOpeningCash);
router.post('/closing', protect, submitClosingCash);
router.get('/status', protect, getCashStatus);
router.get('/admin/reconciliation', protect, admin, getAdminCashSummary);

export default router;
