import express from 'express';
import { getProducts, getProductById } from '../controllers/productController.js';
import { getVehicleInventory } from '../controllers/admin/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getProducts);
router.get('/vehicle-inventory/:id', protect, getVehicleInventory);
router.get('/:id', protect, getProductById);

export default router;
