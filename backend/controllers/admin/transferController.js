import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { logActivity } from '../../utils/activityLogger.js';

// ─── CREATE & DISPATCH TRANSFER ─────────────────────────────
export const createTransfer = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { fromStoreId, toStoreId, items, remarks } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }
    if (fromStoreId === toStoreId) {
      return res.status(400).json({ message: 'Source and destination must be different' });
    }

    const transfer = await prisma.$transaction(async (tx) => {
      // 1. Create Transfer Record
      const newTransfer = await tx.stockTransfer.create({
        data: {
          tenantId,
          fromStoreId: fromStoreId || null,
          toStoreId: toStoreId || null,
          status: 'IN_TRANSIT',
          remarks,
          items: {
            create: items.map(item => ({
              tenantId,
              productId: item.productId,
              quantity: parseInt(item.quantity)
            }))
          }
        },
        include: { items: true }
      });

      // 2. Deduct Stock from Source
      for (const item of items) {
        const qty = parseInt(item.quantity);
        if (qty <= 0) continue;

        if (fromStoreId) {
          // Source is a Store -> Deduct from VehicleStock (assuming stores act as vehicles/branches)
          // Wait, stores use VehicleStock or WarehouseInventory? In Villagkart, stores often use VehicleStock or a separate store stock. 
          // Assuming stores use VehicleStock here.
          const currentStock = await tx.vehicleStock.findUnique({
            where: { vehicleId_productId: { vehicleId: fromStoreId, productId: item.productId } }
          });
          if (!currentStock || currentStock.quantity < qty) {
            throw new Error(`Insufficient stock for product ${item.productId} at source branch`);
          }
          await tx.vehicleStock.update({
            where: { vehicleId_productId: { vehicleId: fromStoreId, productId: item.productId } },
            data: { quantity: { decrement: qty } }
          });
        } else {
          // Source is Main Warehouse
          const warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
          if (!warehouse) throw new Error('Main Warehouse not found');

          const currentStock = await tx.warehouseInventory.findUnique({
            where: { warehouseId_productId: { warehouseId: warehouse.id, productId: item.productId } }
          });
          if (!currentStock || currentStock.quantity < qty) {
            throw new Error(`Insufficient stock for product ${item.productId} at Main Warehouse`);
          }
          await tx.warehouseInventory.update({
            where: { warehouseId_productId: { warehouseId: warehouse.id, productId: item.productId } },
            data: { quantity: { decrement: qty } }
          });
        }
      }

      return newTransfer;
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      action: 'TRANSFER_DISPATCHED',
      details: `Dispatched Transfer TRN-${transfer.transferNumber}`,
      metadata: { transferId: transfer.id }
    });

    res.status(201).json({ message: 'Stock transferred successfully', transfer });
  } catch (error) {
    console.error('❌ Create Transfer Error:', error);
    res.status(400).json({ message: error.message || 'Error creating transfer' });
  }
};

// ─── RECEIVE TRANSFER ───────────────────────────────────────
export const receiveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedItems, remarks } = req.body; // Array of { productId, receivedQty }
    const tenantId = req.user.tenantId;

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (transfer.status !== 'IN_TRANSIT') return res.status(400).json({ message: 'Transfer is not in transit' });

    await prisma.$transaction(async (tx) => {
      // 1. Add Stock to Destination
      for (const tItem of transfer.items) {
        const receivedData = receivedItems?.find(r => r.productId === tItem.productId);
        // If not provided, assume full quantity received
        const rQty = receivedData ? parseInt(receivedData.receivedQty) : tItem.quantity;
        if (rQty <= 0) continue;

        if (transfer.toStoreId) {
          // Dest is Store
          await tx.vehicleStock.upsert({
            where: { vehicleId_productId: { vehicleId: transfer.toStoreId, productId: tItem.productId } },
            update: { quantity: { increment: rQty } },
            create: { tenantId, vehicleId: transfer.toStoreId, productId: tItem.productId, quantity: rQty }
          });
        } else {
          // Dest is Main Warehouse
          const warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
          if (!warehouse) throw new Error('Main Warehouse not found');

          await tx.warehouseInventory.upsert({
            where: { warehouseId_productId: { warehouseId: warehouse.id, productId: tItem.productId } },
            update: { quantity: { increment: rQty } },
            create: { tenantId, warehouseId: warehouse.id, productId: tItem.productId, quantity: rQty }
          });
        }
      }

      // 2. Mark as Received
      await tx.stockTransfer.update({
        where: { id },
        data: { status: 'RECEIVED', remarks: remarks || transfer.remarks }
      });
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      action: 'TRANSFER_RECEIVED',
      details: `Received Transfer TRN-${transfer.transferNumber}`,
      metadata: { transferId: id }
    });

    res.json({ message: 'Transfer received successfully' });
  } catch (error) {
    console.error('❌ Receive Transfer Error:', error);
    res.status(500).json({ message: 'Error receiving transfer', error: error.message });
  }
};

// ─── GET TRANSFERS ──────────────────────────────────────────
export const getTransfers = async (req, res) => {
  try {
    const { status, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (status && status !== 'ALL') where.status = status;
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.OR = [
        { fromStoreId: storeId },
        { toStoreId: storeId }
      ];
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { select: { name: true, skuCode: true } } } }
      }
    });

    res.json(transfers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transfers', error: error.message });
  }
};

// --- GET TRANSFER BY ID -------------------------------------
export const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true, skuCode: true } } } }
      }
    });
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    res.json(transfer);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transfer', error: error.message });
  }
};

// --- DISPATCH TRANSFER --------------------------------------
export const dispatchTransfer = async (req, res) => {
  // Aliased to existing logic if needed, or implement draft dispatch
  res.status(501).json({ message: 'Not implemented yet. Please use POST /transfers to create and dispatch atomically.' });
};

