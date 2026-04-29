import prisma from '../utils/prisma.js';
import { sendNotification } from '../services/notificationService.js';
import { logActivity } from '../utils/activityLogger.js';
import { format } from 'date-fns';
import { recalculateDailySummary } from './cashController.js';

// ─── HELPER: Check if session is frozen ───────────────────────────────
async function isSessionFrozen(tenantId, storeId, agentId) {
  const dateString = format(new Date(), 'yyyy-MM-dd');
  const session = await prisma.sessionSales.findFirst({
    where: { tenantId, storeId, date: dateString, agentId, isFrozen: true }
  });
  return !!session;
}

// @desc    Edit order item quantity (before session close)
// @route   PUT /api/orders/:orderId/items/:itemId
// @access  Private
export const editOrderItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { quantity } = req.body;
    const tenantId = req.user.tenantId;

    if (!quantity || quantity < 1) {
      res.status(400);
      throw new Error('Quantity must be at least 1');
    }

    // Check session freeze
    if (await isSessionFrozen(tenantId, req.user.storeId, req.user.id)) {
      res.status(403);
      throw new Error('Session is closed. No edits allowed.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: { items: true }
    });

    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.status === 'CANCELLED') { res.status(400); throw new Error('Cannot edit cancelled order'); }

    const item = order.items.find(i => i.id === itemId);
    if (!item) { res.status(404); throw new Error('Order item not found'); }

    const qtyDiff = quantity - item.quantity;
    const amountDiff = qtyDiff * item.price;

    // If increasing qty, check stock
    if (qtyDiff > 0 && order.vehicleId) {
      const stock = await prisma.vehicleStock.findUnique({
        where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: item.productId } }
      });
      if (!stock || stock.quantity < qtyDiff) {
        res.status(400);
        throw new Error(`Insufficient stock. Available: ${stock?.quantity || 0}`);
      }
    } else if (qtyDiff > 0 && !order.vehicleId) {
      // POS sale — check Product.stock
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product && product.stock < qtyDiff) {
        res.status(400);
        throw new Error(`Insufficient store stock. Available: ${product.stock}`);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update order item
      await tx.orderItem.update({
        where: { id: itemId },
        data: { quantity }
      });

      // Update order total
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { totalAmount: { increment: amountDiff } },
        include: { items: { include: { product: { select: { id: true, name: true, image: true } } } }, payment: true, returns: true }
      });

      // Adjust stock if order was completed
      if (order.status === 'COMPLETED' && order.vehicleId && qtyDiff !== 0) {
        await tx.vehicleStock.update({
          where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: item.productId } },
          data: { quantity: { decrement: qtyDiff } }
        });
      } else if (order.status === 'COMPLETED' && !order.vehicleId && qtyDiff !== 0) {
        // POS sale — adjust Product.stock AND WarehouseInventory
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: qtyDiff } }
        });

        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId }
        });
        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { decrement: qtyDiff } }
          });
        }
      }

      // Update payment if exists
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: amountDiff } }
        });
      }

      return updatedOrder;
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'ORDER_ITEM_EDITED',
      details: `Edited qty of item in order #${order.displayId} from ${item.quantity} to ${quantity}`,
      metadata: { orderId, itemId, oldQty: item.quantity, newQty: quantity, amountDiff }
    });

    sendNotification({
      roles: ['ADMIN'],
      title: 'Order Item Edited',
      message: `Order #${order.displayId} item qty changed (${item.quantity} → ${quantity}).`,
      type: 'sales', priority: 'medium',
      metadata: { orderId, itemId }
    });

    res.json(result);
  } catch (error) {
    console.error('[Edit Order Item Error]:', error);
    next(error);
  }
};

