import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { sendNotification } from '../../services/notificationService.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';
import { format } from 'date-fns';

// ─── AGENT: Report Damage ─────────────────────────────────────
export const reportDamage = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const {
      productId,
      quantity,
      damageType,
      selfResponsibility,
      reason,
      vehicleId,
      geoLatitude,
      geoLongitude
    } = req.body;

    if (!productId || !quantity || !damageType || !reason) {
      return res.status(400).json({ message: 'Product, quantity, damage type, and reason are required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one photo is mandatory for damage report' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, purchasePrice: true, price: true, storeId: true }
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Optional: Log stock discrepancy but don't block reporting
    // Agents should be able to report damage even if digital stock is out of sync
    const resolvedVehicleId = vehicleId || req.user?.assignedVehicleId;

    // Upload images to Supabase
    const imageUrls = [];
    for (const file of req.files) {
      const url = await uploadToSupabase(
        file.buffer,
        file.originalname,
        file.mimetype,
        'damage-images',
        'damages'
      );
      if (url) imageUrls.push(url);
    }

    if (imageUrls.length === 0) {
      return res.status(400).json({ message: 'Failed to upload damage photos. Please try again.' });
    }

    const storeId = product.storeId || req.user?.storeId || null;
    const purchaseCost = product.purchasePrice || product.price || 0;
    const totalLoss = qty * purchaseCost;

    // Generate display ID
    const displayId = await generateId({
      entity: 'DMG',
      tenantId,
      storeId
    });

    const damageEntry = await prisma.damageEntry.create({
      data: {
        displayId,
        tenantId,
        storeId,
        vehicleId: resolvedVehicleId || null,
        reportedById: req.user.id,
        productId,
        quantity: qty,
        damageType,
        selfResponsibility: selfResponsibility || 'UNKNOWN',
        reason,
        images: imageUrls,
        geoLatitude: geoLatitude ? parseFloat(geoLatitude) : null,
        geoLongitude: geoLongitude ? parseFloat(geoLongitude) : null,
        purchaseCost,
        totalLoss
      },
      include: {
        product: { select: { name: true } },
        reportedBy: { select: { name: true } }
      }
    });

    // Send notification to admins
    sendNotification({
      roles: ['ADMIN', 'TENANT_OWNER'],
      title: '⚠️ New Damage Report',
      message: `${req.user.name} reported ${qty}x ${product.name} as ${damageType}. Loss: ₹${totalLoss.toFixed(2)}`,
      type: 'damage',
      priority: totalLoss > 1000 ? 'high' : 'medium',
      metadata: { damageEntryId: damageEntry.id, productId, vehicleId: resolvedVehicleId }
    });

    // Log activity
    logActivity({
      userId: req.user.id,
      tenantId,
      storeId,
      action: 'DAMAGE_REPORTED',
      details: `Reported ${qty}x ${product.name} as ${damageType}. Estimated loss: ₹${totalLoss.toFixed(2)}`,
      metadata: { damageEntryId: damageEntry.id, productId, damageType, quantity: qty }
    });

    res.status(201).json({
      message: 'Damage reported successfully. Pending admin approval.',
      damage: damageEntry
    });
  } catch (error) {
    console.error('❌ Report Damage Error:', error);
    res.status(500).json({ message: 'Error reporting damage', error: error.message });
  }
};

