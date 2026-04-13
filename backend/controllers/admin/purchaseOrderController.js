import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';

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

    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        storeId,
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

    if (status) where.status = status;
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
      data: { status }
    });

    res.json({ message: `PO status updated to ${status}`, po });
  } catch (error) {
    res.status(500).json({ message: 'Error updating PO status', error: error.message });
  }
};
