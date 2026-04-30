import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

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

        // Update Product Master Stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: qty } }
        });

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

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: storeId || req.user.storeId,
      action: 'PURCHASE_INVOICE_CREATED',
      details: `Created Purchase Invoice #${invoiceNumber} for vendor ${vendor.vendorName}. Total: ₹${totalAmount.toFixed(2)}`,
      metadata: { invoiceId: invoice.id, vendorId, totalAmount }
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

// ─── UPDATE PURCHASE INVOICE ─────────────────────────────────────
export const updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceNumber, invoiceDate, transportCharges, otherCharges, remarks, items } = req.body;

    const existing = await prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Purchase invoice not found' });

    // Financial fields update
    const parsedDate = invoiceDate ? new Date(invoiceDate) : null;
    const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

    const newTransport = transportCharges !== undefined ? (parseFloat(transportCharges) || 0) : existing.transportCharges;
    const newOther = otherCharges !== undefined ? (parseFloat(otherCharges) || 0) : existing.otherCharges;
    
    // Recalculate totalAmount from items
    const itemsTotal = items ? items.reduce((sum, item) => sum + ((parseInt(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0) : 
                       (existing.totalAmount - existing.transportCharges - existing.otherCharges);
    const newTotal = itemsTotal + newTransport + newOther;
    const diff = newTotal - existing.totalAmount;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Handle Item Updates & Stock Adjustments
      if (items) {
        const oldItems = await tx.purchaseInvoiceItem.findMany({ where: { invoiceId: id } });
        const warehouse = await tx.warehouse.findFirst({ where: { tenantId: existing.tenantId } });

        // Calculate Net Stock Changes
        const netChanges = {};
        oldItems.forEach(i => { netChanges[i.productId] = (netChanges[i.productId] || 0) - i.quantity; });
        items.forEach(i => {
          const qty = parseInt(i.quantity) || 0;
          netChanges[i.productId] = (netChanges[i.productId] || 0) + qty;
        });

        // ─── ULTRA-FAST BULK STOCK UPDATES ────────────────────────────────
        const entries = Object.entries(netChanges).filter(([_, qty]) => qty !== 0);
        if (entries.length > 0 && warehouse) {
          // 1. Bulk Update Products Stock
          const productValues = entries.map(([pId, qty]) => Prisma.sql`(${pId}, ${qty}::int)`);
          await tx.$executeRaw`
            UPDATE "Product" AS p
            SET stock = p.stock + v.change
            FROM (VALUES ${Prisma.join(productValues)}) AS v(id, change)
            WHERE p.id = v.id
          `;

          // 2. Bulk Upsert Warehouse Inventory
          const invValues = entries.map(([pId, qty]) => {
            const tempId = 'cl' + Math.random().toString(36).substring(2, 11); 
            return Prisma.sql`(${tempId}, ${existing.tenantId}, ${warehouse.id}, ${pId}, ${qty}::int)`;
          });

          await tx.$executeRaw`
            INSERT INTO "WarehouseInventory" (id, "tenantId", "warehouseId", "productId", quantity)
            VALUES ${Prisma.join(invValues)}
            ON CONFLICT ("warehouseId", "productId")
            DO UPDATE SET quantity = "WarehouseInventory".quantity + EXCLUDED.quantity
          `;
        }

        // Replace old items with new ones
        await tx.purchaseInvoice.update({
          where: { id },
          data: {
            items: {
              deleteMany: {},
              create: items.map(item => ({
                tenantId: existing.tenantId,
                productId: item.productId,
                quantity: parseInt(item.quantity) || 0,
                price: parseFloat(item.price) || 0,
                total: (parseInt(item.quantity) || 0) * (parseFloat(item.price) || 0)
              }))
            }
          }
        });
      }

      // 2. Update Invoice Metadata
      const inv = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          invoiceNumber: invoiceNumber || existing.invoiceNumber,
          invoiceDate: isValidDate ? parsedDate : existing.invoiceDate,
          transportCharges: newTransport,
          otherCharges: newOther,
          totalAmount: newTotal
        }
      });

      // 3. Update Vendor Balance & Ledger if total changed
      if (diff !== 0) {
        await tx.vendor.update({
          where: { id: existing.vendorId },
          data: { currentBalance: { increment: diff } }
        });

        const ledgerEntries = await tx.vendorLedger.findMany({
          where: { reference: id, type: 'PURCHASE' }
        });
        
        for (const entry of ledgerEntries) {
          await tx.vendorLedger.update({
            where: { id: entry.id },
            data: { 
              debit: newTotal,
              balance: { increment: diff }
            }
          });
        }
      }

      return inv;
    }, {
      maxWait: 60000,
      timeout: 300000
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'PURCHASE_UPDATED',
      details: `Updated Purchase Invoice #${updated.invoiceNumber}. New Total: ₹${updated.totalAmount}`,
      metadata: { invoiceId: id, diff }
    });

    res.json({ message: 'Purchase invoice updated', invoice: updated });
  } catch (error) {
    import('fs').then(fs => fs.appendFileSync('error.log', '\nUPDATE ERROR: ' + error.stack + '\n'));
    console.error('❌ Update Purchase Critical Error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Invoice number already exists for this tenant' });
    }
    res.status(500).json({ message: 'Error updating purchase', error: error.message });
  }
};

// ─── DELETE PURCHASE INVOICE ─────────────────────────────────────
export const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { 
        items: true,
        _count: { select: { paymentAllocations: true } }
      }
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice._count.paymentAllocations > 0) {
      return res.status(400).json({ message: 'Cannot delete invoice with associated payments. Remove payments first.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Revert Stock
      for (const item of invoice.items) {
        const existingWI = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId }
        });
        if (existingWI) {
          await tx.warehouseInventory.update({
            where: { id: existingWI.id },
            data: { quantity: { decrement: item.quantity } }
          });
        }

        // Revert Product Master Stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
        
        // Add a reversal entry in ledger
        const currentWI = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId }
        });
        await tx.procurementStockLedger.create({
          data: {
            tenantId,
            storeId: invoice.storeId,
            productId: item.productId,
            type: 'ADJUSTMENT',
            quantity: -item.quantity,
            reference: invoice.id,
            refType: 'INVOICE_DELETE',
            balanceAfter: currentWI?.quantity || 0
          }
        });
      }

      // 2. Revert Vendor Balance
      const currentVendor = await tx.vendor.findUnique({ where: { id: invoice.vendorId } });
      const newBalance = (currentVendor?.currentBalance || 0) - invoice.totalAmount;

      await tx.vendor.update({
        where: { id: invoice.vendorId },
        data: { currentBalance: newBalance }
      });

      // 3. Delete Ledger Entry
      await tx.vendorLedger.deleteMany({
        where: { reference: invoice.id, type: 'PURCHASE' }
      });

      // 4. Delete Invoice Items
      await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });

      // 5. Delete Invoice
      await tx.purchaseInvoice.delete({ where: { id } });
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      action: 'PURCHASE_INVOICE_DELETED',
      details: `Deleted Purchase Invoice #${invoice.invoiceNumber}. Total: ₹${invoice.totalAmount}`,
      metadata: { invoiceId: id }
    });

    res.json({ message: 'Purchase invoice deleted successfully' });
  } catch (error) {
    console.error('❌ Delete Purchase Error:', error);
    res.status(500).json({ message: 'Error deleting purchase invoice', error: error.message });
  }
};
