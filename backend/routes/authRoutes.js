import express from 'express';
import { loginUser, logoutUser, getUserProfile, updatePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getUserProfile);
router.put('/password', protect, updatePassword);

export default router;
