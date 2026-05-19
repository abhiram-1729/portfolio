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
        ...(storeId && storeId !== 'undefined' ? { storeId: storeId } : {})
      },
      include: {
        category: { select: { name: true } },
        unit: { select: { name: true, type: true } },
        WarehouseInventory: {
          select: { quantity: true, warehouse: { select: { name: true } } }
        },
        vehicleStocks: {
          select: { quantity: true }
        }
      }
    });

    // 2. Map products to a WarehouseInventory-like structure for frontend compatibility
    const report = products
      .map(p => {
        const warehouseQty = p.WarehouseInventory.reduce((acc, curr) => acc + curr.quantity, 0);
        const vehicleQty = p.vehicleStocks.reduce((acc, curr) => acc + curr.quantity, 0);
        
        // If it has warehouse records, use that quantity. 
        // If not, but it has main product stock, show that as being in the system.
        const finalQty = warehouseQty > 0 ? warehouseQty : (p.stock || 0);

        return {
          id: p.WarehouseInventory[0]?.id || `virtual-${p.id}`,
          productId: p.id,
          quantity: finalQty, // This is Store Stock
          warehouseStock: finalQty,
          vehicleStock: vehicleQty,
          totalStock: finalQty + vehicleQty,
          storeId: p.storeId,
          tenantId: p.tenantId,
          product: {
            ...p,
            warehouseStock: finalQty,
            vehicleStock: vehicleQty,
            totalStock: finalQty + vehicleQty
          },
          warehouse: p.WarehouseInventory[0]?.warehouse || { name: 'Main Store' }
        };
      });

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

    // Get total purchases for summary
    const purchases = await prisma.purchaseInvoice.aggregate({
      where: purchaseWhere,
      _sum: { totalAmount: true }
    });

    // Get sales and calculate COGS (Cost of Goods Sold)
    const salesWhere = { tenantId, status: { in: ['PAID', 'COMPLETED'] } };
    if (storeId && storeId !== 'undefined') salesWhere.storeId = storeId;
    if (startDate || endDate) {
      salesWhere.createdAt = {};
      if (startDate) salesWhere.createdAt.gte = new Date(startDate);
      if (endDate) salesWhere.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const orders = await prisma.order.findMany({
      where: salesWhere,
      include: {
        items: {
          include: {
            product: { select: { landingPrice: true, purchasePrice: true } }
          }
        }
      }
    });

    let totalSales = 0;
    let totalCOGS = 0;

    orders.forEach(order => {
      totalSales += order.totalAmount || 0;
      order.items.forEach(item => {
        const cost = item.landingPrice || item.product?.landingPrice || item.product?.purchasePrice || 0;
        totalCOGS += (item.quantity * cost);
      });
    });

    const totalPurchases = purchases._sum.totalAmount || 0;
    const grossProfit = totalSales - totalCOGS;
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
    const { productId, type, storeId, groupBy, vendorId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (storeId && storeId !== 'undefined') where.storeId = storeId;

    if (groupBy === 'vendor') {
      const vendors = await prisma.vendor.findMany({
        where: {
          tenantId: req.user.tenantId,
          ...(storeId && storeId !== 'undefined' ? { storeId } : {})
        },
        include: {
          itemMappings: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  stock: true,
                  purchasePrice: true,
                  price: true,
                  category: { select: { name: true } },
                  skuCode: true
                }
              }
            }
          },
          purchaseInvoices: {
            where: { status: 'CONFIRMED' },
            orderBy: { invoiceDate: 'desc' },
            take: 1,
            select: { invoiceDate: true }
          }
        }
      });

      const summary = vendors.map(v => {
        let totalStockQty = 0;
        let inventoryValue = 0;

        v.itemMappings.forEach(m => {
          if (m.product) {
            const qty = m.product.stock || 0;
            const rate = m.lastPurchaseRate > 0 ? m.lastPurchaseRate : (m.purchasePrice > 0 ? m.purchasePrice : (m.product.purchasePrice || m.product.price || 0));
            totalStockQty += qty;
            inventoryValue += qty * rate;
          }
        });

        return {
          id: v.id,
          vendorName: v.vendorName,
          mobile: v.mobile,
          gstNumber: v.gstNumber,
          status: v.status,
          totalStockQty,
          inventoryValue,
          lastPurchase: v.purchaseInvoices[0]?.invoiceDate || null
        };
      });

      return res.json(summary);
    }

    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          itemMappings: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  stock: true,
                  purchasePrice: true,
                  price: true,
                  skuCode: true,
                  category: { select: { name: true } },
                  unit: { select: { name: true } }
                }
              }
            }
          }
        }
      });

      if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

      const productIds = vendor.itemMappings.map(m => m.productId);
      const movements = await prisma.procurementStockLedger.findMany({
        where: {
          productId: { in: productIds },
          tenantId: req.user.tenantId,
          ...(storeId && storeId !== 'undefined' ? { storeId } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              skuCode: true,
              purchasePrice: true,
              price: true,
              category: { select: { name: true } },
              unit: { select: { name: true } }
            }
          }
        }
      });

      // Find GoodsReceiptItems for the products to get their expiryStatus
      const grnItems = productIds.length > 0 ? await prisma.goodsReceiptItem.findMany({
        where: {
          productId: { in: productIds },
          grn: {
            tenantId: req.user.tenantId
          }
        },
        select: {
          productId: true,
          grnId: true,
          expiryStatus: true
        }
      }) : [];

      const expiryMap = {};
      grnItems.forEach(item => {
        expiryMap[`${item.productId}_${item.grnId}`] = item.expiryStatus;
      });

      const enrichedMovements = movements.map(m => {
        const prod = m.product;
        const rate = prod ? (prod.purchasePrice || prod.price || 0) : 0;
        let expiry = 'Safe';
        if (m.refType === 'GRN' && m.reference) {
          expiry = expiryMap[`${m.productId}_${m.reference}`] || 'Safe';
        }
        return {
          ...m,
          vendorName: vendor.vendorName,
          skuCode: prod?.skuCode || '—',
          category: prod?.category?.name || 'UNCATEGORIZED',
          unit: prod?.unit?.name || 'UNITS',
          inventoryValue: m.balanceAfter * rate,
          expiryStatus: expiry || 'Safe'
        };
      });

      const products = vendor.itemMappings.map(m => {
        const prod = m.product;
        if (!prod) return null;
        const rate = m.lastPurchaseRate > 0 ? m.lastPurchaseRate : (m.purchasePrice > 0 ? m.purchasePrice : (prod.purchasePrice || prod.price || 0));
        return {
          id: prod.id,
          name: prod.name,
          skuCode: prod.skuCode,
          category: prod.category?.name || 'UNCATEGORIZED',
          unit: prod.unit?.name || 'UNITS',
          stock: prod.stock || 0,
          purchasePrice: rate,
          totalValue: (prod.stock || 0) * rate
        };
      }).filter(Boolean);

      return res.json({
        vendor: {
          id: vendor.id,
          vendorName: vendor.vendorName,
          mobile: vendor.mobile,
          gstNumber: vendor.gstNumber,
          address: vendor.address,
          status: vendor.status
        },
        products,
        movements: enrichedMovements
      });
    }

    const ledger = await prisma.procurementStockLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        product: { select: { name: true } }
      }
    });

    const grnIds = [...new Set(ledger.filter(item => item.refType === 'GRN' && item.reference).map(item => item.reference))];
    const invoiceIds = [...new Set(ledger.filter(item => item.refType && item.refType.startsWith('INVOICE') && item.reference).map(item => item.reference))];

    const grns = grnIds.length > 0 ? await prisma.goodsReceipt.findMany({
      where: { id: { in: grnIds } },
      select: {
        id: true,
        po: {
          select: {
            vendor: {
              select: { vendorName: true }
            }
          }
        }
      }
    }) : [];

    const invoices = invoiceIds.length > 0 ? await prisma.purchaseInvoice.findMany({
      where: { id: { in: invoiceIds } },
      select: {
        id: true,
        vendor: {
          select: { vendorName: true }
        }
      }
    }) : [];

    const vendorMap = {};
    grns.forEach(grn => {
      if (grn.po?.vendor?.vendorName) {
        vendorMap[grn.id] = grn.po.vendor.vendorName;
      }
    });
    invoices.forEach(inv => {
      if (inv.vendor?.vendorName) {
        vendorMap[inv.id] = inv.vendor.vendorName;
      }
    });

    const enrichedLedger = ledger.map(entry => {
      return {
        ...entry,
        vendorName: entry.reference ? (vendorMap[entry.reference] || '—') : '—'
      };
    });

    res.json(enrichedLedger);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock ledger', error: error.message });
  }
};
