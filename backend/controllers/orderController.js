import prisma from '../utils/prisma.js';

// @desc    Create order from cart
// @route   POST /api/orders/create-from-cart
// @access  Private
export const createOrderFromCart = async (req, res, next) => {
    try {
        const { mobile, items } = req.body;
        const agentId = req.user.id;

        let cartItems = [];
        let cartId = null;

        // 1. Validate cart (Either from body or database)
        if (items && Array.isArray(items) && items.length > 0) {
            cartItems = items;
        } else {
            const cart = await prisma.cart.findFirst({
                where: { userId: agentId },
                include: { items: true },
            });

            if (!cart || cart.items.length === 0) {
                res.status(400);
                throw new Error('Cart is empty');
            }
            cartItems = cart.items;
            cartId = cart.id;
        }

        // 2. Fetch product details and calculate totals
        let totalAmount = 0;
        const orderItemsData = [];

        for (const item of cartItems) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId },
            });

            if (!product) {
                res.status(400);
                throw new Error(`Product ${item.productId} not found`);
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            orderItemsData.push({
                productId: item.productId,
                quantity: item.quantity,
                price: product.price,
                mrp: product.mrp,
                discount: product.discount,
                landingPrice: product.landingPrice,
            });
        }

        // 3. Create Order + OrderItems in a transaction
        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    userId: agentId,
                    vehicleId: req.user.assignedVehicleId || null,
                    agentId: agentId,
                    totalAmount,
                    status: 'PENDING',
                    mobile: mobile || null,
                    items: {
                        create: orderItemsData,
                    },
                },
                include: { items: true },
            });

            // Clear the cart if we used the database one
            if (cartId) {
                await tx.cartItem.deleteMany({ where: { cartId: cartId } });
            }

            return newOrder;
        });

        res.status(201).json(order);
    } catch (error) {
        next(error);
    }
};

// @desc    Complete payment for an order
// @route   POST /api/orders/complete-payment
// @access  Private
export const completePayment = async (req, res, next) => {
    try {
        const { orderId, paymentMode } = req.body;

        if (!orderId || !paymentMode) {
            res.status(400);
            throw new Error('orderId and paymentMode are required');
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        if (order.status === 'COMPLETED') {
            res.status(400);
            throw new Error('Order already completed');
        }

        // Transaction: update order, create payment, reduce inventory
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Update order status and payment mode
            const updated = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'COMPLETED',
                    paymentMode: paymentMode,
                },
                include: { items: true, payment: true },
            });

            // Create payment record
            await tx.payment.create({
                data: {
                    orderId: orderId,
                    paymentMode: paymentMode,
                    amount: order.totalAmount,
                    status: 'COMPLETED',
                },
            });

            // Reduce warehouse inventory for each item
            for (const item of order.items) {
                await tx.warehouseInventory.updateMany({
                    where: {
                        productId: item.productId,
                        quantity: { gte: item.quantity },
                    },
                    data: {
                        quantity: { decrement: item.quantity },
                    },
                });
            }

            return updated;
        }, {
            maxWait: 10000,
            timeout: 15000,
        });

        res.json(updatedOrder);
    } catch (error) {
        next(error);
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: {
                items: {
                    include: {
                        // We don't have a direct relation on OrderItem -> Product
                        // so we'll manually look them up
                    },
                },
                payment: true,
            },
        });

        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        // Enrich items with product details
        const enrichedItems = await Promise.all(
            order.items.map(async (item) => {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: { name: true, image: true },
                });
                return { ...item, product };
            })
        );

        res.json({ ...order, items: enrichedItems });
    } catch (error) {
        next(error);
    }
};
