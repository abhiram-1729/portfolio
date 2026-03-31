import express from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCart);
router.post('/add', protect, addToCart);
router.post('/update', protect, updateCartItem);
router.post('/remove', protect, removeFromCart);
router.post('/clear', protect, clearCart);

export default router;
