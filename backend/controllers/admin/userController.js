import prisma from '../../utils/prisma.js';
import bcrypt from 'bcryptjs';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

// Get all users
export const getUsers = async (req, res) => {
  try {
    const { storeId, role, roleId } = req.query;
    const filter = { tenantId: req.user.tenantId };
    
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      filter.storeId = storeId;
    } else if (req.user.storeId && !['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      filter.storeId = req.user.storeId;
    }

    if (role) {
      filter.role = role;
    }

    // Filter by custom role assignment (used by Role Privileges → Assigned Users tab)
    if (roleId && roleId !== 'undefined' && roleId !== 'null') {
      filter.customRoleId = roleId;
    }

    const users = await prisma.user.findMany({
      where: filter,
      include: { 
        assignedVehicle: true, 
        store: true,
        customRole: true,
        documents: true,
        shift: true,
        routeAssignments: {
          where: { status: true },
          include: { route: true }
        }
      }
    });
    res.json(users);
  } catch (error) {
    console.error('[AdminUsers] Fetch error:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Create a new user (Agent/helper/supervisor)
export const createUser = async (req, res) => {
  try {
    const { 
      name, email, password, mobile, role, 
      assignedVehicleId: rawVehicleId, 
      storeId: rawStoreId, 
      dailyTarget, vgeType, baseSalary, 
      customRoleId: rawRoleId, 
      attendanceEnabled,
      shiftId,
      kycStatus
    } = req.body;
    
    const storeId = (rawStoreId && rawStoreId !== 'null' && rawStoreId !== 'undefined' && rawStoreId !== '') ? rawStoreId : null;
    const assignedVehicleId = (rawVehicleId && rawVehicleId !== 'null' && rawVehicleId !== 'undefined' && rawVehicleId !== '') ? rawVehicleId : null;
    const customRoleId = (rawRoleId && rawRoleId !== 'null' && rawRoleId !== 'undefined' && rawRoleId !== '') ? rawRoleId : null;

    const userExists = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { mobile }]
      }
    });

    if (userExists) {
      return res.status(400).json({ message: 'User with email/mobile already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const resolvedStoreId = storeId || req.user.storeId || null;
    const displayId = await generateId({
      entity: 'EMP',
      tenantId: req.user.tenantId,
      storeId: resolvedStoreId
    });

    const dailyTargetVal = dailyTarget ? parseFloat(dailyTarget) : undefined;
    const baseSalaryVal = baseSalary ? parseFloat(baseSalary) : undefined;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        mobile,
        password: hashedPassword,
        role: role || 'SALES_AGENT',
        vgeType: vgeType || 'EMPLOYEE',
        tenantId: req.user.tenantId,
        displayId,
        assignedVehicle: assignedVehicleId ? { connect: { id: assignedVehicleId } } : undefined,
        store: storeId ? { connect: { id: storeId } } : undefined,
        dailyTarget: !isNaN(dailyTargetVal) ? dailyTargetVal : undefined,
        baseSalary: !isNaN(baseSalaryVal) ? baseSalaryVal : undefined,
        attendanceEnabled: attendanceEnabled !== undefined ? Boolean(attendanceEnabled) : true,
        customRole: customRoleId ? { connect: { id: customRoleId } } : undefined,
        shiftId: shiftId || undefined,
        kycStatus: kycStatus || 'PENDING'
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: storeId || req.user.storeId,
      action: 'USER_CREATED',
      details: `Created new user: ${user.name} (${user.role})`,
      targetUserId: user.id,
      metadata: { role: user.role }
    });

    res.status(201).json({ message: 'User created', user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    console.error('[AdminUsers] Create error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// Update user details
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, mobile, role, assignedVehicleId, storeId, status, 
      dailyTarget, vgeType, password, baseSalary, customRoleId, 
      attendanceEnabled, shiftId, kycStatus 
    } = req.body;

    const updateData = {
      name,
      email,
      mobile,
      role,
      status,
      vgeType,
      assignedVehicleId: assignedVehicleId === null ? null : (assignedVehicleId || undefined),
      storeId: storeId === null ? null : (storeId || undefined),
      dailyTarget: (dailyTarget !== undefined && dailyTarget !== '') ? parseFloat(dailyTarget) : (dailyTarget === '' ? null : undefined),
      baseSalary: (baseSalary !== undefined && baseSalary !== '') ? parseFloat(baseSalary) : (baseSalary === '' ? null : undefined),
      customRoleId: customRoleId === null ? null : (customRoleId || undefined),
      attendanceEnabled: attendanceEnabled !== undefined ? Boolean(attendanceEnabled) : undefined,
      shiftId: shiftId === null ? null : (shiftId || undefined),
      kycStatus: kycStatus || undefined
    };

    // Clean up NaN values just in case
    if (isNaN(updateData.dailyTarget)) delete updateData.dailyTarget;
    if (isNaN(updateData.baseSalary)) delete updateData.baseSalary;

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updateResult = await prisma.user.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: updateData
    });

    if (updateResult.count === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = await prisma.user.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });

    res.json({ message: 'User updated', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// Documents Management
import { uploadToSupabase } from '../../utils/supabaseService.js';

export const uploadUserDocument = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, documentNumber } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = await uploadToSupabase(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'users',
      'kyc'
    );

    if (!fileUrl) {
      return res.status(500).json({ message: 'Failed to upload to cloud storage' });
    }

    const document = await prisma.userDocument.create({
      data: {
        userId,
        type,
        documentNumber,
        fileUrl,
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'Document uploaded', document });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
};

export const updateUserDocumentStatus = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ message: 'Document ID is required' });
    }

    console.log(`[AdminUsers] Updating document ${documentId} to status: ${status}`);

    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    console.log(`[AdminUsers] Attempting status update for ${documentId} to ${status}`);

    // Update the status using updateMany to be more resilient
    const updateResult = await prisma.userDocument.updateMany({
      where: { id: documentId },
      data: { status: status }
    });

    if (updateResult.count === 0) {
      console.warn(`[AdminUsers] No document found to update with ID: ${documentId}`);
      return res.status(404).json({ message: 'Document not found' });
    }

    // Fetch the updated document to return it
    const document = await prisma.userDocument.findUnique({
      where: { id: documentId }
    });

    console.log(`[AdminUsers] Successfully updated document ${documentId}`);
    res.json({ message: 'Document status updated', document });
  } catch (error) {
    console.error('[AdminUsers] Update Document Status CRITICAL Error:', error);
    res.status(500).json({ 
      message: 'Error updating document status', 
      error: error.message,
      stack: error.stack
    });
  }
};

