import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';

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

      // Create GRN
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

      // Update PO item received quantities
      for (const item of items) {
        const receivedQty = parseInt(item.receivedQty);
        if (receivedQty > 0) {
          await tx.purchaseOrderItem.updateMany({
            where: { poId, productId: item.productId },
            data: { receivedQty: { increment: receivedQty } }
          });

          // Update warehouse inventory
          const existingWI = await tx.warehouseInventory.findFirst({
            where: { productId: item.productId, tenantId }
          });

          if (existingWI) {
            await tx.warehouseInventory.update({
              where: { id: existingWI.id },
              data: { quantity: { increment: receivedQty } }
            });
          } else {
            // Find or create a default warehouse
            let warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
            if (!warehouse) {
              warehouse = await tx.warehouse.create({
                data: { tenantId, name: 'Main Warehouse', location: 'Default' }
              });
            }
            await tx.warehouseInventory.create({
              data: {
                tenantId,
                warehouseId: warehouse.id,
                productId: item.productId,
                quantity: receivedQty
              }
            });
          }
        }
      }

      // Check if all items fully received
      const updatedPOItems = await tx.purchaseOrderItem.findMany({ where: { poId } });
      const allFullyReceived = updatedPOItems.every(item => item.receivedQty >= item.quantity);

      // Update GRN status
      await tx.goodsReceipt.update({
        where: { id: grn.id },
        data: { status: allFullyReceived ? 'COMPLETE' : 'PARTIAL' }
      });

      // Update PO status
      if (allFullyReceived) {
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: { status: 'DELIVERED' }
        });
      } else {
        // At least partially delivered
        if (po.status === 'ORDERED' || po.status === 'APPROVED') {
          // Keep as is or mark as partially delivered through the existing status
        }
      }

      return grn;
    }, {
      maxWait: 20000,
      timeout: 60000
    });

    res.status(201).json({ message: 'Goods received successfully' });
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