// @desc    Remove item from order (before session close)
// @route   DELETE /api/orders/:orderId/items/:itemId
// @access  Private
export const removeOrderItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const tenantId = req.user.tenantId;

    if (await isSessionFrozen(tenantId, req.user.storeId, req.user.id)) {
      res.status(403);
      throw new Error('Session is closed. No edits allowed.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: { items: true, payment: true }
    });

    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.status === 'CANCELLED') { res.status(400); throw new Error('Cannot edit cancelled order'); }
    if (order.items.length <= 1) { res.status(400); throw new Error('Cannot remove last item. Cancel order instead.'); }

    const item = order.items.find(i => i.id === itemId);
    if (!item) { res.status(404); throw new Error('Order item not found'); }

    const itemTotal = item.price * item.quantity;

    const result = await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: itemId } });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { totalAmount: { decrement: itemTotal } },
        include: { items: { include: { product: { select: { id: true, name: true, image: true } } } }, payment: true, returns: true }
      });

      // Restore stock if order was completed
      if (order.status === 'COMPLETED' && order.vehicleId) {
        await tx.vehicleStock.update({
          where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: item.productId } },
          data: { quantity: { increment: item.quantity } }
        });
      } else if (order.status === 'COMPLETED' && !order.vehicleId) {
        // POS sale — restore Product.stock AND WarehouseInventory
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });

        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId }
        });
        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { increment: item.quantity } }
          });
        }
      }

      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: itemTotal } }
        });
      }

      return updatedOrder;
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'ORDER_ITEM_REMOVED',
      details: `Removed item from order #${order.displayId}. Amount adjusted: -₹${itemTotal}`,
      metadata: { orderId, itemId, removedAmount: itemTotal }
    });

    res.json(result);
  } catch (error) {
    console.error('[Remove Order Item Error]:', error);
    next(error);
  }
};

