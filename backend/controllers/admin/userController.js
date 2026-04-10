import prisma from '../../utils/prisma.js';
import bcrypt from 'bcryptjs';

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { assignedVehicle: true }
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
    const { name, email, password, mobile, role, assignedVehicleId, dailyTarget, vgeType } = req.body;

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

    const user = await prisma.user.create({
      data: {
        name,
        email,
        mobile,
        password: hashedPassword,
        role: role || 'SALES_AGENT',
        vgeType: vgeType || 'EMPLOYEE',
        assignedVehicle: assignedVehicleId ? { connect: { id: assignedVehicleId } } : undefined,
        dailyTarget: dailyTarget ? parseFloat(dailyTarget) : undefined
      }
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
    const { name, email, mobile, role, assignedVehicleId, status, dailyTarget, vgeType, password } = req.body;

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
      dailyTarget: dailyTarget !== undefined ? parseFloat(dailyTarget) : undefined
    };

    // Safely update password if provided
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
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

      // 3. Activity & Performance
      await tx.vgeDailyPerformance.deleteMany({ where: { userId: id } });
      await tx.vgeMonthlySummary.deleteMany({ where: { userId: id } });
      await tx.routeAssignment.deleteMany({ where: { userId: id } });

      // 4. Notifications
      await tx.notification.deleteMany({ where: { userId: id } });

      // 5. Unlink and Purge User
      await tx.user.update({
        where: { id },
        data: { assignedVehicleId: null }
      });

      await tx.user.delete({ where: { id } });
    }, {
      timeout: 20000 // Increase timeout to 20s for deep cleanup
    });
    
    res.json({ message: 'User and all history permanently deleted.' });
  } catch (error) {
    console.error('DELETION FAILED:', error);
    res.status(500).json({ message: 'Error removing user permanently', error: error.message });
  }
};
