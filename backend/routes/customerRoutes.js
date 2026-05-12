import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  registerCustomer,
  loginCustomer,
  getCustomers,
  getCustomerHistory,
  updateCustomerProfile,
  adjustCreditBalance,
  adjustLoyaltyPoints
} from '../controllers/customerController.js';

const router = express.Router();

router.use(protect);

router.post('/', registerCustomer);
router.post('/login', loginCustomer);
router.get('/', getCustomers);
router.get('/:id/history', getCustomerHistory);
router.put('/:id', updateCustomerProfile);
router.post('/:id/credit', adjustCreditBalance);
router.post('/:id/points', adjustLoyaltyPoints);

export default router;
