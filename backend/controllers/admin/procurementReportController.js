import prisma from '../../utils/prisma.js';

// ─── STOCK REPORT (Warehouse) ─────────────────────────────────────
export const getStockReport = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined') where.storeId = storeId;

    // 1. Get all products for the tenant/store
    const products = await prisma.product.findMany({
      where: {
        tenantId: req.user.tenantId,
        status: 'ACTIVE',
        ...(storeId && storeId !== 'undefined' ? {
          OR: [
            { storeId: storeId },
            { storeId: null }
          ]
        } : {})
      },
      include: {
        category: { select: { name: true } },
        unit: { select: { name: true, type: true } },
        WarehouseInventory: {
          select: { quantity: true, warehouse: { select: { name: true } } }
        }
      }
    });

    // 2. Map products to a WarehouseInventory-like structure for frontend compatibility
    // but ensure products with NO warehouse records yet (but have main stock) still show up.
    const report = products
      .map(p => {
        const warehouseQty = p.WarehouseInventory.reduce((acc, curr) => acc + curr.quantity, 0);
        // If it has warehouse records, use that quantity. 
        // If not, but it has main product stock, show that as being in the system.
        const finalQty = warehouseQty > 0 ? warehouseQty : (p.stock || 0);

        return {
          id: p.WarehouseInventory[0]?.id || `virtual-${p.id}`,
          productId: p.id,
          quantity: finalQty,
          storeId: p.storeId,
          tenantId: p.tenantId,
          product: p, // Keep full product object for frontend
          warehouse: p.WarehouseInventory[0]?.warehouse || { name: 'Main Store' }
        };
      })
      .filter(item => item.quantity > 0); // Only show items that actually have stock

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock report', error: error.message });
  }
};

// ─── LOW STOCK ALERT ─────────────────────────────────────
export const getLowStockAlert = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined') where.storeId = storeId;

    // Get all warehouse inventory with product details
    const inventory = await prisma.warehouseInventory.findMany({
      where,
      include: {
        product: {
          select: { name: true, minStockAlert: true, purchasePrice: true, price: true, status: true }
        },
        warehouse: { select: { name: true } }
      }
    });

    // Filter items below their minimum stock threshold
    const lowStock = inventory.filter(item =>
      item.product.status === 'ACTIVE' &&
      item.product.minStockAlert &&
      item.product.minStockAlert > 0 &&
      item.quantity <= item.product.minStockAlert
    );

    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching low stock alerts', error: error.message });
  }
};

// ─── PURCHASE REPORT ─────────────────────────────────────
export const getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, vendorId, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (vendorId) where.vendorId = vendorId;
    if (storeId && storeId !== 'undefined') where.storeId = storeId;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const purchases = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        vendor: { select: { vendorName: true } },
        items: {
          include: { product: { select: { name: true } } }
        }
      },
      orderBy: { invoiceDate: 'desc' }
    });

    const summary = {
      totalPurchases: purchases.length,
      totalAmount: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
      totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
      totalOutstanding: purchases.reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0)
    };

    res.json({ purchases, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase report', error: error.message });
  }
};

// ─── VENDOR REPORT ─────────────────────────────────────
export const getVendorReport = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined') where.storeId = storeId;

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: { purchaseInvoices: true, payments: true, purchaseOrders: true }
        }
      },
      orderBy: { currentBalance: 'desc' }
    });

    const summary = {
      totalVendors: vendors.length,
      activeVendors: vendors.filter(v => v.status === 'ACTIVE').length,
      totalOutstanding: vendors.reduce((sum, v) => sum + Math.max(0, v.currentBalance), 0),
      totalAdvance: vendors.reduce((sum, v) => sum + Math.abs(Math.min(0, v.currentBalance)), 0)
    };

    res.json({ vendors, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor report', error: error.message });
  }
};

