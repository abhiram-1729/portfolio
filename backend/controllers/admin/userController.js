import prisma from '../../utils/prisma.js';
import bcrypt from 'bcryptjs';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';

// Get all users
export const getUsers = async (req, res) => {
  try {
    const { storeId, role } = req.query;
    const filter = { tenantId: req.user.tenantId };
    
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      filter.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      filter.storeId = req.user.storeId;
    }

    if (role) {
      filter.role = role;
    }

    const users = await prisma.user.findMany({
      where: filter,
      include: { 
        assignedVehicle: true, 
        store: true,
        customRole: true 
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
    const { name, email, password, mobile, role, assignedVehicleId, storeId, dailyTarget, vgeType, baseSalary, customRoleId } = req.body;

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
        dailyTarget: dailyTarget ? parseFloat(dailyTarget) : undefined,
        baseSalary: baseSalary ? parseFloat(baseSalary) : undefined,
        customRole: customRoleId ? { connect: { id: customRoleId } } : undefined
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
    const { name, email, mobile, role, assignedVehicleId, storeId, status, dailyTarget, vgeType, password, baseSalary, customRoleId } = req.body;

    const updateData = {
      name,
      email,
      mobile,
      role,
      status,
      vgeType,
      assignedVehicle: assignedVehicleId === null 
        ? { disconnect: true } 
        : (assignedVehicleId ? { connect: { id: assignedVehicleId } } : undefined),
      store: storeId === null 
        ? { disconnect: true } 
        : (storeId ? { connect: { id: storeId } } : undefined),
      dailyTarget: dailyTarget !== undefined ? parseFloat(dailyTarget) : undefined,
      baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : undefined,
      customRole: customRoleId === null 
        ? { disconnect: true } 
        : (customRoleId ? { connect: { id: customRoleId } } : undefined)
    };

    // Safely update password if provided
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id, tenantId: req.user.tenantId },
      data: updateData
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: updatedUser.storeId || req.user.storeId,
      action: 'USER_UPDATED',
      details: `Updated details for user: ${updatedUser.name}`,
      targetUserId: updatedUser.id,
      metadata: { status: updatedUser.status }
    });

    res.json({ message: 'User updated', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
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

      // 1. Inventory Cleanup
      const userCarts = await tx.cart.findMany({ where: { userId: id }, select: { id: true } });
      if (userCarts.length > 0) {
        await tx.cartItem.deleteMany({ where: { cartId: { in: userCarts.map(c => c.id) } } });
      }
      await tx.cart.deleteMany({ where: { userId: id } });

      // Clean Refill-related
      await tx.refillItem.deleteMany({ where: { refillRequest: { userId: id } } });
      await tx.refillRequest.deleteMany({ where: { userId: id } });

      // 2. Financial Purge (Large Data Block)
      await tx.orderItem.deleteMany({ where: { order: { userId: id } } });
      await tx.payment.deleteMany({ where: { order: { userId: id } } });
      await tx.order.deleteMany({ where: { userId: id } });
      
      await tx.openingCash.deleteMany({ where: { userId: id } });
      await tx.closingCash.deleteMany({ where: { userId: id } });

      // 3. Activity, Performance & Location
      await tx.vgeDailyPerformance.deleteMany({ where: { userId: id } });
      await tx.vgeMonthlySummary.deleteMany({ where: { userId: id } });
      await tx.routeAssignment.deleteMany({ where: { userId: id } });
      await tx.locationCheckIn.deleteMany({ where: { userId: id } });

      // 4. Notifications & Communication
      await tx.notification.deleteMany({ where: { userId: id } });

      // 5. Assets Management Purge
      await tx.assetAssignment.deleteMany({ where: { userId: id } });
      await tx.assetIssue.deleteMany({ where: { userId: id } });
      await tx.assetRequest.deleteMany({ where: { userId: id } });

      // 6. Detailed Operational Logs
      await tx.stockAudit.deleteMany({ where: { userId: id } });
      await tx.expense.deleteMany({ where: { userId: id } });
      await tx.cashTransfer.deleteMany({ where: { userId: id } });
      await tx.dailyCashSummary.deleteMany({ where: { userId: id } });

      // 7. Unlink and Purge User
      await tx.user.update({
        where: { id },
        data: { assignedVehicleId: null }
      });

      await tx.user.delete({ where: { id } });

      logActivity({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        action: 'USER_DELETED',
        details: `Permanently deleted user: ${user.name} and all associated history`,
        metadata: { deletedUserId: id }
      });
    }, {
      timeout: 20000 // Increase timeout to 20s for deep cleanup
    });
    
    res.json({ message: 'User and all history permanently deleted.' });
  } catch (error) {
    console.error('DELETION FAILED:', error);
    res.status(500).json({ message: 'Error removing user permanently', error: error.message });
  }
};
