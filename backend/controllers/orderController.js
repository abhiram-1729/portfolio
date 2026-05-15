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
        const { mobile, customerName, items, customerId, deliverySlot, deliveryDate, lat, lon, couponCode } = req.body;
        const agentId = req.user.id;

        let resolvedCustomerId = customerId || null;
        if (!resolvedCustomerId && mobile) {
            let cust = await prisma.customer.findUnique({ where: { mobile } });
            if (!cust && customerName) {
                cust = await prisma.customer.create({
                    data: {
                        tenantId: req.user.tenantId,
                        storeId: req.user.storeId || null,
                        name: customerName,
                        mobile,
                        segment: 'REGULAR'
                    }
                });
            }
            if (cust) resolvedCustomerId = cust.id;
        }

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
            include: { WarehouseInventory: true }
        });

        const productMap = products.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});

        let totalAmount = 0;
        let subtotal = 0;
        const orderItemsData = [];

        // Pre-calculate subtotal for non-free items to determine 'Free' eligibility
        const paidSubtotal = cartItems.reduce((sum, item) => {
            const product = productMap[item.productId];
            const isFree = product?.isFree === true || product?.isFree === 'true';
            if (product && !isFree) {
                return sum + Number(product.price || 0) * item.quantity;
            }
            return sum;
        }, 0);

        // Ensure subtotal is rounded to 2 decimal places to avoid floating point errors in comparison
        const subtotalForComparison = Math.round(paidSubtotal * 100) / 100;

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
                if (subtotalForComparison >= threshold) {
                    finalPrice = 0;
                    isItemFree = true;
                }
            }

            const itemTotal = finalPrice * item.quantity;
            subtotal += itemTotal;
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

        // 2.6 Handle Promotion / Coupon
        let discountAmount = 0;
        let appliedPromotionId = null;

        if (couponCode) {
            const promotion = await prisma.promotion.findUnique({
                where: { code: couponCode }
            });

            if (promotion && promotion.isActive) {
                // Perform validation similar to promotionController.validatePromotion
                const now = new Date();
                const isDateValid = (!promotion.startDate || now >= promotion.startDate) && 
                                   (!promotion.endDate || now <= promotion.endDate);
                const isLimitValid = !promotion.usageLimit || promotion.usedCount < promotion.usageLimit;
                const isAmountValid = !promotion.minOrderAmount || subtotal >= promotion.minOrderAmount;
                const isRouteValid = promotion.targetRouteIds.length === 0 || promotion.targetRouteIds.includes(routeTag.routeId);
                const isVillageValid = promotion.targetVillageNames.length === 0 || promotion.targetVillageNames.includes(routeTag.villageName);

                if (isDateValid && isLimitValid && isAmountValid && isRouteValid && isVillageValid) {
                    appliedPromotionId = promotion.id;
                    
                    if (promotion.discountType === 'PERCENTAGE') {
                        discountAmount = (subtotal * promotion.discountValue) / 100;
                        if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
                            discountAmount = promotion.maxDiscount;
                        }
                    } else if (promotion.discountType === 'FLAT_AMOUNT') {
                        discountAmount = promotion.discountValue;
                    }
                    
                    // Increment usage count
                    await prisma.promotion.update({
                        where: { id: promotion.id },
                        data: { usedCount: { increment: 1 } }
                    });
                }
            }
        }

        // Final total after discount
        totalAmount = Math.max(0, totalAmount - discountAmount);

        // 2.7 Verify Stock Availability (Vehicle Stock OR Store Stock)
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
        } else {
            // POS / Store-level sale — validate against Product.stock AND Warehouse Sum
            for (const item of orderItemsData) {
                const product = productMap[item.productId];
                if (product) {
                    const warehouseSum = product.WarehouseInventory?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
                    const availableStock = warehouseSum > 0 ? warehouseSum : (product.stock || 0);

                    if (availableStock < item.quantity) {
                        res.status(400);
                        throw new Error(`Insufficient store stock for ${product.name} (Available: ${availableStock})`);
                    }
                }
            }
        }

        // 2.8 Delivery Logistics
        let deliveryCharge = 0;
        const settings = await prisma.businessSettings.findUnique({
            where: { tenantId_storeId: { tenantId: req.user.tenantId, storeId: req.user.storeId || null } }
        });

        if (settings) {
            // A. Calculate Delivery Charge from Slabs
            if (settings.deliverySlabs && Array.isArray(settings.deliverySlabs)) {
                const slabs = [...settings.deliverySlabs].sort((a, b) => b.minOrderValue - a.minOrderValue);
                const matchedSlab = slabs.find(slab => subtotal >= slab.minOrderValue);
                if (matchedSlab) {
                    deliveryCharge = Number(matchedSlab.fee || 0);
                }
            }

            // B. Radius Enforcement
            const isAgent = req.user.role === 'SALES_AGENT';
            if (settings.deliveryRadiusEnforced && isAgent) {
                const uLat = Number(lat);
                const uLon = Number(lon);

                if (!uLat || !uLon) {
                    res.status(400);
                    throw new Error("Delivery location coordinates are required to verify geofencing compliance.");
                }
                
                if (!routeTag?.villageName) {
                    res.status(400);
                    throw new Error("Unable to verify geofencing: No active village assignment found for this shift.");
                }

                const village = await prisma.village.findFirst({
                    where: { name: routeTag.villageName, tenantId: req.user.tenantId }
                });

                if (village && village.latitude && village.longitude) {
                    const R = 6371e3; // metres
                    const φ1 = uLat * Math.PI / 180;
                    const φ2 = village.latitude * Math.PI / 180;
                    const Δφ = (village.latitude - uLat) * Math.PI / 180;
                    const Δλ = (village.longitude - uLon) * Math.PI / 180;
                    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                              Math.cos(φ1) * Math.cos(φ2) *
                              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const distance = R * c;

                    if (distance > (village.radius || 500)) {
                        res.status(400);
                        throw new Error(`Delivery location is outside the authorized radius for ${village.name} (${Math.round(distance)}m > ${village.radius}m)`);
                    }
                }
            }
        }

        totalAmount += deliveryCharge;

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
                    customerId: resolvedCustomerId,
                    userId: agentId || null,
                    vehicleId: vehicleId || null,
                    routeId: routeTag.routeId || null,
                    villageName: routeTag.villageName,
                    coverageType: routeTag.coverageType,
                    appliedPromotion: appliedPromotionId ? { connect: { id: appliedPromotionId } } : undefined,
                    discountAmount,
                    storeId: req.user.storeId || null,
                    deliveryCharge: deliveryCharge,
                    deliverySlot: deliverySlot || null,
                    deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
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

            // Reduce inventory for all items in parallel
            if (order.vehicleId) {
                // Vehicle-level sale — decrement VehicleStock
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
            } else {
                // POS / Store-level sale — decrement Product.stock AND WarehouseInventory
                await Promise.all(order.items.map(async (item) => {
                    // 1. Decrement main Product.stock
                    const updatedProduct = await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    });

                    // 2. Sync with WarehouseInventory if it exists
                    // We target the same tenant and optionally storeId if available
                    const wi = await tx.warehouseInventory.findFirst({
                        where: {
                            productId: item.productId,
                            tenantId: order.tenantId
                        }
                    });

                    if (wi) {
                        await tx.warehouseInventory.update({
                            where: { id: wi.id },
                            data: { quantity: { decrement: item.quantity } }
                        });
                    }

                    // Low stock alert for store products
                    if (updatedProduct.stock < (updatedProduct.minStockAlert || 5)) {
                        lowStockItems.push({
                            name: updatedProduct.name,
                            productId: item.productId,
                            quantity: updatedProduct.stock
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
                appliedPromotion: {
                    select: { name: true, code: true, type: true, discountType: true }
                }
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