// @desc    Return item(s) from order (before session close)
// @route   POST /api/orders/:orderId/return
// @access  Private
export const returnOrderItems = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { items, reason } = req.body; // items: [{ orderItemId, returnQty }]
    const tenantId = req.user.tenantId;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      throw new Error('At least one return item is required');
    }

    if (await isSessionFrozen(tenantId, req.user.storeId, req.user.id)) {
      res.status(403);
      throw new Error('Session is closed. No returns allowed.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: { items: true, returns: true, payment: true }
    });

    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.status === 'CANCELLED') { res.status(400); throw new Error('Cannot return from cancelled order'); }

    // Validate return quantities
    let totalReturnAmount = 0;
    const returnOps = [];

    for (const ri of items) {
      const orderItem = order.items.find(i => i.id === ri.orderItemId);
      if (!orderItem) { res.status(400); throw new Error(`Order item ${ri.orderItemId} not found`); }

      // Calculate already returned qty for this item
      const alreadyReturned = order.returns
        .filter(r => r.orderItemId === ri.orderItemId && r.status === 'COMPLETED')
        .reduce((sum, r) => sum + r.returnQty, 0);

      const maxReturnable = orderItem.quantity - alreadyReturned;
      if (ri.returnQty > maxReturnable) {
        res.status(400);
        throw new Error(`Cannot return ${ri.returnQty} of item. Max returnable: ${maxReturnable}`);
      }
      if (ri.returnQty < 1) {
        res.status(400);
        throw new Error('Return quantity must be at least 1');
      }

      const returnAmount = ri.returnQty * orderItem.price;
      totalReturnAmount += returnAmount;

      returnOps.push({
        orderItem,
        returnQty: ri.returnQty,
        returnAmount,
        alreadyReturned,
        maxReturnable
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create return records
      for (const op of returnOps) {
        await tx.orderReturn.create({
          data: {
            tenantId,
            storeId: req.user.storeId,
            orderId,
            orderItemId: op.orderItem.id,
            productId: op.orderItem.productId,
            returnQty: op.returnQty,
            returnAmount: op.returnAmount,
            reason: reason || null,
            returnedById: req.user.id
          }
        });

        // Restore stock
        if (order.vehicleId) {
          await tx.vehicleStock.update({
            where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: op.orderItem.productId } },
            data: { quantity: { increment: op.returnQty } }
          });
        } else {
          // POS sale — restore Product.stock AND WarehouseInventory
          await tx.product.update({
            where: { id: op.orderItem.productId },
            data: { stock: { increment: op.returnQty } }
          });

          const wi = await tx.warehouseInventory.findFirst({
            where: { productId: op.orderItem.productId, tenantId }
          });
          if (wi) {
            await tx.warehouseInventory.update({
              where: { id: wi.id },
              data: { quantity: { increment: op.returnQty } }
            });
          }
        }
      }

      // Update order total
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { decrement: totalReturnAmount },
          status: totalReturnAmount >= order.totalAmount ? 'RETURNED' : 'PARTIALLY_RETURNED'
        },
        include: { items: { include: { product: { select: { id: true, name: true, image: true } } } }, returns: true, payment: true }
      });

      // Adjust payment
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: totalReturnAmount } }
        });
      }

      return updatedOrder;
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'ORDER_RETURN',
      details: `Returned ${items.length} item(s) from order #${order.displayId}. Return value: ₹${totalReturnAmount}`,
      metadata: { orderId, returnAmount: totalReturnAmount, itemCount: items.length }
    });

    // Large return alert
    if (totalReturnAmount >= 500) {
      sendNotification({
        roles: ['ADMIN', 'SUPERVISOR'],
        title: '⚠️ Large Return Alert',
        message: `Return of ₹${totalReturnAmount} on order #${order.displayId} by ${req.user.name}.`,
        type: 'sales', priority: 'high',
        metadata: { orderId, returnAmount: totalReturnAmount }
      });
    }

    // Recalculate cash summary if applicable
    if (order.vehicleId && (order.paymentMode === 'CASH' || order.paymentMode === 'CASH_UPI')) {
      const dateString = format(new Date(), 'yyyy-MM-dd');
      recalculateDailySummary(order.vehicleId, dateString).catch(err => {
        console.warn('[CASH] Summary sync failed after return:', err.message);
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[Return Order Items Error]:', error);
    next(error);
  }
};

// @desc    Cancel entire order (before session close)
// @route   POST /api/orders/:orderId/cancel
// @access  Private
export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const tenantId = req.user.tenantId;

    if (await isSessionFrozen(tenantId, req.user.storeId, req.user.id)) {
      res.status(403);
      throw new Error('Session is closed. No cancellations allowed.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: { items: true, payment: true }
    });

    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.status === 'CANCELLED') { res.status(400); throw new Error('Order already cancelled'); }

    const result = await prisma.$transaction(async (tx) => {
      // Restore all stock
      if (order.status === 'COMPLETED') {
        if (order.vehicleId) {
          for (const item of order.items) {
            await tx.vehicleStock.update({
              where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: item.productId } },
              data: { quantity: { increment: item.quantity } }
            });
          }
        } else {
          // POS sale — restore Product.stock AND WarehouseInventory
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            });

            const wi = await tx.warehouseInventory.findFirst({
              where: { productId: item.productId, tenantId }
            });
            if (wi) {
              await tx.warehouseInventory.update({
                where: { id: wi.id },
                data: { quantity: { increment: item.quantity } }
              });
            }
          }
        }
      }

      // Cancel order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', totalAmount: 0 },
        include: { items: { include: { product: { select: { id: true, name: true, image: true } } } }, returns: true, payment: true }
      });

      // Cancel payment
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: 'CANCELLED', amount: 0 }
        });
      }

      return updatedOrder;
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'ORDER_CANCELLED',
      details: `Cancelled order #${order.displayId}. Original amount: ₹${order.totalAmount}. Reason: ${reason || 'N/A'}`,
      metadata: { orderId, originalAmount: order.totalAmount, reason }
    });

    sendNotification({
      roles: ['ADMIN', 'SUPERVISOR'],
      title: 'Order Cancelled',
      message: `Order #${order.displayId} (₹${order.totalAmount}) cancelled by ${req.user.name}. Reason: ${reason || 'N/A'}`,
      type: 'sales', priority: 'high',
      metadata: { orderId, originalAmount: order.totalAmount }
    });

    if (order.vehicleId && (order.paymentMode === 'CASH' || order.paymentMode === 'CASH_UPI')) {
      const dateString = format(new Date(), 'yyyy-MM-dd');
      recalculateDailySummary(order.vehicleId, dateString).catch(err => {
        console.warn('[CASH] Summary sync failed after cancel:', err.message);
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[Cancel Order Error]:', error);
    next(error);
  }
};

// @desc    Get session sales summary
// @route   GET /api/orders/session-sales
// @access  Private
export const getSessionSales = async (req, res, next) => {
  try {
    const { date, storeId } = req.query;
    const tenantId = req.user.tenantId;
    const dateString = date || format(new Date(), 'yyyy-MM-dd');

    const startOfDay = new Date(dateString);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateString);
    endOfDay.setHours(23, 59, 59, 999);

    const whereClause = {
      tenantId,
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }
    };
    if (storeId) whereClause.storeId = storeId;
    else if (req.user.storeId) whereClause.storeId = req.user.storeId;

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        returns: true
      }
    });

    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalReturns = orders.reduce((sum, o) => sum + o.returns.reduce((rs, r) => rs + r.returnAmount, 0), 0);

    const cancelledOrders = await prisma.order.count({
      where: { ...whereClause, status: 'CANCELLED' }
    });

    // Group by payment mode
    const cashSales = orders.filter(o => o.paymentMode === 'CASH').reduce((s, o) => s + o.totalAmount, 0);
    const upiSales = orders.filter(o => o.paymentMode === 'UPI').reduce((s, o) => s + o.totalAmount, 0);

    res.json({
      date: dateString,
      totalOrders: orders.length,
      cancelledOrders,
      totalSales,
      totalReturns,
      netSales: totalSales - totalReturns,
      cashSales,
      upiSales,
      orders
    });
  } catch (error) {
    console.error('[Session Sales Error]:', error);
    next(error);
  }
};

