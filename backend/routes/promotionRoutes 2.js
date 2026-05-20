import express from 'express';
import { 
    createPromotion, 
    getPromotions, 
    updatePromotion, 
    deletePromotion, 
    validatePromotion 
} from '../controllers/promotionController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getPromotions)
    .post(protect, admin, createPromotion);

router.post('/validate', protect, validatePromotion);

router.route('/:id')
    .put(protect, admin, updatePromotion)
    .delete(protect, admin, deletePromotion);

export default router;