// ─── AGENT: Get My Damage Reports ─────────────────────────────────────
export const getMyDamageReports = async (req, res) => {
  try {
    const damages = await prisma.damageEntry.findMany({
      where: { reportedById: req.user.id },
      include: {
        product: { select: { name: true, image: true } },
        deduction: { select: { mode: true, deductionAmount: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(damages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching damage reports', error: error.message });
  }
};

// ─── ADMIN: Get All Damage Entries ─────────────────────────────────────
export const getDamageEntries = async (req, res) => {
  try {
    const { status, damageType, startDate, endDate, vehicleId, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    if (status) where.status = status;
    if (damageType) where.damageType = damageType;
    if (vehicleId) where.vehicleId = vehicleId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const damages = await prisma.damageEntry.findMany({
      where,
      include: {
        product: { select: { name: true, image: true, purchasePrice: true, price: true } },
        reportedBy: { select: { name: true, id: true } },
        reviewedBy: { select: { name: true } },
        vehicle: { select: { vehicleNumber: true, displayId: true } },
        store: { select: { name: true } },
        deduction: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(damages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching damage entries', error: error.message });
  }
};

// ─── ADMIN: Get Single Damage Entry ─────────────────────────────────────
export const getDamageEntryById = async (req, res) => {
  try {
    const damage = await prisma.damageEntry.findUnique({
      where: { id: req.params.id },
      include: {
        product: { select: { name: true, image: true, purchasePrice: true, price: true, purchasePrice: true } },
        reportedBy: { select: { name: true, id: true, email: true, baseSalary: true } },
        reviewedBy: { select: { name: true } },
        vehicle: { select: { vehicleNumber: true, displayId: true } },
        store: { select: { name: true } },
        deduction: {
          include: {
            appliedBy: { select: { name: true } }
          }
        }
      }
    });

    if (!damage) return res.status(404).json({ message: 'Damage entry not found' });
    res.json(damage);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching damage entry', error: error.message });
  }
};

// ─── ADMIN: Approve/Reject Damage ─────────────────────────────────────
export const reviewDamage = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminResponsibility, adminRemarks } = req.body;
    // action = APPROVED | REJECTED | UNDER_REVIEW

    const damage = await prisma.damageEntry.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, purchasePrice: true, price: true } },
        reportedBy: { select: { name: true, id: true } }
      }
    });

    if (!damage) return res.status(404).json({ message: 'Damage entry not found' });
    if (damage.status !== 'PENDING' && damage.status !== 'UNDER_REVIEW') {
      return res.status(400).json({ message: `Cannot review damage that is already ${damage.status}` });
    }

    const updateData = {
      status: action,
      adminResponsibility: adminResponsibility || null,
      reviewedById: req.user.id,
      reviewedAt: new Date(),
      adminRemarks: adminRemarks || null
    };

    // If APPROVED → adjust stock
    if (action === 'APPROVED') {
      updateData.stockAdjusted = true;

      // Deduct from vehicle stock if vehicleId is present
      if (damage.vehicleId) {
        const vehicleStock = await prisma.vehicleStock.findUnique({
          where: { vehicleId_productId: { vehicleId: damage.vehicleId, productId: damage.productId } }
        });

        if (vehicleStock) {
          await prisma.vehicleStock.update({
            where: { vehicleId_productId: { vehicleId: damage.vehicleId, productId: damage.productId } },
            data: { quantity: { decrement: damage.quantity } }
          });

          // Create stock transaction for audit trail
          await prisma.stockTransaction.create({
            data: {
              tenantId: damage.tenantId,
              storeId: damage.storeId,
              type: 'DAMAGE',
              vehicleId: damage.vehicleId,
              productId: damage.productId,
              quantity: damage.quantity
            }
          });
        }
      }

      // Create procurement stock ledger entry for loss tracking
      if (damage.storeId) {
        await prisma.procurementStockLedger.create({
          data: {
            tenantId: damage.tenantId,
            storeId: damage.storeId,
            productId: damage.productId,
            type: 'DAMAGE',
            quantity: -damage.quantity,
            reference: damage.id,
            refType: 'DAMAGE'
          }
        });
      }
    }

    const updated = await prisma.damageEntry.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { name: true } },
        reportedBy: { select: { name: true, id: true } }
      }
    });

    // Notify the reporter about status
    const statusMsg = action === 'APPROVED' ? 'approved' : action === 'REJECTED' ? 'rejected' : 'marked for review';
    sendNotification({
      userIds: [damage.reportedById],
      title: `Damage Report ${statusMsg.charAt(0).toUpperCase() + statusMsg.slice(1)}`,
      message: `Your damage report for ${damage.product.name} (${damage.quantity} units) has been ${statusMsg}.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
      type: 'damage',
      priority: 'medium',
      metadata: { damageEntryId: id, action }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: damage.storeId,
      action: `DAMAGE_${action}`,
      details: `${action} damage report ${damage.displayId || id} for ${damage.quantity}x ${damage.product.name}. Loss: ₹${damage.totalLoss?.toFixed(2) || 0}`,
      targetUserId: damage.reportedById,
      metadata: { damageEntryId: id, action, adminResponsibility }
    });

    res.json({ message: `Damage report ${statusMsg}`, damage: updated });
  } catch (error) {
    console.error('❌ Review Damage Error:', error);
    res.status(500).json({ message: 'Error reviewing damage', error: error.message });
  }
};

// ─── ADMIN: Apply Deduction ─────────────────────────────────────
export const applyDeduction = async (req, res) => {
  try {
    const { damageEntryId, userId, mode, percentage, remarks } = req.body;

    const damage = await prisma.damageEntry.findUnique({
      where: { id: damageEntryId },
      include: {
        product: { select: { name: true } },
        deduction: true
      }
    });

    if (!damage) return res.status(404).json({ message: 'Damage entry not found' });
    if (damage.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Damage must be approved before applying deduction' });
    }
    if (damage.deduction) {
      return res.status(400).json({ message: 'Deduction already exists for this damage entry' });
    }

    // Only allow deduction if admin marked VGE responsible
    const deductibleResponsibilities = ['VGE_RESPONSIBLE', 'NEGLIGENCE', 'INTENTIONAL', 'MIS_HANDLING'];
    if (!deductibleResponsibilities.includes(damage.adminResponsibility)) {
      return res.status(400).json({
        message: 'Deduction can only be applied when VGE is responsible (VGE_RESPONSIBLE, NEGLIGENCE, INTENTIONAL, or MIS_HANDLING)'
      });
    }

    const totalLoss = damage.totalLoss || 0;
    let deductionAmount = 0;
    const pct = parseFloat(percentage) || 100;

    switch (mode) {
      case 'FULL':
        deductionAmount = totalLoss;
        break;
      case 'PARTIAL':
        deductionAmount = (totalLoss * pct) / 100;
        break;
      case 'WAIVED':
        deductionAmount = 0;
        break;
      default:
        deductionAmount = totalLoss;
    }

    // Cap deduction at product value
    deductionAmount = Math.min(deductionAmount, totalLoss);

    const month = format(new Date(), 'yyyy-MM');

    const deduction = await prisma.damageDeduction.create({
      data: {
        tenantId: req.user.tenantId,
        storeId: damage.storeId,
        damageEntryId,
        userId: userId || damage.reportedById,
        mode,
        percentage: mode === 'PARTIAL' ? pct : (mode === 'FULL' ? 100 : 0),
        deductionAmount,
        month,
        status: 'PENDING',
        appliedById: req.user.id,
        appliedAt: new Date(),
        remarks
      }
    });

    // Notify the VGE about deduction
    if (deductionAmount > 0) {
      sendNotification({
        userIds: [userId || damage.reportedById],
        title: '💰 Salary Deduction Applied',
        message: `₹${deductionAmount.toFixed(2)} deducted for damaged stock (${damage.product.name}). Mode: ${mode}${mode === 'PARTIAL' ? ` (${pct}%)` : ''}.`,
        type: 'damage',
        priority: 'high',
        metadata: { deductionId: deduction.id, damageEntryId, amount: deductionAmount }
      });
    }

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: damage.storeId,
      action: 'DEDUCTION_APPLIED',
      details: `Applied ${mode} deduction of ₹${deductionAmount.toFixed(2)} for damage ${damage.displayId || damageEntryId}`,
      targetUserId: userId || damage.reportedById,
      metadata: { deductionId: deduction.id, damageEntryId, mode, amount: deductionAmount }
    });

    res.status(201).json({ message: 'Deduction applied successfully', deduction });
  } catch (error) {
    console.error('❌ Apply Deduction Error:', error);
    res.status(500).json({ message: 'Error applying deduction', error: error.message });
  }
};

// ─── ADMIN: Update Deduction Status ─────────────────────────────────────
export const updateDeductionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // APPLIED, DISPUTED, CANCELLED

    const deduction = await prisma.damageDeduction.update({
      where: { id },
      data: { status }
    });

    res.json({ message: `Deduction status updated to ${status}`, deduction });
  } catch (error) {
    res.status(500).json({ message: 'Error updating deduction', error: error.message });
  }
};

// ─── ADMIN: Get Deductions for Payroll ─────────────────────────────────────
export const getDeductions = async (req, res) => {
  try {
    const { month, userId, status, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    if (month) where.month = month;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const deductions = await prisma.damageDeduction.findMany({
      where,
      include: {
        damageEntry: {
          include: {
            product: { select: { name: true, image: true } }
          }
        },
        user: { select: { name: true, baseSalary: true, email: true } },
        appliedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(deductions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching deductions', error: error.message });
  }
};

// ─── ADMIN: Damage Reports/Analytics ─────────────────────────────────────
export const getDamageReports = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // 1. Summary stats
    const [total, approved, pending, rejected] = await Promise.all([
      prisma.damageEntry.count({ where }),
      prisma.damageEntry.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.damageEntry.count({ where: { ...where, status: 'PENDING' } }),
      prisma.damageEntry.count({ where: { ...where, status: 'REJECTED' } })
    ]);

    // 2. Total loss
    const approvedEntries = await prisma.damageEntry.findMany({
      where: { ...where, status: 'APPROVED' },
      select: { totalLoss: true }
    });
    const totalLoss = approvedEntries.reduce((sum, e) => sum + (e.totalLoss || 0), 0);

    // 3. Loss by damage type
    const allEntries = await prisma.damageEntry.findMany({
      where: { ...where, status: 'APPROVED' },
      select: { damageType: true, totalLoss: true, quantity: true }
    });
    const lossByType = {};
    allEntries.forEach(entry => {
      if (!lossByType[entry.damageType]) lossByType[entry.damageType] = { count: 0, loss: 0 };
      lossByType[entry.damageType].count += 1;
      lossByType[entry.damageType].loss += (entry.totalLoss || 0);
    });

    // 4. Top damaged products
    const topProducts = await prisma.damageEntry.findMany({
      where: { ...where, status: 'APPROVED' },
      select: { productId: true, quantity: true, totalLoss: true, product: { select: { name: true } } }
    });
    const productMap = {};
    topProducts.forEach(e => {
      if (!productMap[e.productId]) productMap[e.productId] = { name: e.product.name, qty: 0, loss: 0 };
      productMap[e.productId].qty += e.quantity;
      productMap[e.productId].loss += (e.totalLoss || 0);
    });
    const topProductList = Object.values(productMap).sort((a, b) => b.loss - a.loss).slice(0, 10);

    // 5. VGE accountability
    const damageByUser = await prisma.damageEntry.findMany({
      where,
      select: { reportedById: true, quantity: true, totalLoss: true, status: true, reportedBy: { select: { name: true } } }
    });
    const userMap = {};
    damageByUser.forEach(e => {
      if (!userMap[e.reportedById]) userMap[e.reportedById] = { name: e.reportedBy.name, totalDamage: 0, totalLoss: 0, count: 0 };
      userMap[e.reportedById].count += 1;
      userMap[e.reportedById].totalDamage += e.quantity;
      userMap[e.reportedById].totalLoss += (e.totalLoss || 0);
    });
    const vgeReport = Object.entries(userMap).map(([id, data]) => ({ userId: id, ...data })).sort((a, b) => b.totalLoss - a.totalLoss);

    // 6. Deduction totals
    const deductionWhere = { tenantId: req.user.tenantId };
    if (where.storeId) deductionWhere.storeId = where.storeId;
    const deductions = await prisma.damageDeduction.findMany({
      where: deductionWhere,
      select: { deductionAmount: true, status: true }
    });
    const totalDeductions = deductions.reduce((sum, d) => sum + (d.deductionAmount || 0), 0);
    const appliedDeductions = deductions.filter(d => d.status === 'APPLIED' || d.status === 'PENDING').reduce((sum, d) => sum + (d.deductionAmount || 0), 0);

    // 7. Payroll deduction report (per user)
    const payrollDeductions = await prisma.damageDeduction.findMany({
      where: deductionWhere,
      include: {
        user: { select: { name: true, baseSalary: true } }
      }
    });
    const payrollMap = {};
    payrollDeductions.forEach(d => {
      if (!payrollMap[d.userId]) payrollMap[d.userId] = { name: d.user.name, baseSalary: d.user.baseSalary || 0, totalDeduction: 0 };
      payrollMap[d.userId].totalDeduction += (d.deductionAmount || 0);
    });
    const payrollReport = Object.entries(payrollMap).map(([id, data]) => ({
      userId: id,
      ...data,
      netSalary: data.baseSalary - data.totalDeduction
    }));

    res.json({
      summary: { total, approved, pending, rejected, totalLoss, totalDeductions, appliedDeductions },
      lossByType,
      topProducts: topProductList,
      vgeReport,
      payrollReport
    });
  } catch (error) {
    console.error('❌ Damage Reports Error:', error);
    res.status(500).json({ message: 'Error generating damage reports', error: error.message });
  }
};
