import prisma from '../utils/prisma.js';

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res, next) => {
    try {
        let cart = await prisma.cart.findFirst({
            where: { userId: req.user.id },
            include: {
                items: true,
            },
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId: req.user.id },
                include: { items: true },
            });
        }

        // Fetch product details for each cart item
        const itemsWithProducts = await Promise.all(
            cart.items.map(async (item) => {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    include: { category: true, brand: true },
                });
                return { ...item, product };
            })
        );

        res.json({ ...cart, items: itemsWithProducts });
    } catch (error) {
        next(error);
    }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
export const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity = 1 } = req.body;

        // Get or create cart
        let cart = await prisma.cart.findFirst({
            where: { userId: req.user.id },
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId: req.user.id },
            });
        }

        // Check if product already in cart
        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId: productId,
            },
        });

        if (existingItem) {
            // Update quantity
            const updatedItem = await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + quantity },
            });
            res.json(updatedItem);
        } else {
            // Add new item
            const newItem = await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: productId,
                    quantity: quantity,
                },
            });
            res.status(201).json(newItem);
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update cart item quantity
// @route   POST /api/cart/update
// @access  Private
export const updateCartItem = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;

        const cart = await prisma.cart.findFirst({
            where: { userId: req.user.id },
        });

        if (!cart) {
            res.status(404);
            throw new Error('Cart not found');
        }

        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId: productId,
            },
        });

        if (!existingItem) {
            res.status(404);
            throw new Error('Item not found in cart');
        }

        if (quantity <= 0) {
            await prisma.cartItem.delete({ where: { id: existingItem.id } });
            res.json({ message: 'Item removed from cart' });
        } else {
            const updatedItem = await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity },
            });
            res.json(updatedItem);
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Remove item from cart
// @route   POST /api/cart/remove
// @access  Private
export const removeFromCart = async (req, res, next) => {
    try {
        const { productId } = req.body;

        const cart = await prisma.cart.findFirst({
            where: { userId: req.user.id },
        });

        if (!cart) {
            res.status(404);
            throw new Error('Cart not found');
        }

        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId: productId,
            },
        });

        if (!existingItem) {
            res.status(404);
            throw new Error('Item not found in cart');
        }

        await prisma.cartItem.delete({ where: { id: existingItem.id } });
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        next(error);
    }
};

// @desc    Clear entire cart
// @route   POST /api/cart/clear
// @access  Private
export const clearCart = async (req, res, next) => {
    try {
        const cart = await prisma.cart.findFirst({
            where: { userId: req.user.id },
        });

        if (!cart) {
            return res.json({ message: 'Cart already empty' });
        }

        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        next(error);
    }
};
