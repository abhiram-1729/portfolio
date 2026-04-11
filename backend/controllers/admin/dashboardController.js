import prisma from '../../utils/prisma.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { storeId } = req.query;
    const tenantId = req.user.tenantId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build filters
    const baseFilter = { tenantId };
    const vehicleFilter = { tenantId, status: true };
    const userFilter = { tenantId, role: { not: 'CONSUMER' } };
    const orderFilter = { 
      tenantId, 
      createdAt: { gte: today },
      status: { not: 'CANCELLED' }
    };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      vehicleFilter.storeId = storeId;
      userFilter.storeId = storeId;
      orderFilter.storeId = storeId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      // Regular Admins are restricted. Tenant Owners see everything if no specific store is picked.
      vehicleFilter.storeId = req.user.storeId;
      userFilter.storeId = req.user.storeId;
      orderFilter.storeId = req.user.storeId;
    }

    const [activeVehicles, activeUsers, ordersToday, todayOrders] = await Promise.all([
      // 1. Active Vehicles
      prisma.vehicle.count({ where: vehicleFilter }),
      // 2. Active Users
      prisma.user.count({ where: userFilter }),
      // 3. Orders Today (Count)
      prisma.order.count({ where: orderFilter }),
      // 4. Sales Today & Payment Splits (Data)
      prisma.order.findMany({
        where: orderFilter,
        select: {
          totalAmount: true,
          paymentMode: true
        }
      })
    ]);

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
