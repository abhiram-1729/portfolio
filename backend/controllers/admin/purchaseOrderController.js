import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

// ─── CREATE PO ─────────────────────────────────────
export const createPO = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { vendorId, items, poDate, expectedDelivery, remarks } = req.body;

    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Vendor and at least one item are required' });
    }

    // Validate vendor is active
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor || vendor.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Vendor is inactive or not found. Cannot create PO.' });
    }

    // Validate only mapped items
    const mappedItems = await prisma.vendorItemMapping.findMany({
      where: { vendorId },
      select: { productId: true }
    });
    const mappedProductIds = new Set(mappedItems.map(m => m.productId));

    for (const item of items) {
      if (!mappedProductIds.has(item.productId)) {
        return res.status(400).json({ message: `Item ${item.productId} is not mapped to this vendor` });
      }
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ message: 'All item quantities must be greater than 0' });
      }
    }

    const storeId = req.body.storeId || req.user.storeId || null;

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

    const displayId = await generateId({
      entity: 'PO',
      tenantId,
      storeId
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        storeId,
        displayId,
        vendorId,
        poDate: poDate ? new Date(poDate) : new Date(),
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        remarks: remarks || null,
        totalAmount,
        items: {
          create: items.map(item => ({
            tenantId,
            productId: item.productId,
            quantity: parseInt(item.quantity),
            rate: parseFloat(item.rate),
            total: parseInt(item.quantity) * parseFloat(item.rate)
          }))
        }
      },
      include: {
        vendor: { select: { vendorName: true } },
        items: { include: { product: { select: { name: true } } } }
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: storeId || req.user.storeId,
      action: 'PO_CREATED',
      details: `Created Purchase Order ${po.displayId} for vendor ${po.vendor?.vendorName}. Total: ₹${totalAmount.toFixed(2)}`,
      metadata: { poId: po.id, totalAmount }
    });

    res.status(201).json({ message: 'Purchase Order created successfully', po });
  } catch (error) {
    console.error('❌ Create PO Error:', error);
    res.status(500).json({ message: 'Error creating purchase order', error: error.message });
  }
};

// ─── GET POs ─────────────────────────────────────
export const getPOs = async (req, res) => {
  try {
    const { status, vendorId, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (status) {
      if (status.includes(',')) {
        where.status = { in: status.split(',') };
      } else {
        where.status = status;
      }
    }
    if (vendorId) where.vendorId = vendorId;
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { vendorName: true, mobile: true } },
        items: {
          include: {
            product: { select: { name: true, purchasePrice: true } }
          }
        },
        _count: { select: { goodsReceipts: true } }
      }
    });

    res.json(pos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase orders', error: error.message });
  }
};

// ─── GET SINGLE PO ─────────────────────────────────────
export const getPOById = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          include: {
            product: { select: { id: true, name: true, purchasePrice: true, price: true, image: true } }
          }
        },
        goodsReceipts: {
          include: { items: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
    res.json(po);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase order', error: error.message });
  }
};

// ─── UPDATE PO STATUS ─────────────────────────────────────
export const updatePOStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['CREATED', 'APPROVED', 'ORDERED', 'DELIVERED', 'CLOSED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { vendor: { select: { vendorName: true } } }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: po.storeId || req.user.storeId,
      action: 'PO_UPDATED',
      details: `Updated status of PO ${po.displayId} to ${status}`,
      metadata: { poId: id, status }
    });

    res.json({ message: `PO status updated to ${status}`, po });
  } catch (error) {
    res.status(500).json({ message: 'Error updating PO status', error: error.message });
  }
};

// ─── UPDATE PO ─────────────────────────────────────
export const updatePO = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, poDate, expectedDelivery, remarks } = req.body;

    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingPO) return res.status(404).json({ message: 'PO not found' });
    if (['CLOSED', 'DELIVERED', 'CANCELLED'].includes(existingPO.status)) {
      return res.status(400).json({ message: `Cannot update PO in ${existingPO.status} status` });
    }

    const totalAmount = items ? items.reduce((sum, item) => {
      const q = parseInt(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      return sum + (q * r);
    }, 0) : existingPO.totalAmount;

    const po = await prisma.$transaction(async (tx) => {
      // Delete old items if items are provided
      if (items) {
        await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
      }

      const parsedDate = poDate ? new Date(poDate) : null;
      const isValidDate = parsedDate && !isNaN(parsedDate.getTime());
      
      const parsedExp = expectedDelivery ? new Date(expectedDelivery) : null;
      const isValidExp = parsedExp && !isNaN(parsedExp.getTime());

      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          poDate: isValidDate ? parsedDate : existingPO.poDate,
          expectedDelivery: isValidExp ? parsedExp : (expectedDelivery === null ? null : existingPO.expectedDelivery),
          remarks: remarks !== undefined ? remarks : existingPO.remarks,
          totalAmount,
          items: items ? {
            create: items.map(item => ({
              tenantId: existingPO.tenantId,
              productId: item.productId,
              quantity: parseInt(item.quantity) || 0,
              rate: parseFloat(item.rate) || 0,
              total: (parseInt(item.quantity) || 0) * (parseFloat(item.rate) || 0)
            }))
          } : undefined
        },
        include: {
          vendor: { select: { vendorName: true } },
          items: { include: { product: { select: { name: true } } } }
        }
      });
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: po.storeId || req.user.storeId,
      action: 'PO_UPDATED',
      details: `Updated Purchase Order ${po.displayId}`,
      metadata: { poId: id }
    });

    res.json({ message: 'Purchase Order updated successfully', po });
  } catch (error) {
    console.error('❌ Update PO Error:', error);
    res.status(500).json({ message: 'Error updating purchase order', error: error.message });
  }
};

// ─── DELETE PO ─────────────────────────────────────
export const deletePO = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { _count: { select: { goodsReceipts: true } } }
    });

    if (!po) return res.status(404).json({ message: 'PO not found' });
    
    // Safety check: Don't delete if goods have been received or if it's closed
    if (po._count.goodsReceipts > 0) {
      return res.status(400).json({ message: 'Cannot delete PO with associated Goods Receipts. Cancel it instead.' });
    }

    await prisma.$transaction([
      prisma.purchaseOrderItem.deleteMany({ where: { poId: id } }),
      prisma.purchaseOrder.delete({ where: { id } })
    ]);

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: po.storeId || req.user.storeId,
      action: 'PO_DELETED',
      details: `Deleted Purchase Order ${po.displayId}`,
      metadata: { poId: id, poNumber: po.displayId }
    });

    res.json({ message: 'Purchase Order deleted successfully' });
  } catch (error) {
    console.error('❌ Delete PO Error:', error);
    res.status(500).json({ message: 'Error deleting purchase order', error: error.message });
  }
};
