import prisma from '../../utils/prisma.js';

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Active Vehicles
    const activeVehicles = await prisma.vehicle.count({ where: { status: true } });

    // 2. Active Users (assume non-consumer roles count or just total users)
    const activeUsers = await prisma.user.count({ where: { role: { not: 'CONSUMER' } } });

    // 3. Orders Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ordersToday = await prisma.order.count({
      where: {
        createdAt: { gte: today }
      }
    });

    // 4. Sales Today & Payment Splits
    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: 'CANCELLED' }
      },
      select: {
        totalAmount: true,
        paymentMode: true
      }
    });

    let totalSales = 0;
    const paymentSplits = { CASH: 0, UPI: 0, CARD: 0 };

    todayOrders.forEach(order => {
      totalSales += order.totalAmount;
      if (order.paymentMode) {
        paymentSplits[order.paymentMode] = (paymentSplits[order.paymentMode] || 0) + order.totalAmount;
      }
    });

    res.json({
      activeVehicles,
      activeUsers,
      ordersToday,
      totalSales,
      paymentSplits
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};
