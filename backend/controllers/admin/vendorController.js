import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';

// ─── CREATE VENDOR ─────────────────────────────────────
export const createVendor = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { 
      vendorName, mobile, email, address, gstNumber, contactPerson, creditDays, openingBalance,
      paymentTerms, creditLimit, bankName, accountNumber, ifscCode, bankBranch, vendorCategory, minOrderQty, isTaxable
    } = req.body;

    if (!vendorName || !mobile) {
      return res.status(400).json({ message: 'Vendor name and mobile are required' });
    }

    // Check unique mobile within tenant
    const existing = await prisma.vendor.findFirst({ where: { tenantId, mobile } });
    if (existing) {
      return res.status(409).json({ message: 'A vendor with this mobile number already exists' });
    }

    // TAXABLE VENDORS VALIDATION: GST is mandatory for taxable vendors
    const isTax = isTaxable === true || isTaxable === 'true';
    if (isTax && (!gstNumber || !gstNumber.trim())) {
      return res.status(400).json({ message: 'GST Identification Number is mandatory for taxable vendors' });
    }

    // DUPLICATE GST VALIDATION: Check unique GST Number within tenant
    if (gstNumber && gstNumber.trim()) {
      const existingGst = await prisma.vendor.findFirst({
        where: { tenantId, gstNumber: gstNumber.trim() }
      });
      if (existingGst) {
        return res.status(409).json({ message: 'A vendor with this GST Identification Number already exists' });
      }
    }

    const storeId = req.body.storeId || req.user.storeId || null;
    const openBal = parseFloat(openingBalance) || 0;

    const displayId = await generateId({
      entity: 'VND',
      tenantId,
      storeId
    });

    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        storeId,
        displayId,
        vendorName,
        mobile,
        email: email || null,
        address: address || null,
        gstNumber: gstNumber || null,
        contactPerson: contactPerson || null,
        creditDays: parseInt(creditDays) || 30,
        openingBalance: openBal,
        currentBalance: openBal,
        paymentTerms: paymentTerms || null,
        creditLimit: parseFloat(creditLimit) || 0,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        bankBranch: bankBranch || null,
        vendorCategory: vendorCategory || null,
        minOrderQty: parseInt(minOrderQty) || 1,
        isTaxable: isTax,
        approvalStatus: 'PENDING'
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
    const { 
      vendorName, mobile, email, address, gstNumber, contactPerson, creditDays,
      paymentTerms, creditLimit, bankName, accountNumber, ifscCode, bankBranch, vendorCategory, minOrderQty, isTaxable
    } = req.body;

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

    // TAXABLE VENDORS VALIDATION: GST is mandatory for taxable vendors
    const isTax = isTaxable !== undefined ? (isTaxable === true || isTaxable === 'true') : vendor.isTaxable;
    const targetGst = gstNumber !== undefined ? gstNumber : vendor.gstNumber;
    if (isTax && (!targetGst || !targetGst.trim())) {
      return res.status(400).json({ message: 'GST Identification Number is mandatory for taxable vendors' });
    }

    // DUPLICATE GST VALIDATION: Check unique GST Number within tenant
    if (gstNumber && gstNumber !== vendor.gstNumber) {
      const existingGst = await prisma.vendor.findFirst({
        where: { tenantId: vendor.tenantId, gstNumber: gstNumber.trim(), id: { not: id } }
      });
      if (existingGst) {
        return res.status(409).json({ message: 'Another vendor with this GST Identification Number already exists' });
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
        creditDays: creditDays !== undefined ? parseInt(creditDays) : undefined,
        paymentTerms: paymentTerms !== undefined ? paymentTerms : undefined,
        creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined,
        bankName: bankName !== undefined ? bankName : undefined,
        accountNumber: accountNumber !== undefined ? accountNumber : undefined,
        ifscCode: ifscCode !== undefined ? ifscCode : undefined,
        bankBranch: bankBranch !== undefined ? bankBranch : undefined,
        vendorCategory: vendorCategory !== undefined ? vendorCategory : undefined,
        minOrderQty: minOrderQty !== undefined ? parseInt(minOrderQty) : undefined,
        isTaxable: isTaxable !== undefined ? isTax : undefined
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
    } else if (req.user.storeId) {
      const isGlobal = 
        ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
        req.user.customRole?.portalType === 'ADMIN';
        
      if (!isGlobal) {
        where.storeId = req.user.storeId;
      }
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
        },
        priceHistory: {
          orderBy: { changedAt: 'desc' }
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
    const { mappings: incomingMappings } = req.body; // Array of detailed mapping objects
    const tenantId = req.user?.tenantId || getTenantId();
    const storeId = req.body.storeId || req.user.storeId || null;

    if (!Array.isArray(incomingMappings)) {
      return res.status(400).json({ message: 'mappings must be an array' });
    }

    // Execute all mapping, history, and preferred vendor resets in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Get all current mappings for this vendor
      const currentMappings = await tx.vendorItemMapping.findMany({
        where: { vendorId }
      });

      const incomingProductIds = incomingMappings.map(m => m.productId);

      // 2. Identify mappings to delete (not in incoming array)
      const toDelete = currentMappings.filter(
        (cm) => !incomingProductIds.includes(cm.productId)
      );

      if (toDelete.length > 0) {
        await tx.vendorItemMapping.deleteMany({
          where: {
            id: { in: toDelete.map((d) => d.id) }
          }
        });
      }

      // 3. Process each incoming mapping (create or update)
      for (const map of incomingMappings) {
        const existing = currentMappings.find((cm) => cm.productId === map.productId);
        const purchasePrice = parseFloat(map.purchasePrice) || 0;
        const moq = parseInt(map.moq) || 1;
        const leadTime = parseInt(map.leadTime) || 0;
        const taxPercent = parseFloat(map.taxPercent) || 0;
        const isPreferred = !!map.isPreferred;

        let mappingRecord;

        if (existing) {
          // Check if price changed to record history
          if (existing.purchasePrice !== purchasePrice) {
            await tx.vendorPriceHistory.create({
              data: {
                tenantId,
                mappingId: existing.id,
                oldPrice: existing.purchasePrice,
                newPrice: purchasePrice
              }
            });
          }

          mappingRecord = await tx.vendorItemMapping.update({
            where: { id: existing.id },
            data: {
              vendorSku: map.vendorSku || null,
              purchasePrice,
              moq,
              leadTime,
              taxPercent,
              isPreferred
            }
          });
        } else {
          // Create new mapping
          mappingRecord = await tx.vendorItemMapping.create({
            data: {
              tenantId,
              storeId,
              vendorId,
              productId: map.productId,
              vendorSku: map.vendorSku || null,
              purchasePrice,
              moq,
              leadTime,
              taxPercent,
              isPreferred
            }
          });

          // Insert initial price history
          await tx.vendorPriceHistory.create({
            data: {
              tenantId,
              mappingId: mappingRecord.id,
              oldPrice: 0,
              newPrice: purchasePrice
            }
          });
        }

        // CONTROL: Enforce "One preferred vendor per item"
        if (isPreferred) {
          await tx.vendorItemMapping.updateMany({
            where: {
              productId: map.productId,
              vendorId: { not: vendorId },
              tenantId
            },
            data: { isPreferred: false }
          });
        }
      }
    });

    // Return the updated mappings list
    const mappings = await prisma.vendorItemMapping.findMany({
      where: { vendorId },
      include: {
        product: { select: { id: true, name: true, price: true, purchasePrice: true } },
        priceHistory: { orderBy: { changedAt: 'desc' } }
      }
    });

    res.json({ message: 'Vendor item mappings updated successfully', mappings });
  } catch (error) {
    console.error('❌ Update Vendor Mappings Error:', error);
    res.status(500).json({ message: 'Error updating vendor mappings', error: error.message });
  }
};
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
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

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Check for transaction history
    if (vendor._count.purchaseOrders > 0 || vendor._count.purchaseInvoices > 0 || vendor._count.payments > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete vendor with transaction history. Please deactivate them instead.' 
      });
    }

    await prisma.$transaction([
      prisma.vendorItemMapping.deleteMany({ where: { vendorId: id } }),
      prisma.vendorLedger.deleteMany({ where: { vendorId: id } }),
      prisma.vendor.delete({ where: { id } })
    ]);

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('❌ Delete Vendor Error:', error);
    res.status(500).json({ message: 'Error deleting vendor', error: error.message });
  }
};

// ─── ADMIN VENDOR APPROVAL WORKFLOW ─────────────────────────────────────
export const updateVendorApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid approval status value' });
    }

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const updated = await prisma.vendor.update({
      where: { id },
      data: { approvalStatus }
    });

    res.json({ message: `Vendor approval status set to ${approvalStatus} successfully`, vendor: updated });
  } catch (error) {
    console.error('❌ Update Vendor Approval Status Error:', error);
    res.status(500).json({ message: 'Error updating vendor approval status', error: error.message });
  }
};
