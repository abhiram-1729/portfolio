import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

// ─── CREATE GRN (Receive Goods) ─────────────────────────────────────
export const createGRN = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { poId, items, remarks } = req.body;

    if (!poId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'PO ID and items are required' });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true }
    });

    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
    if (po.status === 'CLOSED' || po.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot receive goods for a closed/cancelled PO' });
    }

    const storeId = po.storeId || req.user.storeId || null;

    await prisma.$transaction(async (tx) => {
      const displayId = await generateId({
        entity: 'GRN',
        tenantId,
        storeId
      });

      // 1. Create the GRN and Items
      const grn = await tx.goodsReceipt.create({
        data: {
          tenantId,
          storeId,
          displayId,
          poId,
          remarks: remarks || null,
          items: {
            create: items.map(item => ({
              tenantId,
              productId: item.productId,
              orderedQty: parseInt(item.orderedQty),
              receivedQty: parseInt(item.receivedQty)
            }))
          }
        }
      });

      // 2. High-Performance Bulk Updates
      const stockMap = new Map();
      for (const item of items) {
        const q = parseInt(item.receivedQty);
        if (q <= 0) continue;
        stockMap.set(item.productId, (stockMap.get(item.productId) || 0) + q);
      }

      const entries = Array.from(stockMap.entries());
      if (entries.length > 0) {
        let warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
        if (!warehouse) {
          warehouse = await tx.warehouse.create({
            data: { tenantId, name: 'Main Warehouse', location: 'Default' }
          });
        }

        // A. Update PO Items (Sequential because we need to match PO item IDs)
        // Note: For extreme performance we could use a single SQL update with CASE, 
        // but PO items are usually few per product.
        for (const item of items) {
          const qty = parseInt(item.receivedQty);
          if (qty > 0) {
            await tx.purchaseOrderItem.updateMany({
              where: { poId, productId: item.productId },
              data: { receivedQty: { increment: qty } }
            });
          }
        }

        // B. Bulk Update Product Master Stock
        const productValues = entries.map(([pId, qty]) => Prisma.sql`(${pId}, ${qty}::int)`);
        await tx.$executeRaw`
          UPDATE "Product"
          SET stock = "Product".stock + v.qty
          FROM (VALUES ${Prisma.join(productValues)}) AS v(id, qty)
          WHERE "Product".id = v.id
        `;

        // C. Bulk Upsert Warehouse Inventory
        const wiValues = entries.map(([pId, qty]) => {
          const tempId = `grnwi_${Math.random().toString(36).substring(2, 11)}`;
          return Prisma.sql`(${tempId}, ${tenantId}, ${warehouse.id}, ${pId}, ${qty}::int)`;
        });

        await tx.$executeRaw`
          INSERT INTO "WarehouseInventory" (id, "tenantId", "warehouseId", "productId", quantity)
          VALUES ${Prisma.join(wiValues)}
          ON CONFLICT ("warehouseId", "productId")
          DO UPDATE SET quantity = "WarehouseInventory".quantity + EXCLUDED.quantity
        `;
      }

      // 3. Finalize Status
      const updatedPOItems = await tx.purchaseOrderItem.findMany({ where: { poId } });
      const allFullyReceived = updatedPOItems.every(item => item.receivedQty >= item.quantity);

      await tx.goodsReceipt.update({
        where: { id: grn.id },
        data: { status: allFullyReceived ? 'COMPLETE' : 'PARTIAL' }
      });

      if (allFullyReceived) {
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: { status: 'DELIVERED' }
        });
      }

      return grn;
    }, {
      maxWait: 40000,
      timeout: 120000
    });

    res.status(201).json({ message: 'Goods received successfully' });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: storeId || req.user.storeId,
      action: 'GRN_CREATED',
      details: `Received stock for PO ${po.displayId || po.poNumber || poId}. Total unique items: ${items.length}`,
      metadata: { poId, itemCount: items.length, status: 'COMPLETE' }
    });
  } catch (error) {
    console.error('❌ Create GRN Error:', error);
    res.status(500).json({ message: 'Error creating goods receipt', error: error.message });
  }
};

// ─── GET GRNs ─────────────────────────────────────
export const getGRNs = async (req, res) => {
  try {
    const { poId, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (poId) where.poId = poId;
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const grns = await prisma.goodsReceipt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        po: {
          select: { poNumber: true, vendor: { select: { vendorName: true } } }
        },
        items: {
          include: { product: { select: { name: true } } }
        }
      }
    });

    res.json(grns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching goods receipts', error: error.message });
  }
};