// Shifts Management
export const getShifts = async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { tenantId: req.user.tenantId }
    });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shifts', error: error.message });
  }
};

export const createShift = async (req, res) => {
  try {
    const { name, startTime, endTime } = req.body;
    const shift = await prisma.shift.create({
      data: {
        name,
        startTime,
        endTime,
        tenantId: req.user.tenantId
      }
    });
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ message: 'Error creating shift', error: error.message });
  }
};

// Deactivate/delete user
export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // --- NUCLEAR PERMANENT DELETION ---
    // We must manually delete all linked records in correct order to safely bypass all constraints.
    // Increased timeout for deep archival cleanup.

    await prisma.$transaction(async (tx) => {
      // Verify user belongs to tenant
      const user = await tx.user.findUnique({ where: { id, tenantId: req.user.tenantId } });
      if (!user) throw new Error('User not found in your tenant');

      // 0. Unlink from restrictive parent-like relations
      await tx.store.updateMany({
        where: { creatorId: id },
        data: { creatorId: null }
      });

      // 1. Inventory & Refill Cleanup
      const userCarts = await tx.cart.findMany({ where: { userId: id }, select: { id: true } });
      if (userCarts.length > 0) {
        await tx.cartItem.deleteMany({ where: { cartId: { in: userCarts.map(c => c.id) } } });
      }
      await tx.cart.deleteMany({ where: { userId: id } });
      
      await tx.refillItem.deleteMany({ where: { refillRequest: { userId: id } } });
      await tx.refillRequest.deleteMany({ where: { userId: id } });
      await tx.refillRequest.updateMany({ where: { approvedById: id }, data: { approvedById: null } });

      // 2. Financial & Sales Purge
      await tx.orderReturn.deleteMany({ where: { OR: [{ order: { userId: id } }, { returnedById: id }] } });
      await tx.orderItem.deleteMany({ where: { order: { userId: id } } });
      await tx.payment.deleteMany({ where: { order: { userId: id } } });
      await tx.order.deleteMany({ where: { userId: id } });
      
      await tx.openingCash.deleteMany({ where: { userId: id } });
      await tx.closingCash.deleteMany({ where: { userId: id } });
      await tx.cashTransfer.deleteMany({ where: { userId: id } });
      await tx.dailyCashSummary.deleteMany({ where: { userId: id } });
      await tx.bankDeposit.deleteMany({ where: { adminId: id } });
      await tx.safeTransaction.deleteMany({ where: { userId: id } });
      await tx.storeDeposit.deleteMany({ where: { userId: id } });

      // 3. Operational Logs & Performance
      await tx.shiftLog.deleteMany({ where: { userId: id } });
      await tx.attendance.deleteMany({ where: { userId: id } });
      await tx.vgeDailyPerformance.deleteMany({ where: { userId: id } });
      await tx.vgeMonthlySummary.deleteMany({ where: { userId: id } });
      await tx.routeAssignment.deleteMany({ where: { userId: id } });
      await tx.locationCheckIn.deleteMany({ where: { userId: id } });
      await tx.villageActivity.deleteMany({ where: { userId: id } });
      await tx.locationLog.deleteMany({ where: { userId: id } });
      await tx.stockTransaction.deleteMany({ where: { userId: id } });

      // 4. Damage & Deductions
      await tx.damageDeduction.deleteMany({ where: { OR: [{ userId: id }, { appliedById: id }] } });
      await tx.damageEntry.deleteMany({ where: { OR: [{ reportedById: id }, { reviewedById: id }] } });

      // 5. Notifications & HR
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.lateEntry.deleteMany({ where: { userId: id } });
      await tx.lateEntryException.deleteMany({ where: { OR: [{ userId: id }, { approvedById: id }] } });
      await tx.leaveBalance.deleteMany({ where: { userId: id } });

      // 6. Assets Management
      await tx.assetAssignment.deleteMany({ where: { userId: id } });
      await tx.assetIssue.deleteMany({ where: { userId: id } });
      await tx.assetRequest.deleteMany({ where: { userId: id } });

      // 7. Store Operational State
      await tx.storeCashRegister.updateMany({ where: { openedById: id }, data: { openedById: null } });
      await tx.storeCashRegister.updateMany({ where: { closedById: id }, data: { closedById: null } });

      // 8. Detailed Operational Logs
      await tx.stockAudit.deleteMany({ where: { userId: id } });
      await tx.expense.deleteMany({ where: { userId: id } });
      await tx.activityLog.deleteMany({ where: { OR: [{ userId: id }, { targetUserId: id }] } });

      // 9. Final Purge
      await tx.user.delete({ where: { id } });

      logActivity({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        action: 'USER_DELETED',
        details: `Permanently deleted user: ${user.name} and all associated history`,
        metadata: { deletedUserId: id }
      });
    }, {
      timeout: 30000 // Increase timeout to 30s for deep cleanup
    });
    
    res.json({ message: 'User and all history permanently deleted.' });
  } catch (error) {
    console.error('DELETION FAILED:', error);
    res.status(500).json({ message: 'Error removing user permanently', error: error.message });
  }
};
