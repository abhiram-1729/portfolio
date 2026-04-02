import prisma from '../utils/prisma.js';

// @desc    Create order from cart
// @route   POST /api/orders/create-from-cart
// @access  Private
export const createOrderFromCart = async (req, res, next) => {
    try {
        const { mobile, customerName, items } = req.body;
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

        // 2. Bulk fetch product details and calculate totals
        const productIds = cartItems.map((i) => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
        });

        const productMap = products.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});

        let totalAmount = 0;
        const orderItemsData = [];

        // Pre-calculate subtotal for non-free items to determine 'Free' eligibility
        const paidSubtotal = cartItems.reduce((sum, item) => {
            const product = productMap[item.productId];
            const isFree = product.isFree === true || product.isFree === 'true';
            if (product && !isFree) {
                return sum + Number(product.price || 0) * item.quantity;
            }
            return sum;
        }, 0);

        console.log(`[OrderCreate] Paid Subtotal: ₹${paidSubtotal} | Total Items: ${cartItems.length}`);

        for (const item of cartItems) {
            const product = productMap[item.productId];

            if (!product) {
                res.status(400);
                throw new Error(`Product ${item.productId} not found`);
            }

            // Apply free product logic: skip or price becomes 0
            const isFreeProduct = product.isFree === true || product.isFree === 'true';
            let finalPrice = Number(product.price || 0);
            let isItemFree = false;
            
            if (isFreeProduct) {
                const threshold = Number(product.minShopAmount || 0);
                console.log(`[OrderCreate] Evaluating Free Item: ${product.name} | Threshold: ₹${threshold} | Current Subtotal: ₹${paidSubtotal}`);
                
                if (paidSubtotal >= threshold) {
                    console.log(`[OrderCreate] ✓ Threshold met for ${product.name}`);
                    finalPrice = 0;
                    isItemFree = true;
                } else {
                    console.warn(`[OrderCreate] ✗ Threshold NOT met for ${product.name}. Skipping item.`);
                    continue; 
                }
            }

            const itemTotal = finalPrice * item.quantity;
            totalAmount += itemTotal;

            orderItemsData.push({
                productId: item.productId,
                quantity: item.quantity,
                price: finalPrice, // Save as 0 if free
                mrp: product.mrp,
                discount: isItemFree ? product.price : product.discount, // Use full price as discount if free
                landingPrice: product.landingPrice,
                gst: product.gst || 0,
            });
        }

        // 3. Create Order + OrderItems in a transaction
        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    customerName: customerName || null,
                    mobile: mobile || null,
                    totalAmount: totalAmount,
                    status: 'PENDING',
                    agentId: agentId,
                    user: agentId ? { connect: { id: agentId } } : undefined,
                    vehicle: req.user.assignedVehicleId ? { connect: { id: req.user.assignedVehicleId } } : undefined,
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

        // Bulk enrich items with product details
        const enrichedProductIds = order.items.map((i) => i.productId);
        const enrichedProducts = await prisma.product.findMany({
            where: { id: { in: enrichedProductIds } },
            select: { id: true, name: true, image: true },
        });

        const enrichedProductMap = enrichedProducts.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});

        const enrichedItems = order.items.map((item) => ({
            ...item,
            product: enrichedProductMap[item.productId] || null,
        }));

        res.json({ ...order, items: enrichedItems });
    } catch (error) {
        next(error);
    }
};