// ─── UPDATE GRN ─────────────────────────────────────
export const updateGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, remarks } = req.body;
    const tenantId = req.user.tenantId;

    const grn = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: { items: true, po: true }
    });

    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    if (grn.po.status === 'CLOSED') return res.status(400).json({ message: 'Cannot edit GRN of a closed PO' });

    await prisma.$transaction(async (tx) => {
      // 1. Revert existing GRN effects
      for (const item of grn.items) {
        const qty = item.receivedQty;
        // Decrement receivedQty in PO
        const poItems = await tx.purchaseOrderItem.findMany({
          where: { poId: grn.poId, productId: item.productId }
        });
        for (const pi of poItems) {
          await tx.purchaseOrderItem.update({
            where: { id: pi.id },
            data: { receivedQty: { decrement: qty } }
          });
        }

        // Decrement stock in Warehouse
        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId }
        });
        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { decrement: qty } }
          });
        }
        
        // Decrement product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: qty } }
        });
      }

      // 2. Delete old GRN items
      await tx.goodsReceiptItem.deleteMany({ where: { grnId: id } });

      // 3. Apply new GRN effects
      for (const item of items) {
        const qty = parseInt(item.receivedQty) || 0;
        if (qty <= 0) continue;

        await tx.goodsReceiptItem.create({
          data: {
            tenantId,
            grnId: id,
            productId: item.productId,
            orderedQty: item.orderedQty || 0,
            receivedQty: qty
          }
        });

        // Increment receivedQty in PO
        const poItems = await tx.purchaseOrderItem.findMany({
          where: { poId: grn.poId, productId: item.productId }
        });
        for (const pi of poItems) {
          await tx.purchaseOrderItem.update({
            where: { id: pi.id },
            data: { receivedQty: { increment: qty } }
          });
        }

        // Increment stock in Warehouse
        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId }
        });
        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { increment: qty } }
          });
        }

        // Increment product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: qty } }
        });
      }

      // 4. Update GRN metadata
      await tx.goodsReceipt.update({
        where: { id },
        data: { remarks: remarks !== undefined ? remarks : grn.remarks }
      });
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'GRN_UPDATED',
      details: `Updated Goods Receipt #${grn.displayId}`,
      metadata: { grnId: id }
    });

    res.json({ message: 'GRN updated successfully' });
  } catch (error) {
    console.error('❌ Update GRN Error:', error);
    res.status(500).json({ message: 'Error updating GRN', error: error.message });
  }
};

// ─── DELETE GRN ─────────────────────────────────────
export const deleteGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const grn = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: { items: true, po: true }
    });

    if (!grn) return res.status(404).json({ message: 'GRN not found' });

    await prisma.$transaction(async (tx) => {
      // 1. Revert Stock & PO item receivedQty
      for (const item of grn.items) {
        const qty = item.receivedQty;

        // Decrement PO item receivedQty
        const poItems = await tx.purchaseOrderItem.findMany({
          where: { poId: grn.poId, productId: item.productId }
        });
        for (const pi of poItems) {
          await tx.purchaseOrderItem.update({
            where: { id: pi.id },
            data: { receivedQty: { decrement: qty } }
          });
        }

        // Decrement warehouse inventory
        const existingWI = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId }
        });
        if (existingWI) {
          await tx.warehouseInventory.update({
            where: { id: existingWI.id },
            data: { quantity: { decrement: qty } }
          });
        }

        // Decrement product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: qty } }
        });
      }

      // 2. Update PO status back to ORDERED if it was DELIVERED
      if (grn.po.status === 'DELIVERED') {
        await tx.purchaseOrder.update({
          where: { id: grn.poId },
          data: { status: 'ORDERED' }
        });
      }

      // 3. Delete items and GRN
      await tx.goodsReceiptItem.deleteMany({ where: { grnId: id } });
      await tx.goodsReceipt.delete({ where: { id } });
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'GRN_DELETED',
      details: `Deleted Goods Receipt ${grn.displayId} for PO ${grn.po?.poNumber}`,
      metadata: { grnId: id, poId: grn.poId }
    });

    res.json({ message: 'Goods receipt deleted successfully' });
  } catch (error) {
    console.error('❌ Delete GRN Error:', error);
    res.status(500).json({ message: 'Error deleting goods receipt', error: error.message });
  }
};
