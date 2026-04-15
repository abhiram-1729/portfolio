import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
    getRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    assignRole
} from '../controllers/roleController.js';

const router = express.Router();

router.use(protect, admin);

router.route('/')
    .get(getRoles)
    .post(createRole);

router.route('/assign')
    .put(assignRole);

router.route('/:id')
    .get(getRole)
    .put(updateRole)
    .delete(deleteRole);

export default router;
