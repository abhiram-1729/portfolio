import express from 'express';
import { loginUser, registerUser, logoutUser, getUserProfile, updatePassword, uploadMyDocument } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getUserProfile);
router.put('/password', protect, updatePassword);
router.post('/me/documents', protect, uploadMiddleware.single('document'), uploadMyDocument);

export default router;
