import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

// ─── CREATE GRN (Receive Goods) ─────────────────────────────────────
export const createGRN = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { poId, items, remarks, challanId } = req.body;

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

      // 1. Create the GRN and Items (All items start as QC_PENDING)
      const grn = await tx.goodsReceipt.create({
        data: {
          tenantId,
          storeId,
          displayId,
          poId,
          remarks: remarks || null,
          challanId: challanId || null,
          items: {
            create: items.map(item => ({
              tenantId,
              productId: item.productId,
              orderedQty: parseInt(item.orderedQty),
              receivedQty: parseInt(item.receivedQty),
              damagedQty: parseInt(item.damagedQty) || 0,
              missingQty: parseInt(item.missingQty) || 0,
              expiryStatus: item.expiryStatus || 'SAFE',
              qcStatus: 'PENDING'
            }))
          }
        }
      });

      // 2. Update PO Items receivedQty (Mark as building-received, but not yet saleable)
      for (const item of items) {
        const qty = parseInt(item.receivedQty);
        if (qty > 0) {
          await tx.purchaseOrderItem.updateMany({
            where: { poId, productId: item.productId },
            data: { receivedQty: { increment: qty } }
          });
        }
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

    res.status(201).json({ message: 'Goods received successfully. Awaiting QC approval before stock is updated.' });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: storeId || req.user.storeId,
      action: 'GRN_CREATED',
      details: `Received stock for PO ${po.displayId || poId}. Items marked as QC_PENDING.`,
      metadata: { poId, itemCount: items.length }
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
          select: { displayId: true, vendor: { select: { vendorName: true } } }
        },
        store: { select: { name: true } },
        items: {
          include: { 
            product: { select: { name: true, skuCode: true, brand: true, category: true } } 
          }
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
    const { items, remarks, challanId } = req.body;
    const tenantId = req.user.tenantId;

    const existingGRN = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingGRN) return res.status(404).json({ message: 'GRN not found' });

    await prisma.$transaction(async (tx) => {
      // 1. Update main GRN fields
      await tx.goodsReceipt.update({
        where: { id },
        data: { 
          remarks: remarks || existingGRN.remarks,
          challanId: challanId || existingGRN.challanId
        }
      });

      // 2. Update Items and PO quantities
      for (const item of items) {
        const existingItem = existingGRN.items.find(i => i.productId === item.productId);
        const diff = parseInt(item.receivedQty) - (existingItem ? existingItem.receivedQty : 0);

        if (existingItem) {
          await tx.goodsReceiptItem.update({
            where: { id: existingItem.id },
            data: {
              receivedQty: parseInt(item.receivedQty),
              damagedQty: parseInt(item.damagedQty) || 0,
              missingQty: parseInt(item.missingQty) || 0,
              expiryStatus: item.expiryStatus || 'SAFE'
            }
          });
        }

        // Update PO receivedQty
        if (diff !== 0) {
          await tx.purchaseOrderItem.updateMany({
            where: { poId: existingGRN.poId, productId: item.productId },
            data: { receivedQty: { increment: diff } }
          });
        }
      }
    });

    res.json({ message: 'Goods receipt updated successfully' });
  } catch (error) {
    console.error('❌ Update GRN Error:', error);
    res.status(500).json({ message: 'Error updating goods receipt', error: error.message });
  }
};

// ─── UPDATE QC STATUS ─────────────────────────────────────
export const updateQCStatus = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status, remarks } = req.body;
    const tenantId = req.user.tenantId;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid QC status' });
    }

    const grnItem = await prisma.goodsReceiptItem.findUnique({
      where: { id: itemId },
      include: { grn: true }
    });

    if (!grnItem) return res.status(404).json({ message: 'GRN Item not found' });
    if (grnItem.qcStatus !== 'PENDING') {
      return res.status(400).json({ message: `QC already processed for this item (${grnItem.qcStatus})` });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update QC Status
      await tx.goodsReceiptItem.update({
        where: { id: itemId },
        data: { 
          qcStatus: status,
          qcRemarks: remarks || null
        }
      });

      // 2. If Approved, increment saleable stock
      if (status === 'APPROVED') {
        const qty = grnItem.receivedQty;
        const productId = grnItem.productId;

        // A. Update Warehouse Inventory
        let warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
        if (!warehouse) {
          warehouse = await tx.warehouse.create({
            data: { tenantId, name: 'Main Warehouse', location: 'Default' }
          });
        }

        await tx.warehouseInventory.upsert({
          where: { warehouseId_productId: { warehouseId: warehouse.id, productId } },
          update: { quantity: { increment: qty } },
          create: {
            tenantId,
            warehouseId: warehouse.id,
            productId,
            quantity: qty
          }
        });

        // B. Update Product Master Stock
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: qty } }
        });

        // C. Log to Procurement Stock Ledger
        await tx.procurementStockLedger.create({
          data: {
            tenantId,
            productId,
            type: 'PURCHASE',
            quantity: qty,
            reference: grnItem.grnId,
            refType: 'GRN',
            remarks: `QC Approved for GRN ${grnItem.grn.displayId}`
          }
        });
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'QC_UPDATED',
      details: `QC ${status} for item in GRN ${grnItem.grn.displayId}`,
      metadata: { itemId, status }
    });

    res.json({ message: `QC status updated to ${status}` });
  } catch (error) {
    console.error('❌ Update QC Status Error:', error);
    res.status(500).json({ message: 'Error updating QC status', error: error.message });
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
      // 1. Revert Stock (Only for already APPROVED items) & PO item receivedQty
      for (const item of grn.items) {
        const qty = item.receivedQty;

        // Decrement PO item receivedQty
        await tx.purchaseOrderItem.updateMany({
          where: { poId: grn.poId, productId: item.productId },
          data: { receivedQty: { decrement: qty } }
        });

        if (item.qcStatus === 'APPROVED') {
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
      details: `Deleted Goods Receipt ${grn.displayId}`,
      metadata: { grnId: id, poId: grn.poId }
    });

    res.json({ message: 'Goods receipt deleted successfully' });
  } catch (error) {
    console.error('❌ Delete GRN Error:', error);
    res.status(500).json({ message: 'Error deleting goods receipt', error: error.message });
  }
};
