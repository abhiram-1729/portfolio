import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { logActivity } from '../../utils/activityLogger.js';

// ─── CREATE CONVERSION (WORK ORDER) ─────────────────────────
export const createConversion = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { storeId, sourceProductId, sourceQty, targetProductId, targetQty, remarks } = req.body;

    if (!sourceProductId || !targetProductId || !sourceQty || !targetQty) {
      return res.status(400).json({ message: 'Source and target product details are required' });
    }

    const sQty = parseInt(sourceQty);
    const tQty = parseInt(targetQty);

    if (sQty <= 0 || tQty <= 0) {
      return res.status(400).json({ message: 'Quantities must be greater than zero' });
    }

    const conversion = await prisma.$transaction(async (tx) => {
      // 1. Create Work Order
      const workOrder = await tx.workOrder.create({
        data: {
          tenantId,
          storeId: storeId || null,
          status: 'COMPLETED', // Execute immediately for now
          remarks,
          items: {
            create: [
              { tenantId, productId: sourceProductId, type: 'CONSUMED', quantity: sQty },
              { tenantId, productId: targetProductId, type: 'PRODUCED', quantity: tQty }
            ]
          }
        },
        include: { items: true }
      });

      // 2. Adjust Master Stock
      // Deduct from source
      await tx.$executeRaw`
        UPDATE "Product" SET stock = stock - ${sQty} WHERE id = ${sourceProductId} AND "tenantId" = ${tenantId}
      `;
      // Add to target
      await tx.$executeRaw`
        UPDATE "Product" SET stock = stock + ${tQty} WHERE id = ${targetProductId} AND "tenantId" = ${tenantId}
      `;

      // 3. Adjust Warehouse/Store Stock
      if (storeId) {
        // Source deduction
        await tx.vehicleStock.updateMany({
          where: { vehicleId: storeId, productId: sourceProductId },
          data: { quantity: { decrement: sQty } }
        });
        // Target addition
        await tx.vehicleStock.upsert({
          where: { vehicleId_productId: { vehicleId: storeId, productId: targetProductId } },
          update: { quantity: { increment: tQty } },
          create: { tenantId, vehicleId: storeId, productId: targetProductId, quantity: tQty }
        });
      } else {
        const warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
        if (!warehouse) throw new Error('Main Warehouse not found');

        // Source deduction
        await tx.warehouseInventory.updateMany({
          where: { warehouseId: warehouse.id, productId: sourceProductId },
          data: { quantity: { decrement: sQty } }
        });
        // Target addition
        await tx.warehouseInventory.upsert({
          where: { warehouseId_productId: { warehouseId: warehouse.id, productId: targetProductId } },
          update: { quantity: { increment: tQty } },
          create: { tenantId, warehouseId: warehouse.id, productId: targetProductId, quantity: tQty }
        });
      }

      return workOrder;
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      action: 'STOCK_CONVERSION',
      details: `Converted ${sQty} of Product ${sourceProductId} to ${tQty} of Product ${targetProductId}`,
      metadata: { workOrderId: conversion.id }
    });

    res.status(201).json({ message: 'Stock conversion completed successfully', conversion });
  } catch (error) {
    console.error('❌ Create Conversion Error:', error);
    res.status(400).json({ message: error.message || 'Error executing stock conversion' });
  }
};

// ─── GET CONVERSIONS ─────────────────────────────────────────
export const getConversions = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const conversions = await prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { select: { name: true, skuCode: true } } } }
      }
    });

    res.json(conversions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversions', error: error.message });
  }
};
