import express from 'express';
import { createOrderFromCart, completePayment, getOrderById, getMyOrders } from '../controllers/orderController.js';
import {
  editOrderItem,
  removeOrderItem,
  returnOrderItems,
  cancelOrder,
  getSessionSales,
  getReturnReport,
  getItemWiseReport,
  freezeSession
} from '../controllers/orderReturnController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-from-cart', protect, createOrderFromCart);
router.post('/complete-payment', protect, completePayment);

// Sales Module V2.0 — Reports (must be before /:id route)
router.get('/my-history', protect, getMyOrders);
router.get('/session-sales', protect, getSessionSales);
router.get('/return-report', protect, getReturnReport);
router.get('/item-wise-report', protect, getItemWiseReport);

// Sales Module V2.0 — Session Control
router.post('/freeze-session', protect, admin, freezeSession);

// Sales Module V2.0 — Order Mutations
router.put('/:orderId/items/:itemId', protect, editOrderItem);
router.delete('/:orderId/items/:itemId', protect, removeOrderItem);
router.post('/:orderId/return', protect, returnOrderItems);
router.post('/:orderId/cancel', protect, cancelOrder);

// Existing
router.get('/:id', protect, getOrderById);

export default router;
