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

      // 1. Create the Invoice and Items
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
              price: parseFloat(item.price), // Line Total / Net Total for this item
              unitCostBeforeDiscount: parseFloat(item.unitCostBeforeDiscount) || 0,
              discountPercent: parseFloat(item.discountPercent) || 0,
              unitCostBeforeTax: parseFloat(item.unitCostBeforeTax) || 0,
              subtotalBeforeTax: parseFloat(item.subtotalBeforeTax) || 0,
              taxType: item.taxType || 'NONE',
              taxPercent: parseFloat(item.taxPercent) || 0,
              netCost: parseFloat(item.netCost) || 0,
              profitMargin: parseFloat(item.profitMargin) || 0,
              unitSellingPrice: parseFloat(item.unitSellingPrice) || 0,
              mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
              expDate: item.expDate ? new Date(item.expDate) : null,
              total: parseFloat(item.total) || (parseInt(item.quantity) * parseFloat(item.price))
            }))
          }
        }
      });

      // 2. High-Performance Bulk Stock Updates
      // Deduplicate items for stock processing
      const stockMap = new Map();
      for (const item of items) {
        const q = parseInt(item.quantity);
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

        // A. Bulk Update Product Master Stock and Latest Purchase Price
        const productValues = entries.map(([pId, qty]) => {
          // Find the latest price for this product in the invoice items
          const itemPrice = items.find(i => i.productId === pId)?.price || 0;
          return Prisma.sql`(${pId}, ${qty}::int, ${parseFloat(itemPrice)}::float)`;
        });

        await tx.$executeRaw`
          UPDATE "Product"
          SET 
            stock = "Product".stock + v.qty,
            "landingPrice" = v.l_price
          FROM (VALUES ${Prisma.join(productValues)}) AS v(id, qty, l_price)
          WHERE "Product".id = v.id
        `;

        // B. Bulk Upsert Warehouse Inventory
        const wiValues = entries.map(([pId, qty]) => {
          const tempId = `pwi_${Math.random().toString(36).substring(2, 11)}`;
          return Prisma.sql`(${tempId}, ${tenantId}, ${warehouse.id}, ${pId}, ${qty}::int)`;
        });

        await tx.$executeRaw`
          INSERT INTO "WarehouseInventory" (id, "tenantId", "warehouseId", "productId", quantity)
          VALUES ${Prisma.join(wiValues)}
          ON CONFLICT ("warehouseId", "productId")
          DO UPDATE SET quantity = "WarehouseInventory".quantity + EXCLUDED.quantity
        `;

        // C. Bulk Create Stock Ledger Entries
        // We fetch current balances after update for accurate ledger
        const currentWIs = await tx.warehouseInventory.findMany({
          where: { warehouseId: warehouse.id, productId: { in: entries.map(e => e[0]) } }
        });
        const currentWIMap = new Map(currentWIs.map(wi => [wi.productId, wi.quantity]));

        await tx.procurementStockLedger.createMany({
          data: entries.map(([pId, qty]) => ({
            tenantId,
            storeId,
            productId: pId,
            type: 'PURCHASE',
            quantity: qty,
            reference: inv.id,
            refType: 'INVOICE',
            balanceAfter: currentWIMap.get(pId) || qty
          }))
        });
      }

      // 3. Vendor Ledger and Balance
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

      await tx.vendor.update({
        where: { id: vendorId },
        data: { currentBalance: newBalance }
      });

      if (poId) {
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: { status: 'CLOSED' }
        });
      }

      return inv;
    }, {
      maxWait: 40000,
      timeout: 120000
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
        po: { select: { displayId: true } },
        items: {
          include: { product: { select: { name: true } } }
        },
        _count: { select: { paymentAllocations: true } }
      }
    });

    res.json(purchases);
  } catch (error) {
    console.error('FETCH PURCHASES ERROR:', error);
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
        po: { select: { displayId: true } },
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
    const { vendorId, poId, invoiceNumber, invoiceDate, transportCharges, otherCharges, remarks, items } = req.body;

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
        if (!warehouse) throw new Error('Warehouse not found for this tenant');

        // Calculate Net Stock Changes (Deltas)
        const netChanges = new Map();
        oldItems.forEach(i => {
          netChanges.set(i.productId, (netChanges.get(i.productId) || 0) - i.quantity);
        });
        items.forEach(i => {
          const qty = parseInt(i.quantity) || 0;
          netChanges.set(i.productId, (netChanges.get(i.productId) || 0) + qty);
        });

        const entries = Array.from(netChanges.entries()).filter(([_, qty]) => qty !== 0);
        if (entries.length > 0) {
          // A. Bulk Update Product Master Stock
          const productValues = entries.map(([pId, qty]) => Prisma.sql`(${pId}, ${qty}::int)`);
          await tx.$executeRaw`
            UPDATE "Product"
            SET stock = "Product".stock + v.qty
            FROM (VALUES ${Prisma.join(productValues)}) AS v(id, qty)
            WHERE "Product".id = v.id
          `;

          // B. Bulk Upsert Warehouse Inventory
          const wiValues = entries.map(([pId, qty]) => {
            const tempId = `pwi_upd_${Math.random().toString(36).substring(2, 11)}`;
            return Prisma.sql`(${tempId}, ${existing.tenantId}, ${warehouse.id}, ${pId}, ${qty}::int)`;
          });

          await tx.$executeRaw`
            INSERT INTO "WarehouseInventory" (id, "tenantId", "warehouseId", "productId", quantity)
            VALUES ${Prisma.join(wiValues)}
            ON CONFLICT ("warehouseId", "productId")
            DO UPDATE SET quantity = "WarehouseInventory".quantity + EXCLUDED.quantity
          `;

          // C. Record in Procurement Stock Ledger
          const currentWIs = await tx.warehouseInventory.findMany({
            where: { warehouseId: warehouse.id, productId: { in: entries.map(e => e[0]) } }
          });
          const currentWIMap = new Map(currentWIs.map(wi => [wi.productId, wi.quantity]));

          await tx.procurementStockLedger.createMany({
            data: entries.map(([pId, qty]) => ({
              tenantId: existing.tenantId,
              storeId: existing.storeId,
              productId: pId,
              type: 'ADJUSTMENT',
              quantity: qty,
              reference: id,
              refType: 'INVOICE_UPDATE',
              balanceAfter: currentWIMap.get(pId) || 0
            }))
          });
        }

        // Replace old items with new ones
        await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });
        await tx.purchaseInvoiceItem.createMany({
          data: items.map(item => ({
            tenantId: existing.tenantId,
            invoiceId: id,
            productId: item.productId,
            quantity: parseInt(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
            total: (parseInt(item.quantity) || 0) * (parseFloat(item.price) || 0)
          }))
        });
      }

      // 2. Update Invoice Metadata
      const inv = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          vendorId: vendorId || existing.vendorId,
          poId: poId !== undefined ? poId : existing.poId,
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

    const totalAmount = invoice.totalAmount;
    const vendorId = invoice.vendorId;

    await prisma.$transaction(async (tx) => {
      // 1. High-Performance Bulk Stock Reversal
      const items = invoice.items;
      if (items.length > 0) {
        const productValues = items.map(item => Prisma.sql`(${item.productId}, ${item.quantity}::int)`);
        
        // A. Bulk Decrement Product Master Stock
        await tx.$executeRaw`
          UPDATE "Product"
          SET stock = "Product".stock - v.qty
          FROM (VALUES ${Prisma.join(productValues)}) AS v(id, qty)
          WHERE "Product".id = v.id
        `;

        // B. Bulk Decrement Warehouse Inventory
        // First find the default warehouse
        let warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
        if (!warehouse) {
          warehouse = await tx.warehouse.create({
            data: { tenantId, name: 'Main Warehouse', location: 'Default' }
          });
        }

        await tx.$executeRaw`
          UPDATE "WarehouseInventory"
          SET quantity = "WarehouseInventory".quantity - v.qty
          FROM (VALUES ${Prisma.join(productValues)}) AS v(id, qty)
          WHERE "WarehouseInventory"."warehouseId" = ${warehouse.id} AND "WarehouseInventory"."productId" = v.id
        `;

        // C. Bulk Create Stock Ledger Entries (Adjustment for deletion)
        // Fetch current balances after update for accurate ledger
        const currentWIs = await tx.warehouseInventory.findMany({
          where: { warehouseId: warehouse.id, productId: { in: items.map(i => i.productId) } }
        });
        const currentWIMap = new Map(currentWIs.map(wi => [wi.productId, wi.quantity]));

        await tx.procurementStockLedger.createMany({
          data: items.map(item => ({
            tenantId,
            storeId: invoice.storeId,
            productId: item.productId,
            type: 'ADJUSTMENT',
            quantity: -item.quantity,
            reference: invoice.id,
            refType: 'INVOICE_DELETE',
            balanceAfter: currentWIMap.get(item.productId) || 0
          }))
        });
      }

      // 2. Revert Vendor Balance
      await tx.vendor.update({
        where: { id: vendorId },
        data: { currentBalance: { decrement: totalAmount } }
      });

      // 3. Delete Ledger Entry
      await tx.vendorLedger.deleteMany({
        where: { reference: id, type: 'PURCHASE' }
      });

      // 4. Delete Invoice Items
      await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });

      // 5. Delete Invoice
      await tx.purchaseInvoice.delete({ where: { id } });

      // 6. Cleanup Orphan Products (Safe Cleanup)
      // We only delete products that have NO other links anywhere in the system
      for (const item of items) {
        try {
          const productActivity = await tx.product.findUnique({
            where: { id: item.productId },
            include: {
              _count: {
                select: {
                  purchaseItems: true,
                  saleItems: true,
                  loadingItems: true,
                  returnItems: true,
                  damageEntries: true,
                  poItems: true,
                  grnItems: true,
                  auditItems: true,
                  variants: true,
                  refillItems: true,
                  vendorMappings: true
                }
              }
            }
          });

          if (productActivity && 
              productActivity._count.purchaseItems === 0 && 
              productActivity._count.saleItems === 0 &&
              productActivity._count.loadingItems === 0 &&
              productActivity._count.returnItems === 0 &&
              productActivity._count.damageEntries === 0 &&
              productActivity._count.poItems === 0 &&
              productActivity._count.grnItems === 0 &&
              productActivity._count.auditItems === 0 &&
              productActivity._count.variants === 0 &&
              productActivity._count.refillItems === 0 &&
              productActivity._count.vendorMappings === 0) {
            
            // Product is truly an orphan with zero history
            await tx.warehouseInventory.deleteMany({ where: { productId: item.productId } });
            await tx.vehicleStock.deleteMany({ where: { productId: item.productId } });
            await tx.procurementStockLedger.deleteMany({ where: { productId: item.productId } });
            await tx.stockTransaction.deleteMany({ where: { productId: item.productId } });
            await tx.cartItem.deleteMany({ where: { productId: item.productId } });
            
            await tx.product.delete({ where: { id: item.productId } });
          }
        } catch (err) {
          console.warn(`[Cleanup] Failed to cleanup potential orphan product ${item.productId}:`, err.message);
          // Don't throw, just skip this product cleanup to ensure invoice deletion finishes
        }
      }
    }, {
      maxWait: 30000,
      timeout: 90000
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
