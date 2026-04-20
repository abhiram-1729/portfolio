import express from 'express';
import { createOrderFromCart, completePayment, getOrderById, getMyOrders } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-from-cart', protect, createOrderFromCart);
router.post('/complete-payment', protect, completePayment);
router.get('/test-all-orders', async (req, res) => {
    const orders = await prisma.order.findMany({ take: 5 });
    res.json(orders);
});
router.get('/my-history', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

export default router;
