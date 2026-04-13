import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';

// ─── CREATE VENDOR ─────────────────────────────────────
export const createVendor = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { vendorName, mobile, email, address, gstNumber, contactPerson, creditDays, openingBalance } = req.body;

    if (!vendorName || !mobile) {
      return res.status(400).json({ message: 'Vendor name and mobile are required' });
    }

    // Check unique mobile within tenant
    const existing = await prisma.vendor.findFirst({ where: { tenantId, mobile } });
    if (existing) {
      return res.status(409).json({ message: 'A vendor with this mobile number already exists' });
    }

    const storeId = req.body.storeId || req.user.storeId || null;
    const openBal = parseFloat(openingBalance) || 0;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        storeId,
        vendorName,
        mobile,
        email: email || null,
        address: address || null,
        gstNumber: gstNumber || null,
        contactPerson: contactPerson || null,
        creditDays: parseInt(creditDays) || 30,
        openingBalance: openBal,
        currentBalance: openBal
      }
    });

    // If opening balance exists, create ledger entry
    if (openBal > 0) {
      await prisma.vendorLedger.create({
        data: {
          tenantId,
          storeId,
          vendorId: vendor.id,
          type: 'OPENING_BALANCE',
          debit: openBal,
          balance: openBal,
          description: 'Opening Balance'
        }
      });
    }

    res.status(201).json({ message: 'Vendor created successfully', vendor });
  } catch (error) {
    console.error('❌ Create Vendor Error:', error);
    res.status(500).json({ message: 'Error creating vendor', error: error.message });
  }
};

// ─── UPDATE VENDOR ─────────────────────────────────────
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorName, mobile, email, address, gstNumber, contactPerson, creditDays } = req.body;

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Check unique mobile if changed
    if (mobile && mobile !== vendor.mobile) {
      const existing = await prisma.vendor.findFirst({
        where: { tenantId: vendor.tenantId, mobile, id: { not: id } }
      });
      if (existing) {
        return res.status(409).json({ message: 'Another vendor with this mobile already exists' });
      }
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        vendorName: vendorName || undefined,
        mobile: mobile || undefined,
        email: email !== undefined ? email : undefined,
        address: address !== undefined ? address : undefined,
        gstNumber: gstNumber !== undefined ? gstNumber : undefined,
        contactPerson: contactPerson !== undefined ? contactPerson : undefined,
        creditDays: creditDays !== undefined ? parseInt(creditDays) : undefined
      }
    });

    res.json({ message: 'Vendor updated successfully', vendor: updated });
  } catch (error) {
    console.error('❌ Update Vendor Error:', error);
    res.status(500).json({ message: 'Error updating vendor', error: error.message });
  }
};

// ─── DEACTIVATE / REACTIVATE VENDOR ─────────────────────────────────────
export const toggleVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const newStatus = vendor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.vendor.update({
      where: { id },
      data: { status: newStatus }
    });

    res.json({ message: `Vendor ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`, vendor: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling vendor status', error: error.message });
  }
};

// ─── GET VENDORS ─────────────────────────────────────
export const getVendors = async (req, res) => {
  try {
    const { status, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (status) where.status = status;
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            purchaseInvoices: true,
            payments: true
          }
        }
      }
    });

    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendors', error: error.message });
  }
};

// ─── GET VENDOR LEDGER ─────────────────────────────────────
export const getVendorLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const ledger = await prisma.vendorLedger.findMany({
      where: { vendorId: id },
      orderBy: { date: 'desc' }
    });

    res.json({ vendor, ledger });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor ledger', error: error.message });
  }
};

// ─── VENDOR ITEM MAPPINGS ─────────────────────────────────────
export const getVendorMappings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const mappings = await prisma.vendorItemMapping.findMany({
      where: { vendorId },
      include: {
        product: {
          select: { id: true, name: true, price: true, purchasePrice: true, image: true, status: true }
        }
      }
    });
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor mappings', error: error.message });
  }
};

export const updateVendorMappings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { productIds } = req.body; // Array of product IDs to map
    const tenantId = req.user?.tenantId || getTenantId();
    const storeId = req.body.storeId || req.user.storeId || null;

    if (!Array.isArray(productIds)) {
      return res.status(400).json({ message: 'productIds must be an array' });
    }

    // Delete existing mappings
    await prisma.vendorItemMapping.deleteMany({ where: { vendorId } });

    // Create new mappings
    if (productIds.length > 0) {
      await prisma.vendorItemMapping.createMany({
        data: productIds.map(productId => ({
          tenantId,
          storeId,
          vendorId,
          productId
        }))
      });
    }

    const mappings = await prisma.vendorItemMapping.findMany({
      where: { vendorId },
      include: {
        product: { select: { id: true, name: true, price: true, purchasePrice: true } }
      }
    });

    res.json({ message: 'Vendor item mappings updated', mappings });
  } catch (error) {
    console.error('❌ Update Vendor Mappings Error:', error);
    res.status(500).json({ message: 'Error updating vendor mappings', error: error.message });
  }
};
