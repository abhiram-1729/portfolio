import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { startVillageVisit, endVillageVisit, getShiftActivities } from '../controllers/villageActivityController.js';

const router = express.Router();

router.use(protect);

router.post('/start', startVillageVisit);
router.post('/end', endVillageVisit);
router.get('/:shiftLogId', getShiftActivities);

export default router;