// ─── OUTSTANDING PAYABLES ─────────────────────────────────────
export const getOutstandingPayables = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = {
      tenantId: req.user.tenantId,
      status: { in: ['CONFIRMED', 'PARTIAL_PAID'] }
    };

    if (storeId && storeId !== 'undefined') where.storeId = storeId;

    const invoices = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        vendor: { select: { vendorName: true, creditDays: true, mobile: true } }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    const result = invoices.map(inv => {
      const outstanding = inv.totalAmount - inv.paidAmount;
      const dueDate = new Date(new Date(inv.invoiceDate).getTime() + (inv.vendor?.creditDays || 30) * 86400000);
      const isOverdue = dueDate < new Date();
      const daysOverdue = isOverdue ? Math.floor((Date.now() - dueDate.getTime()) / 86400000) : 0;

      return {
        ...inv,
        outstanding,
        dueDate,
        isOverdue,
        daysOverdue
      };
    });

    const summary = {
      totalOutstanding: result.reduce((sum, r) => sum + r.outstanding, 0),
      overdueCount: result.filter(r => r.isOverdue).length,
      overdueAmount: result.filter(r => r.isOverdue).reduce((sum, r) => sum + r.outstanding, 0)
    };

    res.json({ invoices: result, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching outstanding payables', error: error.message });
  }
};

// ─── AGING REPORT ─────────────────────────────────────
export const getAgingReport = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = {
      tenantId: req.user.tenantId,
      status: { in: ['CONFIRMED', 'PARTIAL_PAID'] }
    };

    if (storeId && storeId !== 'undefined') where.storeId = storeId;

    const invoices = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        vendor: { select: { vendorName: true, creditDays: true } }
      }
    });

    const now = Date.now();
    const buckets = {
      current: { count: 0, amount: 0, invoices: [] },
      '1-30': { count: 0, amount: 0, invoices: [] },
      '31-60': { count: 0, amount: 0, invoices: [] },
      '61-90': { count: 0, amount: 0, invoices: [] },
      '90+': { count: 0, amount: 0, invoices: [] }
    };

    for (const inv of invoices) {
      const outstanding = inv.totalAmount - inv.paidAmount;
      if (outstanding <= 0) continue;

      const dueDate = new Date(new Date(inv.invoiceDate).getTime() + (inv.vendor?.creditDays || 30) * 86400000);
      const daysOverdue = Math.max(0, Math.floor((now - dueDate.getTime()) / 86400000));

      let bucket;
      if (daysOverdue === 0) bucket = 'current';
      else if (daysOverdue <= 30) bucket = '1-30';
      else if (daysOverdue <= 60) bucket = '31-60';
      else if (daysOverdue <= 90) bucket = '61-90';
      else bucket = '90+';

      buckets[bucket].count++;
      buckets[bucket].amount += outstanding;
      buckets[bucket].invoices.push({
        invoiceNumber: inv.invoiceNumber,
        vendorName: inv.vendor?.vendorName,
        outstanding,
        daysOverdue
      });
    }

    res.json(buckets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching aging report', error: error.message });
  }
};

// ─── PROFITABILITY REPORT ─────────────────────────────────────
export const getProfitabilityReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const tenantId = req.user.tenantId;

    // Get purchase costs
    const purchaseWhere = { tenantId };
    if (storeId && storeId !== 'undefined') purchaseWhere.storeId = storeId;
    if (startDate || endDate) {
      purchaseWhere.invoiceDate = {};
      if (startDate) purchaseWhere.invoiceDate.gte = new Date(startDate);
      if (endDate) purchaseWhere.invoiceDate.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const purchases = await prisma.purchaseInvoice.aggregate({
      where: purchaseWhere,
      _sum: { totalAmount: true }
    });

    // Get sales revenue
    const salesWhere = { tenantId, status: { in: ['PAID', 'COMPLETED'] } };
    if (storeId && storeId !== 'undefined') salesWhere.storeId = storeId;
    if (startDate || endDate) {
      salesWhere.createdAt = {};
      if (startDate) salesWhere.createdAt.gte = new Date(startDate);
      if (endDate) salesWhere.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const sales = await prisma.order.aggregate({
      where: salesWhere,
      _sum: { totalAmount: true }
    });

    const totalPurchases = purchases._sum.totalAmount || 0;
    const totalSales = sales._sum.totalAmount || 0;
    const grossProfit = totalSales - totalPurchases;
    const marginPercent = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(2) : 0;

    res.json({
      totalPurchases,
      totalSales,
      grossProfit,
      marginPercent: parseFloat(marginPercent)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profitability report', error: error.message });
  }
};

// ─── STOCK LEDGER (All Movements) ─────────────────────────────────────
export const getStockLedger = async (req, res) => {
  try {
    const { productId, type, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (storeId && storeId !== 'undefined') where.storeId = storeId;

    const ledger = await prisma.procurementStockLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        product: { select: { name: true } }
      }
    });

    res.json(ledger);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock ledger', error: error.message });
  }
};
