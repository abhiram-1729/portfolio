import express from 'express';
import { punchIn, punchOut, getToday, getMyHistory, getAllAttendance } from '../controllers/attendanceController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Agent endpoints (punch-in/out accept photo via multer)
router.post('/punch-in', protect, uploadMiddleware.single('photo'), punchIn);
router.post('/punch-out', protect, uploadMiddleware.single('photo'), punchOut);
router.get('/today', protect, getToday);
router.get('/my-history', protect, getMyHistory);

// Admin endpoint
router.get('/all', protect, admin, getAllAttendance);

export default router;
