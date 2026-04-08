import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';
import { getMyAssets, reportIssue } from '../controllers/admin/assetController.js';

const router = express.Router();

router.use(protect);

// Agent: view my assigned assets
router.get('/my-assets', getMyAssets);

// Agent: report issue with asset (supports photo uploads)
router.post('/report-issue', uploadMiddleware.array('photos', 5), reportIssue);

export default router;
