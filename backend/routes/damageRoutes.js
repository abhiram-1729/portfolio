import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';
import * as damageCtr from '../controllers/admin/damageController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ─── AGENT ROUTES ─────────────────────────────────────
// Report Damage (VGE/Agent)
router.post(
  '/report',
  uploadMiddleware.array('images', 5), // Up to 5 images
  damageCtr.reportDamage
);

// Get my damage reports
router.get('/my-reports', damageCtr.getMyDamageReports);

// ─── ADMIN ROUTES ─────────────────────────────────────
// All below require admin role
router.use(admin);

// Damage entries CRUD
router.get('/entries', damageCtr.getDamageEntries);
router.get('/entries/:id', damageCtr.getDamageEntryById);
router.put('/entries/:id/review', damageCtr.reviewDamage);

// Deduction management
router.post('/deductions', damageCtr.applyDeduction);
router.get('/deductions', damageCtr.getDeductions);
router.put('/deductions/:id', damageCtr.updateDeductionStatus);

// Reports & Analytics
router.get('/reports', damageCtr.getDamageReports);

export default router;
