import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';
import { getMyAssets, reportIssue, createAssetRequest, getMyAssetRequests, getAssetCatalog } from '../controllers/admin/assetController.js';

const router = express.Router();

router.use(protect);

// Agent: view my assigned assets
router.get('/my-assets', getMyAssets);

// Agent: report issue with asset (supports photo uploads)
router.post('/report-issue', uploadMiddleware.array('photos', 5), reportIssue);

// Agent: asset requests (replacement, new, requirement)
router.post('/requests', createAssetRequest);
router.get('/requests', getMyAssetRequests);
router.get('/catalog', getAssetCatalog);

export default router;
