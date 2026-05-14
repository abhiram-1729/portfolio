import express from 'express';
import { 
  getConfig, 
  updateConfig, 
  getMyLateHistory, 
  getAdminReport, 
  requestException, 
  reviewException,
  updateLateEntry,
  getLeaveBalance
} from '../controllers/lateEntryController.js';
import { getLateEntryStats, getTopOffenders } from '../controllers/lateEntryAnalytics.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Config
router.get('/config', getConfig);
router.post('/config', authorize('ADMIN', 'SUPER_ADMIN', 'TENANT_OWNER'), updateConfig);

// Late Entries
router.get('/my', getMyLateHistory);
router.get('/admin/report', authorize('ADMIN', 'SUPER_ADMIN', 'TENANT_OWNER', 'SUPERVISOR'), getAdminReport);
router.patch('/:id', authorize('ADMIN', 'SUPER_ADMIN', 'TENANT_OWNER'), updateLateEntry);

// Advanced Analytics
router.get('/analytics/stats', authorize('ADMIN', 'SUPER_ADMIN', 'TENANT_OWNER', 'SUPERVISOR'), getLateEntryStats);
router.get('/analytics/top-offenders', authorize('ADMIN', 'SUPER_ADMIN', 'TENANT_OWNER', 'SUPERVISOR'), getTopOffenders);

// Exceptions/Waivers
router.post('/exception', requestException);
router.patch('/exception/:id', authorize('ADMIN', 'SUPER_ADMIN', 'TENANT_OWNER', 'SUPERVISOR'), reviewException);

// Leave Balance
router.get('/leave-balance', getLeaveBalance);

export default router;
