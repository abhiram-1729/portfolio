import express from 'express';
import { getTodayReport, getDateReport } from '../controllers/reportController.js';
import { 
  getVillageVisitReport, 
  getGeoComplianceReport, 
  getTimeDeviationReport 
} from '../controllers/trackingReportController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/today', protect, getTodayReport);
router.get('/date', protect, getDateReport);

// Advanced Tracking Reports
router.get('/tracking/village-visits', protect, admin, getVillageVisitReport);
router.get('/tracking/geo-compliance', protect, admin, getGeoComplianceReport);
router.get('/tracking/time-deviation', protect, admin, getTimeDeviationReport);

export default router;
