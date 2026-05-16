import prisma from '../../utils/prisma.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

export const getSalesHistory = async (req, res) => {
  try {
    const { fromDate, toDate, vehicleId, userId, storeId } = req.query;
    
    // Build query
    let whereClause = {
      tenantId: req.user.tenantId
    };

    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) whereClause.createdAt.gte = new Date(fromDate);
      if (toDate) whereClause.createdAt.lte = new Date(toDate);
    }

    if (vehicleId) whereClause.vehicleId = vehicleId;
    if (userId) whereClause.userId = userId;
    
    // Filter by store using the direct storeId column
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      whereClause.storeId = storeId;
    } else if (req.user.storeId) {
      const isGlobal = 
        ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
        req.user.customRole?.portalType === 'ADMIN';
        
      if (!isGlobal) {
        whereClause.storeId = req.user.storeId;
      }
    }

    const sales = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, mobile: true, role: true } },
        vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true, assignedUsers: { select: { id: true, name: true, mobile: true } } } },
        route: { select: { id: true, routeName: true } },
        terminal: true,
        items: {
          include: {
            product: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(sales);
  } catch (error) {
    console.error('🔥 Sales Fetch Error:', error);
    res.status(500).json({ 
      message: 'Error fetching sales data', 
      error: error.message,
      detail: error.code === 'P2025' ? 'Record not found' : error.code
    });
  }
};

export const createManualSale = async (req, res) => {
  try {
    const { storeId, vehicleId, agentId, routeId, villageName, saleDate, customerName, mobile, paymentMode, cashAmount, upiAmount, remark, items } = req.body;
    const tenantId = req.user.tenantId;
    let finalStoreId = (storeId && storeId !== '') ? storeId : req.user.storeId;
    if (!finalStoreId) {
      const fallbackStore = await prisma.store.findFirst({ where: { tenantId } });
      if (fallbackStore) finalStoreId = fallbackStore.id;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    // Sort items deterministically by productId to prevent DB row-level deadlocks during concurrent updates
    items.sort((a, b) => String(a.productId).localeCompare(String(b.productId)));

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    }

    const result = await prisma.$transaction(async (tx) => {
      const orderDisplayId = await generateId({
        entity: 'ORD',
        tenantId: tenantId,
        storeId: finalStoreId
      });

      const orderData = {
        tenant: { connect: { id: tenantId } },
        store: { connect: { id: finalStoreId } },
        displayId: orderDisplayId,
        customerName: customerName || 'Manual Entry',
        mobile: mobile || null,
        totalAmount,
        status: 'COMPLETED',
        paymentMode: paymentMode || 'CASH',
        cashAmount: parseFloat(cashAmount) || 0,
        upiAmount: parseFloat(upiAmount) || 0
      };

      if (saleDate) {
        orderData.createdAt = new Date(saleDate);
      }
      if (agentId) orderData.agentId = agentId;
      if (vehicleId) orderData.vehicle = { connect: { id: vehicleId } };
      if (routeId) orderData.route = { connect: { id: routeId } };
      if (villageName) orderData.villageName = villageName;
      if (agentId) orderData.user = { connect: { id: agentId } };

      // Ensure persistent Customer Profile mapping to reflect in CRM directory views
      let customerIdResolved = null;
      if (mobile && mobile.trim() !== '') {
        try {
          const cust = await tx.customer.upsert({
            where: { 
              tenantId_mobile: {
                tenantId,
                mobile: mobile.trim()
              }
            },
            update: {},
            create: {
              tenant: { connect: { id: tenantId } },
              store: { connect: { id: finalStoreId } },
              name: customerName || 'Walk-in Customer',
              mobile: mobile.trim(),
              segment: 'REGULAR',
              loyaltyPoints: 0,
              creditBalance: 0
            }
          });
          customerIdResolved = cust.id;
        } catch (custErr) {
          // Graceful fallback for concurrent transaction indexing races
          const existingCust = await tx.customer.findUnique({ 
            where: { 
              tenantId_mobile: {
                tenantId,
                mobile: mobile.trim()
              }
            } 
          });
          if (existingCust) customerIdResolved = existingCust.id;
        }
      }

      if (customerIdResolved) {
        orderData.customer = { connect: { id: customerIdResolved } };
      }

      const newOrder = await tx.order.create({
        data: {
          ...orderData,
          items: {
            create: items.map(item => ({
              tenant: { connect: { id: tenantId } },
              store: { connect: { id: finalStoreId } },
              product: { connect: { id: item.productId } },
              quantity: parseInt(item.quantity) || 1,
              price: parseFloat(item.price) || 0,
              discount: parseFloat(item.discount) || 0,
              gst: parseFloat(item.gst) || 0
            }))
          }
        },
        include: { items: true }
      });

      await tx.payment.create({
        data: {
          tenant: { connect: { id: tenantId } },
          store: { connect: { id: finalStoreId } },
          order: { connect: { id: newOrder.id } },
          paymentMode: orderData.paymentMode,
          amount: totalAmount,
          cashAmount: orderData.cashAmount,
          upiAmount: orderData.upiAmount,
          status: 'COMPLETED',
          ...(saleDate && { createdAt: new Date(saleDate) })
        }
      });

      // Inventory deduction
      for (const item of items) {
        const qty = parseInt(item.quantity) || 1;
        if (vehicleId) {
          // Deduct from vehicle stock
          const stock = await tx.vehicleStock.findUnique({
            where: { vehicleId_productId: { vehicleId, productId: item.productId } }
          });
          if (stock && stock.quantity >= qty) {
            await tx.vehicleStock.update({
              where: { vehicleId_productId: { vehicleId, productId: item.productId } },
              data: { quantity: { decrement: qty } }
            });
          } else {
            throw new Error(`Insufficient vehicle stock for product ID ${item.productId}`);
          }
        } else {
          // Deduct from store stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: qty } }
          });
          const wi = await tx.warehouseInventory.findFirst({
            where: { productId: item.productId, tenantId }
          });
          if (wi) {
            await tx.warehouseInventory.update({
              where: { id: wi.id },
              data: { quantity: { decrement: qty } }
            });
          }
        }
      }

      return newOrder;
    }, { maxWait: 5000, timeout: 20000 });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: req.user.storeId,
      action: 'SALE_MANUAL_CREATE',
      details: `Admin created manual sale #${result.orderNumber} for ₹${result.totalAmount}. Remark: ${remark || 'N/A'}`,
      metadata: { orderId: result.id, orderNumber: result.orderNumber }
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('🔥 Create Manual Sale Error:', error);
    res.status(400).json({ 
      message: error.message || 'Error creating manual sale',
      detail: error.meta?.cause || JSON.stringify(error.meta) || error.code
    });
  }
};

