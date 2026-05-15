import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

// --- CREATE WORK ORDER ---
export const createWorkOrder = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { items, orderDate, remarks, storeId: bodyStoreId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item (Input or Output) is required' });
    }

    const storeId = bodyStoreId || req.user.storeId || null;

    const displayId = await generateId({
      entity: 'WO',
      tenantId,
      storeId
    });

    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId,
        storeId,
        status: 'PENDING',
        remarks: remarks || null,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        items: {
          create: items.map(item => ({
            tenantId,
            productId: item.productId,
            type: item.type, // 'INPUT' or 'OUTPUT'
            quantity: parseInt(item.quantity)
          }))
        }
      },
      include: {
        items: { include: { product: { select: { name: true } } } }
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: storeId || req.user.storeId,
      action: 'WORK_ORDER_CREATED',
      details: `Created Work Order ${displayId}`,
      metadata: { workOrderId: workOrder.id }
    });

    res.status(201).json({ message: 'Work Order created successfully', workOrder });
  } catch (error) {
    console.error('❌ Create Work Order Error:', error);
    res.status(500).json({ message: 'Error creating work order', error: error.message });
  }
};

// --- COMPLETE WORK ORDER (Manufacturing Process) ---
export const completeWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!workOrder) return res.status(404).json({ message: 'Work Order not found' });
    if (workOrder.status !== 'PENDING' && workOrder.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: `Cannot complete work order in ${workOrder.status} status` });
    }

    // Process Stock Changes
    await prisma.$transaction(async (tx) => {
      for (const item of workOrder.items) {
        if (item.type === 'INPUT') {
          // Deduct from Warehouse Inventory (Main Warehouse)
          const inv = await tx.warehouseInventory.findFirst({
            where: { productId: item.productId, tenantId: workOrder.tenantId }
          });
          if (!inv || inv.quantity < item.quantity) {
            throw new Error(`Insufficient stock for input product ${item.productId}`);
          }
          await tx.warehouseInventory.update({
            where: { id: inv.id },
            data: { quantity: { decrement: item.quantity } }
          });

          // Log to Ledger
          await tx.procurementStockLedger.create({
            data: {
              tenantId: workOrder.tenantId,
              productId: item.productId,
              type: 'ADJUSTMENT',
              quantity: -item.quantity,
              remarks: `Work Order ${id} Consumption`,
              reference: id,
              refType: 'WORK_ORDER'
            }
          });
        } 
        else if (item.type === 'OUTPUT') {
          // Increment Warehouse Inventory
          const inv = await tx.warehouseInventory.findFirst({
            where: { productId: item.productId, tenantId: workOrder.tenantId }
          });
          if (inv) {
            await tx.warehouseInventory.update({
              where: { id: inv.id },
              data: { quantity: { increment: item.quantity } }
            });
          } else {
            // Find a warehouse to add to
            const wh = await tx.warehouse.findFirst({ where: { tenantId: workOrder.tenantId } });
            await tx.warehouseInventory.create({
              data: {
                tenantId: workOrder.tenantId,
                warehouseId: wh.id,
                productId: item.productId,
                quantity: item.quantity
              }
            });
          }

          // Log to Ledger
          await tx.procurementStockLedger.create({
            data: {
              tenantId: workOrder.tenantId,
              productId: item.productId,
              type: 'ADJUSTMENT',
              quantity: item.quantity,
              remarks: `Work Order ${id} Production`,
              reference: id,
              refType: 'WORK_ORDER'
            }
          });
        }
      }

      await tx.workOrder.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'WORK_ORDER_COMPLETED',
      details: `Completed Work Order ${id}`,
      metadata: { workOrderId: id }
    });

    res.json({ message: 'Work Order completed successfully. Stock adjusted.' });
  } catch (error) {
    console.error('❌ Complete Work Order Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// --- GET WORK ORDERS ---
export const getWorkOrders = async (req, res) => {
  try {
    const { status, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (status) where.status = status;
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { select: { name: true } } } }
      }
    });

    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching work orders', error: error.message });
  }
};

// --- GET SINGLE WORK ORDER ---
export const getWorkOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } }
      }
    });

    if (!workOrder) return res.status(404).json({ message: 'Work Order not found' });
    res.json(workOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching work order', error: error.message });
  }
};
