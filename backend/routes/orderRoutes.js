import express from 'express';
import { createOrderFromCart, completePayment, getOrderById } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-from-cart', protect, createOrderFromCart);
router.post('/complete-payment', protect, completePayment);
router.get('/:id', protect, getOrderById);

export default router;
