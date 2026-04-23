import prisma from '../utils/prisma.js';
import { fetchPlanForVehicle, getCoverageType } from './routeController.js';
import { sendNotification } from '../services/notificationService.js';
import { updateDailyPerformance } from '../services/vgeAggregationService.js';
import { recalculateDailySummary } from './cashController.js';
import { format } from 'date-fns';
import { generateId } from '../utils/idGenerator.js';
import { logActivity } from '../utils/activityLogger.js';


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
            where: { id: { in: productIds }, tenantId: req.user.tenantId },
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

        // Ensure subtotal is rounded to 2 decimal places to avoid floating point errors in comparison
        const subtotalForComparison = Math.round(paidSubtotal * 100) / 100;
        console.log(`[OrderCreate] Paid Subtotal: ₹${subtotalForComparison} | Total Items: ${cartItems.length}`);

        console.log(`[OrderCreate] Starting Processing. Total Items: ${cartItems.length}`);
        for (const item of cartItems) {
            const product = productMap[item.productId];
            console.log(`[OrderCreate] Processing: ${product?.name} | Qty: ${item.quantity} | isFree: ${product?.isFree} | Min: ${product?.minShopAmount}`);

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
                console.log(`[OrderCreate] Evaluating Gift: ${product.name} | Threshold: ₹${threshold} | Cart Subtotal: ₹${subtotalForComparison}`);

                if (subtotalForComparison >= threshold) {
                    console.log(`[OrderCreate] Success: Threshold met for GIFT: ${product.name}`);
                    finalPrice = 0;
                    isItemFree = true;
                } else {
                    console.warn(`[OrderCreate] Threshold NOT met for GIFT: ${product.name}. Charging regular price.`);
                    // Fall back to regular price instead of skipping
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

        // 2.5 Fetch Route & Vehicle context for tagging
        const vehicleId = req.user.assignedVehicleId;
        const plan = await fetchPlanForVehicle(vehicleId);
        const coverage = getCoverageType();

        const routeTag = {
            routeId: plan?.routeId || null,
            villageName: plan?.villageName || (plan?.noVillage ? 'Unspecified Village' : 'No Active Plan'),
            coverageType: coverage
        };

        // 2.7 Verify Vehicle Stock Availability (Prevent + Notify on shortage)
        if (vehicleId) {
            for (const item of orderItemsData) {
                const stock = await prisma.vehicleStock.findUnique({
                    where: { 
                        vehicleId_productId: { vehicleId, productId: item.productId }
                    }
                });
                
                if (!stock || stock.quantity < item.quantity) {
                    const product = await prisma.product.findUnique({ where: { id: item.productId } });
                    
                    sendNotification({
                        roles: ['ADMIN'],
                        title: 'Inventory Alert: Stock Mismatch',
                        message: `Agent ${req.user.name} attempted sale exceeding vehicle stock for ${product.name}.`,
                        type: 'inventory',
                        priority: 'high',
                        metadata: { productId: item.productId, vehicleId, requested: item.quantity, available: stock?.quantity || 0 }
                    });
                    
                    res.status(400);
                    throw new Error(`Insufficient stock for ${product.name} (Available: ${stock?.quantity || 0})`);
                }
            }
        }

        // 3. Create Order + OrderItems in a transaction
        const order = await prisma.$transaction(async (tx) => {
            const orderDisplayId = await generateId({
              entity: 'ORD',
              tenantId: req.user.tenantId,
              storeId: req.user.storeId
            });

            const newOrder = await tx.order.create({
                data: {
                    tenantId: req.user.tenantId,
                    storeId: req.user.storeId,
                    displayId: orderDisplayId,
                    customerName: customerName || null,
                    mobile: mobile || null,
                    totalAmount: totalAmount,
                    status: 'PENDING',
                    agentId: agentId,
                    user: agentId ? { connect: { id: agentId } } : undefined,
                    vehicle: vehicleId ? { connect: { id: vehicleId } } : undefined,
                    route: routeTag.routeId ? { connect: { id: routeTag.routeId } } : undefined,
                    villageName: routeTag.villageName,
                    coverageType: routeTag.coverageType,
                    items: {
                        create: orderItemsData.map(item => ({ 
                            ...item, 
                            tenantId: req.user.tenantId,
                            storeId: req.user.storeId
                        })),
                    },
                },
                include: { items: true },
            });

            // Clear the cart if we used the database one
            if (cartId) {
                await tx.cartItem.deleteMany({ where: { cartId: cartId } });
            }

            return newOrder;
        }, { maxWait: 5000, timeout: 20000 });

        res.status(201).json(order);
    } catch (error) {
        console.error('[Order Create Error]:', error);
        if (error.code) console.error('[Prisma Error Code]:', error.code);
        if (error.meta) console.error('[Prisma Error Meta]:', error.meta);
        next(error);
    }
};