// @desc    Get return report
// @route   GET /api/orders/return-report
// @access  Private (Admin)
export const getReturnReport = async (req, res, next) => {
  try {
    const { date, fromDate, toDate, storeId } = req.query;
    const tenantId = req.user.tenantId;

    const where = { tenantId };
    if (storeId) where.storeId = storeId;
    else if (req.user.storeId) where.storeId = req.user.storeId;

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: d, lte: end };
    } else if (fromDate && toDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      where.createdAt = { gte: from, lte: to };
    }

    const returns = await prisma.orderReturn.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, image: true, price: true } },
        order: { select: { id: true, displayId: true, customerName: true, mobile: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalReturnValue = returns.reduce((sum, r) => sum + r.returnAmount, 0);
    const totalReturnQty = returns.reduce((sum, r) => sum + r.returnQty, 0);

    res.json({
      totalReturns: returns.length,
      totalReturnValue,
      totalReturnQty,
      returns
    });
  } catch (error) {
    console.error('[Return Report Error]:', error);
    next(error);
  }
};

// @desc    Get item-wise sales report
// @route   GET /api/orders/item-wise-report
// @access  Private (Admin)
export const getItemWiseReport = async (req, res, next) => {
  try {
    const { date, storeId } = req.query;
    const tenantId = req.user.tenantId;
    const dateString = date || format(new Date(), 'yyyy-MM-dd');

    const startOfDay = new Date(dateString);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateString);
    endOfDay.setHours(23, 59, 59, 999);

    const orderWhere = {
      tenantId,
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }
    };
    if (storeId) orderWhere.storeId = storeId;
    else if (req.user.storeId) orderWhere.storeId = req.user.storeId;

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        items: { include: { product: { select: { id: true, name: true, image: true } } } },
        returns: true
      }
    });

    // Aggregate by product
    const itemMap = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (!itemMap[item.productId]) {
          itemMap[item.productId] = {
            productId: item.productId,
            name: item.product?.name || 'Unknown',
            image: item.product?.image || null,
            soldQty: 0, soldValue: 0,
            returnedQty: 0, returnedValue: 0
          };
        }
        itemMap[item.productId].soldQty += item.quantity;
        itemMap[item.productId].soldValue += item.price * item.quantity;
      }
      for (const ret of order.returns) {
        if (itemMap[ret.productId]) {
          itemMap[ret.productId].returnedQty += ret.returnQty;
          itemMap[ret.productId].returnedValue += ret.returnAmount;
        }
      }
    }

    const report = Object.values(itemMap).map(item => ({
      ...item,
      netQty: item.soldQty - item.returnedQty,
      netValue: item.soldValue - item.returnedValue
    }));

    report.sort((a, b) => b.netValue - a.netValue);

    res.json({ date: dateString, items: report });
  } catch (error) {
    console.error('[Item Wise Report Error]:', error);
    next(error);
  }
};

// @desc    Freeze/Close session (prevents further edits)
// @route   POST /api/orders/freeze-session
// @access  Private (Admin)
export const freezeSession = async (req, res, next) => {
  try {
    const { date, shift = 1, agentId } = req.body;
    const tenantId = req.user.tenantId;
    const dateString = date || format(new Date(), 'yyyy-MM-dd');

    const session = await prisma.sessionSales.upsert({
      where: {
        tenantId_storeId_date_shift_agentId: {
          tenantId,
          storeId: req.user.storeId || null,
          date: dateString,
          shift,
          agentId: agentId || null
        }
      },
      update: { isFrozen: true, frozenAt: new Date() },
      create: {
        tenantId,
        storeId: req.user.storeId,
        date: dateString,
        shift,
        agentId: agentId || null,
        isFrozen: true,
        frozenAt: new Date()
      }
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'SESSION_FROZEN',
      details: `Session frozen for ${dateString} shift ${shift}`,
      metadata: { date: dateString, shift, agentId }
    });

    res.json({ message: 'Session frozen successfully', session });
  } catch (error) {
    console.error('[Freeze Session Error]:', error);
    next(error);
  }
};
