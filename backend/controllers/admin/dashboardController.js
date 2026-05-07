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

    // 1. Core Counts & Metrics
    const [
      activeVehicles, 
      activeUsers, 
      ordersToday, 
      todayOrders,
      totalProducts,
      totalVillages,
      totalRoutes,
      totalVendors,
      stockValueData,
      assetStats,
      expenseStats,
    ] = await Promise.all([
      prisma.vehicle.count({ where: vehicleFilter }),
      prisma.user.count({ where: userFilter }),
      prisma.order.count({ where: orderFilter }),
      prisma.order.findMany({
        where: orderFilter,
        select: { totalAmount: true, paymentMode: true, id: true, customerName: true, createdAt: true, displayId: true }
      }),
      prisma.product.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.village.count({ where: { tenantId } }),
      prisma.route.count({ where: { tenantId } }),
      prisma.vendor.count({ where: { tenantId } }),
      prisma.product.aggregate({
        _sum: { stock: true },
        where: { tenantId, status: 'ACTIVE' }
      }),
      prisma.asset.aggregate({
        _sum: { totalQuantity: true, estimatedCost: true },
        where: { tenantId }
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { 
          tenantId, 
          createdAt: { gte: today },
          status: 'APPROVED'
        }
      })
    ]);

    // For Fast/Slow moving products (last 30 days)
    // Fetch items and group manually to avoid Prisma groupBy limitations with relations
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentItems = await prisma.orderItem.findMany({
      where: {
        tenantId,
        order: {
          createdAt: { gte: thirtyDaysAgo },
          status: { not: 'CANCELLED' }
        }
      },
      select: {
        productId: true,
        quantity: true,
        product: {
          select: { name: true, image: true }
        }
      }
    });

    const volumeMap = {};
    recentItems.forEach(item => {
      if (!volumeMap[item.productId]) {
        volumeMap[item.productId] = { 
          productId: item.productId, 
          quantity: 0, 
          name: item.product?.name, 
          image: item.product?.image 
        };
      }
      volumeMap[item.productId].quantity += (item.quantity || 0);
    });

    const salesVolumeData = Object.values(volumeMap);

    // Calculate Stock Value (Estimated)
    const productsWithValue = await prisma.product.findMany({
      where: { tenantId, status: 'ACTIVE', stock: { gt: 0 } },
      select: { stock: true, landingPrice: true, price: true }
    });
    const totalStockValue = productsWithValue.reduce((acc, p) => acc + (p.stock * (p.landingPrice || p.price || 0)), 0);

    let totalSales = 0;
    const paymentSplits = { CASH: 0, UPI: 0, CARD: 0 };

    todayOrders.forEach(order => {
      totalSales += order.totalAmount;
      if (order.paymentMode) {
        paymentSplits[order.paymentMode] = (paymentSplits[order.paymentMode] || 0) + order.totalAmount;
      }
    });

    // Resolve Fast/Slow moving products
    const sortedProducts = salesVolumeData.sort((a, b) => b.quantity - a.quantity);
    const fastMoving = sortedProducts.slice(0, 5).map(p => ({
      name: p.name,
      image: p.image,
      quantity: p.quantity
    }));

    const slowMoving = sortedProducts.slice(-5).reverse().map(p => ({
      name: p.name,
      image: p.image,
      quantity: p.quantity
    }));

    res.json({
      activeVehicles,
      activeUsers,
      ordersToday,
      totalSales,
      paymentSplits,
      recentOrders: todayOrders.slice(0, 5),
      metrics: {
        totalProducts,
        totalVillages,
        totalRoutes,
        totalVendors,
        totalStockValue,
        totalStockQty: stockValueData._sum.stock || 0,
        assetQty: assetStats._sum.totalQuantity || 0,
        assetValue: assetStats._sum.estimatedCost || 0,
        todayExpenses: expenseStats._sum.amount || 0
      },
      fastMoving,
      slowMoving
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};