// @desc    Complete payment for an order
// @route   POST /api/orders/complete-payment
// @access  Private
export const completePayment = async (req, res, next) => {
    try {
        const { orderId, paymentMode, cashAmount, upiAmount } = req.body;

        if (!orderId || !paymentMode) {
            res.status(400);
            throw new Error('orderId and paymentMode are required');
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId, tenantId: req.user.tenantId },
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
        const lowStockItems = [];
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Update order status and payment mode
            const updated = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'COMPLETED',
                    paymentMode: paymentMode,
                    cashAmount: paymentMode === 'CASH' ? order.totalAmount : (cashAmount || 0),
                    upiAmount: paymentMode === 'UPI' ? order.totalAmount : (upiAmount || 0),
                },
                include: { items: true, payment: true },
            });

            // Create payment record
            await tx.payment.create({
                data: {
                    tenantId: req.user.tenantId,
                    storeId: req.user.storeId,
                    orderId: orderId,
                    paymentMode: paymentMode,
                    amount: order.totalAmount,
                    cashAmount: paymentMode === 'CASH' ? order.totalAmount : (cashAmount || 0),
                    upiAmount: paymentMode === 'UPI' ? order.totalAmount : (upiAmount || 0),
                    status: 'COMPLETED',
                },
            });

            // Reduce vehicle inventory for all items in parallel
            if (order.vehicleId) {
                await Promise.all(order.items.map(async (item) => {
                    const updatedStock = await tx.vehicleStock.update({
                        where: {
                            vehicleId_productId: {
                                vehicleId: order.vehicleId,
                                productId: item.productId,
                            }
                        },
                        data: {
                            quantity: { decrement: item.quantity },
                        },
                        include: { product: { select: { name: true } } }
                    });

                    // Collect low stock alerts (threshold < 5) to notify AFTER transaction
                    if (updatedStock.quantity < 5) {
                        lowStockItems.push({
                            name: updatedStock.product.name,
                            productId: item.productId,
                            quantity: updatedStock.quantity
                        });
                    }
                }));
            }

            return updated;
        }, { maxWait: 15000, timeout: 45000 });

        // Log the completion of the payment
        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'SALE_COMPLETED',
            details: `Completed sale #${updatedOrder.orderNumber} for ₹${updatedOrder.totalAmount}`,
            metadata: { 
                orderId: updatedOrder.id, 
                orderNumber: updatedOrder.orderNumber,
                amount: updatedOrder.totalAmount,
                paymentMode: updatedOrder.paymentMode,
                totalItems: updatedOrder.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });

        // Notifications (Background tasks after successful transaction)
        res.json(updatedOrder);

        // Notify for low stock (Consolidated)
        if (lowStockItems.length > 0) {
            const lowStockCount = lowStockItems.length;
            const msg = lowStockCount === 1 
                ? `Vehicle is low on ${lowStockItems[0].name} (Only ${lowStockItems[0].quantity} left).`
                : `Vehicle is low on ${lowStockCount} items including ${lowStockItems[0].name}. Please check inventory.`;

            sendNotification({
                userIds: [updatedOrder.agentId],
                roles: ['ADMIN'],
                title: `Low Stock Alert (${lowStockCount} items)`,
                message: msg,
                type: 'inventory',
                priority: 'medium',
                metadata: { vehicleId: updatedOrder.vehicleId, items: lowStockItems.map(i => i.productId) }
            });
        }

        // 4. Send background notification (don't await for response to keep response fast)
        sendNotification({
            userIds: [updatedOrder.agentId, updatedOrder.userId].filter(id => id),
            roles: ['ADMIN', 'SUPERVISOR'],
            title: updatedOrder.totalAmount >= 2000 ? 'High-Value Order Alert!' : 'New Order Completed',
            message: `Order #${updatedOrder.orderNumber} for ₹${updatedOrder.totalAmount} has been completed by ${req.user.name}.`,
            type: 'sales',
            priority: updatedOrder.totalAmount >= 2000 ? 'high' : 'medium',
            metadata: { 
              orderId: updatedOrder.id, 
              amount: updatedOrder.totalAmount, 
              vehicleId: updatedOrder.vehicleId,
              orderNumber: updatedOrder.orderNumber 
            }
        });

        // 5. Trigger VGE performance recalculation (fire-and-forget)
        if (updatedOrder.agentId) {
          updateDailyPerformance(updatedOrder.agentId).catch(err => {
            console.warn('[VGE] Background recalculation failed:', err.message);
          });
        }

        // 6. Recalculate Daily Cash Summary if CASH or CASH_UPI payment
        if (paymentMode === 'CASH' || paymentMode === 'CASH_UPI') {
            const dateString = format(new Date(), 'yyyy-MM-dd');
            recalculateDailySummary(updatedOrder.vehicleId, dateString).catch(err => {
                console.warn('[CASH] Summary sync failed:', err.message);
            });
        }
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
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: {
                items: true,
                payment: true,
                returns: {
                    orderBy: { createdAt: 'desc' }
                },
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

        const enrichedItems = order.items.map((item) => {
            const itemReturns = order.returns.filter(r => r.orderItemId === item.id && r.status === 'COMPLETED');
            const returnedQty = itemReturns.reduce((sum, r) => sum + r.returnQty, 0);
            return {
                ...item,
                product: enrichedProductMap[item.productId] || null,
                returnedQty,
                returnableQty: item.quantity - returnedQty,
            };
        });

        res.json({ ...order, items: enrichedItems });
    } catch (error) {
        console.error('[Get Order Error]:', error);
        next(error);
    }
};

// @desc    Get my orders (Agent history)
// @route   GET /api/orders/my-history
// @access  Private
export const getMyOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const { limit = 100, page = 1 } = req.query;

        const orders = await prisma.order.findMany({
            where: { 
                tenantId: tenantId,
                OR: [
                    { agentId: userId },
                    { userId: userId }
                ],
                status: { in: ['COMPLETED', 'PENDING', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED'] }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit),
            include: {
                items: true
            }
        });

        // Bulk enrich product names
        const allProductIds = [...new Set(orders.flatMap(o => o.items.map(i => i.productId)))];
        const products = await prisma.product.findMany({
            where: { id: { in: allProductIds } },
            select: { id: true, name: true }
        });
        const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});

        const enrichedOrders = orders.map(order => ({
            ...order,
            items: order.items.map(item => ({
                ...item,
                productName: productMap[item.productId] || 'Unknown Product'
            }))
        }));

        res.json(enrichedOrders);
    } catch (error) {
        console.error('[Get My Orders Error]:', error);
        next(error);
    }
};