export const suspendSale = async (req, res) => {
  try {
    const { storeId, terminalId, customerName, customerMobile, totalAmount, items } = req.body;
    const tenantId = req.user.tenantId;

    // Use relational mapping for all foreign keys to satisfy Prisma's strict validation
    const suspendedData = {
      tenant: { connect: { id: tenantId } },
      customerName: customerName || 'Walk-in',
      customerMobile: customerMobile || null,
      totalAmount: parseFloat(totalAmount) || 0,
      items: items || [],
    };

    if (storeId && storeId.trim() !== '') suspendedData.store = { connect: { id: storeId } };
    if (terminalId && terminalId.trim() !== '') suspendedData.terminal = { connect: { id: terminalId } };
    if (req.user.id) suspendedData.user = { connect: { id: req.user.id } };

    const suspended = await prisma.suspendedSale.create({
      data: suspendedData
    });

    res.status(201).json({ success: true, data: suspended });
  } catch (error) {
    console.error('🔥 Suspend Sale Error:', error);
    res.status(400).json({ 
      message: 'Error suspending sale', 
      error: error.message
    });
  }
};

export const getSuspendedSales = async (req, res) => {
  try {
    const { storeId, terminalId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'null' && storeId !== 'undefined') where.storeId = storeId;
    if (terminalId && terminalId !== 'null' && terminalId !== 'undefined') where.terminalId = terminalId;

    const suspended = await prisma.suspendedSale.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: suspended });
  } catch (error) {
    console.error('🔥 Fetch Suspended Sales Error:', error);
    res.status(400).json({ message: 'Error fetching suspended sales', error: error.message });
  }
};

export const deleteSuspendedSale = async (req, res) => {
  try {
    const { id } = req.params;
    // Use deleteMany to allow filtering by tenantId (since id + tenantId is not a unique index)
    const result = await prisma.suspendedSale.deleteMany({
      where: { id, tenantId: req.user.tenantId }
    });
    
    if (result.count === 0) {
      return res.status(404).json({ message: 'Suspended sale not found or unauthorized' });
    }

    res.json({ success: true, message: 'Suspended sale deleted' });
  } catch (error) {
    console.error('🔥 Delete Suspended Sale Error:', error);
    res.status(400).json({ message: 'Error deleting suspended sale', error: error.message });
  }
};
