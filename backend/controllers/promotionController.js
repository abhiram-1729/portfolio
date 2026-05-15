import prisma from '../utils/prisma.js';

// @desc    Create new promotion
// @route   POST /api/promotions
// @access  Admin
export const createPromotion = async (req, res) => {
    try {
        const promotion = await prisma.promotion.create({
            data: req.body
        });
        res.status(201).json(promotion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all promotions
// @route   GET /api/promotions
// @access  Admin/Agent
export const getPromotions = async (req, res) => {
    try {
        const { isActive, type } = req.query;
        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (type) where.type = type;

        const promotions = await prisma.promotion.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update promotion
// @route   PUT /api/promotions/:id
// @access  Admin
export const updatePromotion = async (req, res) => {
    try {
        const promotion = await prisma.promotion.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(promotion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete promotion
// @route   DELETE /api/promotions/:id
// @access  Admin
export const deletePromotion = async (req, res) => {
    try {
        await prisma.promotion.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Promotion removed' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Validate a promotion for a cart
// @route   POST /api/promotions/validate
// @access  Agent
export const validatePromotion = async (req, res) => {
    const { code, items, villageName, routeId, subtotal } = req.body;

    try {
        const promotion = await prisma.promotion.findUnique({
            where: { code }
        });

        if (!promotion || !promotion.isActive) {
            return res.status(404).json({ message: 'Invalid or inactive coupon code' });
        }

        // Check dates
        const now = new Date();
        if (promotion.startDate && now < promotion.startDate) {
            return res.status(400).json({ message: 'Promotion has not started yet' });
        }
        if (promotion.endDate && now > promotion.endDate) {
            return res.status(400).json({ message: 'Promotion has expired' });
        }

        // Check usage limits
        if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
            return res.status(400).json({ message: 'Coupon usage limit reached' });
        }

        // Check min order amount
        if (promotion.minOrderAmount && subtotal < promotion.minOrderAmount) {
            return res.status(400).json({ message: `Minimum order amount of ₹${promotion.minOrderAmount} required` });
        }

        // Check Route targeting
        if (promotion.targetRouteIds.length > 0 && !promotion.targetRouteIds.includes(routeId)) {
            return res.status(400).json({ message: 'Coupon not applicable for this route' });
        }

        // Check Village targeting
        if (promotion.targetVillageNames.length > 0 && !promotion.targetVillageNames.includes(villageName)) {
            return res.status(400).json({ message: 'Coupon not applicable for this village' });
        }

        // If everything is fine, return the promotion details for discount calculation
        res.json(promotion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
