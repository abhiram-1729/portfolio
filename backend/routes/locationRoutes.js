import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { logLocation, getLiveLocations } from '../controllers/locationController.js';

const router = express.Router();

router.use(protect);

router.post('/log', logLocation);
router.get('/live', admin, getLiveLocations);

export default router;
