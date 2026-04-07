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
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Create a new user (Agent/helper/supervisor)
export const createUser = async (req, res) => {
  try {
    const { name, email, password, mobile, role, assignedVehicleId, dailyTarget } = req.body;

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
        assignedVehicleId: assignedVehicleId || null,
        dailyTarget: dailyTarget ? parseFloat(dailyTarget) : undefined
      }
    });

    res.status(201).json({ message: 'User created', user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// Update user details
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, role, assignedVehicleId, status, dailyTarget } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        mobile,
        role,
        status,
        assignedVehicleId: assignedVehicleId !== undefined ? assignedVehicleId : undefined,
        dailyTarget: dailyTarget !== undefined ? parseFloat(dailyTarget) : undefined
      }
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

    // 1. Get all carts to delete the cart items first (since there's no cascade in schema)
    const userCarts = await prisma.cart.findMany({ where: { userId: id }, select: { id: true } });
    if (userCarts.length > 0) {
      await prisma.cartItem.deleteMany({
        where: { cartId: { in: userCarts.map(c => c.id) } }
      });
    }

    // 2. Clean up non-critical linked records first to allow deletion of test/new users
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.cart.deleteMany({ where: { userId: id } });
    await prisma.vgeDailyPerformance.deleteMany({ where: { userId: id } });
    await prisma.vgeMonthlySummary.deleteMany({ where: { userId: id } });
    await prisma.routeAssignment.deleteMany({ where: { userId: id } });
    
    // Clean up Refill requests (RefillItems cascade automatically)
    await prisma.refillRequest.deleteMany({ where: { userId: id } });

    // 3. Try deleting the user
    await prisma.user.delete({ where: { id } });
    
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    if (error.code === 'P2003') {
      // Prisma Foreign Key Constraint failed
      return res.status(400).json({ 
        message: 'Cannot delete staff member: They have existing financial or inventory records (Orders/Cash). Please suspend them instead.' 
      });
    }
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error removing user', error: error.message });
  }
};
