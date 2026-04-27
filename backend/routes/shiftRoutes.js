import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { startShift, endShift, getShiftStatus } from '../controllers/shiftController.js';

const router = express.Router();

router.use(protect);

router.post('/start', startShift);
router.post('/end', endShift);
router.get('/status', getShiftStatus);

export default router;
