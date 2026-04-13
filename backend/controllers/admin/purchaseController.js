import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';

// ─── CREATE PURCHASE INVOICE ─────────────────────────────────────
export const createPurchase = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { vendorId, poId, invoiceNumber, invoiceDate, items, transportCharges, otherCharges } = req.body;

    if (!vendorId || !invoiceNumber) {
      return res.status(400).json({ message: 'Vendor and invoice number are required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // Validate vendor is active
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor || vendor.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Vendor is inactive or not found' });
    }

    // Check for duplicate invoice
    const existingInvoice = await prisma.purchaseInvoice.findFirst({
      where: { tenantId, invoiceNumber }
    });
    if (existingInvoice) {
      return res.status(409).json({ message: 'Duplicate invoice number. An invoice with this number already exists.' });
    }

    const storeId = req.body.storeId || req.user.storeId || null;
    const transport = parseFloat(transportCharges) || 0;
    const other = parseFloat(otherCharges) || 0;
    const itemsTotal = items.reduce((sum, item) => sum + (parseInt(item.quantity) * parseFloat(item.price)), 0);
    const totalAmount = itemsTotal + transport + other;

    const invoice = await prisma.$transaction(async (tx) => {
      const displayId = await generateId({
        entity: 'PINV',
        tenantId,
        storeId
      });

      // Create purchase invoice
      const inv = await tx.purchaseInvoice.create({
        data: {
          tenantId,
          storeId,
          displayId,
          vendorId,
          poId: poId || null,
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          transportCharges: transport,
          otherCharges: other,
          totalAmount,
          status: 'CONFIRMED',
          items: {
            create: items.map(item => ({
              tenantId,
              productId: item.productId,
              quantity: parseInt(item.quantity),
              price: parseFloat(item.price),
              total: parseInt(item.quantity) * parseFloat(item.price)
            }))
          }
        },
        include: {
          items: { include: { product: { select: { name: true } } } }
        }
      });

      // Update warehouse inventory (Purchase → Stock Increase)
      for (const item of items) {
        const qty = parseInt(item.quantity);
        const existingWI = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId }
        });

        if (existingWI) {
          await tx.warehouseInventory.update({
            where: { id: existingWI.id },
            data: { quantity: { increment: qty } }
          });
        } else {
          let warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
          if (!warehouse) {
            warehouse = await tx.warehouse.create({
              data: { tenantId, name: 'Main Warehouse', location: 'Default' }
            });
          }
          await tx.warehouseInventory.create({
            data: { tenantId, warehouseId: warehouse.id, productId: item.productId, quantity: qty }
          });
        }

        // Procurement stock ledger entry
        const currentWI = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId }
        });
        await tx.procurementStockLedger.create({
          data: {
            tenantId,
            storeId,
            productId: item.productId,
            type: 'PURCHASE',
            quantity: qty,
            reference: inv.id,
            refType: 'INVOICE',
            balanceAfter: currentWI?.quantity || qty
          }
        });
      }

      // Vendor Ledger → Debit (Purchase)
      // Get current vendor balance
      const currentVendor = await tx.vendor.findUnique({ where: { id: vendorId } });
      const newBalance = (currentVendor?.currentBalance || 0) + totalAmount;

      await tx.vendorLedger.create({
        data: {
          tenantId,
          storeId,
          vendorId,
          type: 'PURCHASE',
          debit: totalAmount,
          balance: newBalance,
          reference: inv.id,
          description: `Purchase Invoice #${invoiceNumber}`
        }
      });

      // Update vendor current balance
      await tx.vendor.update({
        where: { id: vendorId },
        data: { currentBalance: newBalance }
      });

      // If from PO, update PO status
      if (poId) {
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: { status: 'CLOSED' }
        });
      }

      return inv;
    }, {
      maxWait: 20000,
      timeout: 60000
    });

    res.status(201).json({ message: 'Purchase invoice created successfully', invoice });
  } catch (error) {
    console.error('❌ Create Purchase Error:', error);
    res.status(500).json({ message: 'Error creating purchase invoice', error: error.message });
  }
};

// ─── GET PURCHASES ─────────────────────────────────────
export const getPurchases = async (req, res) => {
  try {
    const { vendorId, status, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const purchases = await prisma.purchaseInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { vendorName: true, mobile: true } },
        items: {
          include: { product: { select: { name: true } } }
        },
        _count: { select: { paymentAllocations: true } }
      }
    });

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchases', error: error.message });
  }
};

// ─── GET PURCHASE BY ID ─────────────────────────────────────
export const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        po: { select: { poNumber: true } },
        items: {
          include: { product: { select: { id: true, name: true, price: true, purchasePrice: true } } }
        },
        paymentAllocations: {
          include: { payment: true }
        }
      }
    });

    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase', error: error.message });
  }
};
